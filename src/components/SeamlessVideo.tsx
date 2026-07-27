'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * A genuinely gapless looping video.
 *
 * WHY NOT JUST `loop`. The native attribute is "on ended, seek to 0, resume".
 * That seek costs the decoder a beat, so even with a frame-perfect seam you get
 * a distinct hitch: the last frame is held, then playback restarts.
 *
 * HOW THIS WORKS. Two elements share the source and take turns. One plays while
 * the other sits paused on frame 0 — decoded, painted, invisible. Just before
 * the visible one reaches its end we start the primed one and flip visibility in
 * the same tick. No seek, so no stall. The outgoing element is then parked and
 * rewound, ready for its next turn.
 *
 * DESIGN NOTE — one actor, one clock. An earlier version drove the handoff from
 * requestVideoFrameCallback, requestAnimationFrame, `timeupdate` AND `ended` at
 * once, on the theory that redundancy was safety. It was the opposite: on the
 * deployed build those actors interleaved, fired each other's swaps early, and
 * the handoff drifted a little further out of position every cycle (5.30s, then
 * 5.68s, then 4.99s against a 5.75s clip). Frame callbacks were also unreliable
 * in their own right — rVFC goes dormant when its element pauses, and rAF is
 * throttled to nothing in a backgrounded page.
 *
 * So: exactly ONE scheduled timer, computed from the live element's own clock,
 * re-armed only by the swap it triggers. `ended` is a failsafe that never swaps
 * anything it does not own. Everything else was removed.
 */
export default function SeamlessVideo({
  src,
  poster,
  className = '',
  paused = false,
  onStalledChange,
}: {
  src: string;
  poster?: string;
  className?: string;
  /** True to hold on the poster (e.g. prefers-reduced-motion). */
  paused?: boolean;
  onStalledChange?: (stalled: boolean) => void;
}) {
  const aRef = useRef<HTMLVideoElement>(null);
  const bRef = useRef<HTMLVideoElement>(null);
  const [live, setLive] = useState<0 | 1>(0);

  /** Synchronous mirror of `live` — React state lags a render behind the swap. */
  const liveRef = useRef<0 | 1>(0);
  const timerRef = useRef(0);
  const busyRef = useRef(false);

  /** Hand over this long before the end. ~3 frames at 24fps. */
  const LEAD = 0.13;

  const els = useCallback((): [HTMLVideoElement, HTMLVideoElement] | null => {
    const a = aRef.current;
    const b = bRef.current;
    return a && b ? [a, b] : null;
  }, []);

  /** iOS gates inline autoplay on the muted ATTRIBUTE; React only sets the property. */
  const forceMuted = (v: HTMLVideoElement) => {
    v.muted = true;
    if (!v.hasAttribute('muted')) v.setAttribute('muted', '');
  };

  const clearTimer = () => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = 0;
  };

  /** Arm the single handoff timer from the live element's own clock. */
  const arm = useCallback(() => {
    clearTimer();
    const pair = els();
    if (!pair || paused) return;
    const v = pair[liveRef.current];
    if (!v.duration || Number.isNaN(v.duration) || v.paused) return;

    const secs = v.duration - LEAD - v.currentTime;
    const ms = Math.max(0, (secs * 1000) / (v.playbackRate || 1));
    timerRef.current = window.setTimeout(() => doSwap(), ms);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [els, paused]);

  const doSwap = useCallback(() => {
    if (busyRef.current) return;
    const pair = els();
    if (!pair) return;

    busyRef.current = true;
    clearTimer();

    const curIdx = liveRef.current;
    const nextIdx: 0 | 1 = curIdx === 0 ? 1 : 0;
    const cur = pair[curIdx];
    const next = pair[nextIdx];

    // `next` already sits decoded on frame 0, so flipping visibility shows the
    // right frame immediately even if play() takes a moment to spin up.
    forceMuted(next);
    next.currentTime = 0;
    void next.play().catch(() => {});

    liveRef.current = nextIdx; // synchronous: everything else reads this
    setLive(nextIdx);

    // Park the outgoing element. Short enough that it never reaches its own end
    // (a stray `ended` used to trigger a second, premature swap), long enough
    // that the rewind can never touch a frame still on screen.
    window.setTimeout(() => {
      cur.pause();
      cur.currentTime = 0;
      busyRef.current = false;
      arm(); // re-arm from the new live element's clock
    }, 90);
  }, [els, arm]);

  // Keep `arm` reachable from doSwap without a circular dep at definition time.
  const armRef = useRef(arm);
  armRef.current = arm;

  /** Start playback, retry while refused, and keep exactly one timer armed. */
  useEffect(() => {
    const pair = els();
    if (!pair) return;
    const [a, b] = pair;

    if (paused) {
      clearTimer();
      a.pause();
      b.pause();
      return;
    }

    let cancelled = false;

    const kick = () => {
      if (cancelled || busyRef.current) return;
      const v = pair[liveRef.current];
      forceMuted(v);
      if (!v.paused) {
        onStalledChange?.(false);
        if (!timerRef.current) armRef.current();
        return;
      }
      // Left parked at the end (tab backgrounded mid-loop)? Rewind first.
      if (v.duration && v.currentTime >= v.duration - 0.05) v.currentTime = 0;
      v.play()
        .then(() => {
          if (cancelled) return;
          onStalledChange?.(false);
          armRef.current();
        })
        .catch(() => !cancelled && onStalledChange?.(v.paused));
    };

    const onPlaying = (e: Event) => {
      if (e.currentTarget === pair[liveRef.current]) armRef.current();
    };
    /** Buffering moved the clock — recompute. Never swaps by itself. */
    const onWaiting = (e: Event) => {
      if (e.currentTarget === pair[liveRef.current]) armRef.current();
    };
    /**
     * Failsafe only. It MUST check ownership: the outgoing element keeps running
     * briefly after a handoff, and an unguarded listener let its `ended` fire a
     * second swap that yanked the visible element out early — which is what made
     * the deployed build drift.
     */
    const onEnded = (e: Event) => {
      const v = e.currentTarget as HTMLVideoElement;
      if (v === pair[liveRef.current]) doSwap();
      else {
        v.pause();
        v.currentTime = 0;
      }
    };
    const onVis = () => document.visibilityState === 'visible' && kick();

    for (const v of pair) {
      v.addEventListener('playing', onPlaying);
      v.addEventListener('waiting', onWaiting);
      v.addEventListener('ended', onEnded);
    }
    document.addEventListener('visibilitychange', onVis);

    kick();
    const retry = window.setInterval(kick, 1500);

    return () => {
      cancelled = true;
      clearInterval(retry);
      clearTimer();
      for (const v of pair) {
        v.removeEventListener('playing', onPlaying);
        v.removeEventListener('waiting', onWaiting);
        v.removeEventListener('ended', onEnded);
      }
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [els, paused, doSwap, onStalledChange]);

  const common = 'absolute inset-0 h-full w-full object-contain';

  return (
    <>
      <video
        ref={aRef}
        className={`${common} ${className}`}
        style={{ opacity: live === 0 ? 1 : 0 }}
        src={src}
        poster={poster}
        autoPlay
        muted
        playsInline
        preload="auto"
        aria-hidden
      />
      <video
        ref={bRef}
        className={`${common} ${className}`}
        style={{ opacity: live === 1 ? 1 : 0 }}
        src={src}
        poster={poster}
        muted
        playsInline
        preload="auto"
        aria-hidden
      />
    </>
  );
}
