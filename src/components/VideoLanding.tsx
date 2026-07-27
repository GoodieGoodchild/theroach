'use client';

import { motion, useReducedMotion } from 'motion/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { brand } from '@/lib/config';
import SeamlessVideo from './SeamlessVideo';

/**
 * How long the film holds if the visitor does nothing. It runs 7.417s and loops
 * seamlessly, so this is four passes. Any deliberate gesture — click, tap,
 * scroll, swipe, or a key — enters immediately.
 */
const AUTO_MS = 30000;

/**
 * The gate: the client's burning-joint film, with the wordmark composited beneath
 * it so the two together read as the full lockup — except the joint is alight.
 *
 * GEOMETRY (measured from the actual frames, not guessed):
 *   the source is a 1440² square; the burning joint + R occupy y 33–82% and
 *   x 35–71%; below y 83% the frame is pure black. The wordmark therefore sits
 *   at y 84.5%, clearing the ember. Because it's square footage on a wide screen
 *   we `object-contain`, never `cover` — cover crops top and bottom, taking the
 *   wordmark band and the smoke with it. The letterbox is black on a black page,
 *   so it is invisible.
 */
export default function VideoLanding({ onDone }: { onDone: () => void }) {
  const reduce = useReducedMotion();
  const firedRef = useRef(false);
  const [stalled, setStalled] = useState(false);

  // Hand off immediately and let AnimatePresence play the departure, so the deck
  // is already there behind the dissolve. The ref guard makes a double gesture
  // (or a tap racing the auto-advance) a no-op.
  const leave = useCallback(() => {
    if (firedRef.current) return;
    firedRef.current = true;
    onDone();
  }, [onDone]);

  useEffect(() => {
    const t = setTimeout(leave, AUTO_MS);
    return () => clearTimeout(t);
  }, [leave]);

  /**
   * Enter on ANY deliberate gesture, not just a click: scrolling or swiping past
   * the landing is the most natural instinct, and on a phone it's the only one
   * people try. Without this the wheel fell through to the deck underneath and
   * silently advanced it behind the still-visible gate.
   */
  useEffect(() => {
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey) return; // pinch-zoom, not intent
      if (Math.abs(e.deltaY) < 8) return;
      e.preventDefault();
      leave();
    };
    let ty: number | null = null;
    const onTouchStart = (e: TouchEvent) => {
      ty = e.touches[0]?.clientY ?? null;
    };
    const onTouchMove = (e: TouchEvent) => {
      if (ty === null) return;
      if (Math.abs(ty - (e.touches[0]?.clientY ?? 0)) < 30) return;
      e.preventDefault();
      leave();
    };
    const onKey = (e: KeyboardEvent) => {
      if (['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', ' ', 'Enter', 'Escape'].includes(e.key)) {
        e.preventDefault();
        leave();
      }
    };

    window.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('keydown', onKey);
    };
  }, [leave]);

  // Playback, autoplay retries and the gapless loop all live in SeamlessVideo.

  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-5 overflow-hidden bg-ink py-4"
      exit={{ opacity: 0, transition: { duration: 0.65, ease: [0.7, 0, 0.3, 1] } }}
    >
      <button
        type="button"
        onClick={leave}
        aria-label={`Enter The Roach — I confirm I am ${brand.minimumAge} or older`}
        className="absolute inset-0 z-20 cursor-pointer bg-transparent outline-none focus-visible:ring-2 focus-visible:ring-gold/70 focus-visible:ring-inset"
      />

      {/* The square stage. `.stage` in globals.css owns the sizing (78svh, and
          60svh under 500px tall). The hint below is a flex SIBLING, not an
          absolute overlay, so the browser guarantees they never collide.

          Exit flies THROUGH the mark rather than spinning it: it scales up past
          the viewport while dissolving, so entering reads as moving into the
          next page. */}
      <motion.div
        className="stage relative shrink-0"
        exit={
          reduce
            ? { opacity: 0 }
            : { scale: 1.85, opacity: 0, transition: { duration: 1.05, ease: [0.5, 0, 0.35, 1] } }
        }
      >
        {/* 720², H.264 Main L3.1, no B-frames, no audio, faststart — see
            scripts/prepare-video.mjs. The source was 1440² High L4.0 with an
            audio track at 4.3MB, which desktop played happily and phones did
            not. Trimmed to 7.417s, the frame where the spin returns to its
            start (seam measured 0.94/255).

            Looping is handled by SeamlessVideo (two elements taking turns), NOT
            the native `loop` attribute — `loop` seeks back to 0, and that seek
            is the visible pause. */}
        <SeamlessVideo
          src="/video/roach.mp4"
          poster="/img/roach-poster.webp"
          paused={!!reduce}
          onStalledChange={setStalled}
        />

        {/* Wordmark — sits in the dead black band beneath the ember, so together
            with the film it reads as the full lockup with the joint alight.
            Deliberately NOT animated in: a Motion entrance serialises
            `opacity:0` into the static HTML, which is why it went missing once
            already. It is simply present. `.wm` in globals.css owns placement. */}
        <img
          src="/img/wordmark-1100.webp"
          alt="The Roach — Crafted for the Collective"
          width={1100}
          height={250}
          className="wm absolute z-10 select-none"
          draggable={false}
          fetchPriority="high"
        />
      </motion.div>

      {/* Hint + the visible 18+ declaration. The age confirmation has to be
          legible, not merely announced to screen readers via the aria-label. */}
      <motion.div
        className="pointer-events-none z-30 flex shrink-0 flex-col items-center gap-2 px-6 text-center"
        exit={{ opacity: 0, transition: { duration: 0.3 } }}
      >
        <span className="hint-pulse font-display text-[10px] font-light tracking-[0.5em] text-gold/80 uppercase">
          {stalled ? 'Tap to begin' : 'Tap or scroll to enter'}
        </span>
        <span className="font-display text-[10px] leading-relaxed tracking-[0.3em] text-bone/65 uppercase">
          By entering you confirm you are {brand.minimumAge}+ · {brand.town}
        </span>
      </motion.div>

      {!reduce && (
        <div aria-hidden className="absolute inset-x-0 bottom-0 z-30 h-px bg-gold/10">
          <motion.div
            className="h-full origin-left bg-gold/40"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: AUTO_MS / 1000, ease: 'linear' }}
          />
        </div>
      )}
    </motion.div>
  );
}
