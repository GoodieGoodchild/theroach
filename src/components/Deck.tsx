'use client';

import { motion, useReducedMotion } from 'motion/react';
import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Section deck. Scrolling doesn't move the page — it dissolves one section and
 * blooms the next out of the centre.
 *
 * PROGRESSIVE ENHANCEMENT (this is load-bearing, don't "simplify" it):
 * before mount we render every section in normal document flow, fully visible,
 * with no inline opacity. Only after mount does it become a fixed one-at-a-time
 * deck. An adversarial review caught the previous build shipping
 * `<main style="opacity:0;transform:translateY(90px)">` into the static HTML —
 * one failed chunk on shared hosting and the whole site was an invisible page
 * under an opaque overlay. Server output must always be readable on its own.
 */
export interface Section {
  id: string;
  node: React.ReactNode;
}

const COOLDOWN = 900; // ms — long enough that one trackpad flick = one section

export default function Deck({
  sections,
  enabled = true,
}: {
  sections: Section[];
  /** False while the landing gate is up — otherwise a scroll there would
      advance the deck invisibly behind it. */
  enabled?: boolean;
}) {
  const reduce = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  const [i, setI] = useState(0);
  const lock = useRef(0);
  const touchY = useRef<number | null>(null);
  // Mirrors `i` synchronously. The cooldown MUST be evaluated and armed in the
  // same tick as the event: a burst of wheel events all fire before React runs
  // any state updater, so guarding inside setI let four flicks jump three
  // sections. Reading and writing a ref closes that window.
  const iRef = useRef(0);

  useEffect(() => setMounted(true), []);

  // Arm the cooldown the instant the deck goes live, so the tail of the very
  // gesture that dismissed the landing doesn't also advance a section — one
  // swipe was entering the site AND skipping straight past the first chapter.
  useEffect(() => {
    if (enabled) lock.current = Date.now() + 700;
  }, [enabled]);

  const jump = useCallback(
    (next: number) => {
      if (next < 0 || next >= sections.length || next === iRef.current) return;
      iRef.current = next;
      setI(next);
    },
    [sections.length],
  );

  const go = useCallback(
    (delta: 1 | -1) => {
      const now = Date.now();
      if (now < lock.current) return;
      const next = iRef.current + delta;
      if (next < 0 || next >= sections.length) return;
      lock.current = now + COOLDOWN;
      jump(next);
    },
    [jump, sections.length],
  );

  // Wheel / touch / keyboard — only once we're in deck mode AND the gate is gone.
  useEffect(() => {
    if (!mounted || !enabled) return;

    const onWheel = (e: WheelEvent) => {
      // Let genuine pinch-zoom through; only claim vertical intent.
      if (e.ctrlKey) return;
      if (Math.abs(e.deltaY) < 8) return;
      e.preventDefault();
      go(e.deltaY > 0 ? 1 : -1);
    };
    const onTouchStart = (e: TouchEvent) => {
      touchY.current = e.touches[0]?.clientY ?? null;
    };
    const onTouchMove = (e: TouchEvent) => {
      if (touchY.current === null) return;
      const dy = touchY.current - (e.touches[0]?.clientY ?? 0);
      if (Math.abs(dy) < 45) return;
      e.preventDefault();
      go(dy > 0 ? 1 : -1);
      touchY.current = null;
    };
    const onKey = (e: KeyboardEvent) => {
      const k = e.key;
      if (['ArrowDown', 'PageDown', ' '].includes(k)) {
        e.preventDefault();
        go(1);
      } else if (['ArrowUp', 'PageUp'].includes(k)) {
        e.preventDefault();
        go(-1);
      } else if (k === 'Home') {
        e.preventDefault();
        jump(0);
      } else if (k === 'End') {
        e.preventDefault();
        jump(sections.length - 1);
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
  }, [mounted, enabled, go, jump, sections.length]);

  // Deck mode owns the viewport; nothing should scroll behind it.
  useEffect(() => {
    if (!mounted) return;
    const html = document.documentElement;
    const prev = html.style.overflow;
    html.style.overflow = 'hidden';
    return () => {
      html.style.overflow = prev;
    };
  }, [mounted]);

  // ── Pre-hydration / no-JS: plain, readable, scrollable document ──
  if (!mounted) {
    return (
      <div>
        {sections.map((s) => (
          <section key={s.id} id={s.id} className="flex min-h-screen items-center justify-center px-6 py-24">
            <div className="w-full max-w-3xl">{s.node}</div>
          </section>
        ))}
      </div>
    );
  }

  const last = sections.length - 1;

  return (
    <div className="fixed inset-0 overflow-hidden">
      {/* Every section stays MOUNTED and is cross-faded, rather than swapped via
          AnimatePresence. Two reasons, both load-bearing:
          1. SEO — this domain exists to recover an old ranking, and Googlebot
             renders JS. Unmounting would leave a rendering crawler seeing one
             sixth of the copy.
          2. Robustness — nothing can pile up or strand mid-exit.
          Inactive sections are inert: not focusable, not hit-testable. */}
      {sections.map((s, n) => {
        const active = n === i;
        return (
          <motion.section
            key={s.id}
            id={s.id}
            className="absolute inset-0 flex items-center justify-center px-6"
            initial={false}
            animate={
              reduce
                ? { opacity: active ? 1 : 0 }
                : {
                    opacity: active ? 1 : 0,
                    scale: active ? 1 : n < i ? 1.14 : 0.86,
                    filter: active ? 'blur(0px)' : 'blur(14px)',
                  }
            }
            transition={{ duration: reduce ? 0.2 : 0.85, ease: [0.16, 1, 0.3, 1] }}
            style={{ pointerEvents: active ? 'auto' : 'none' }}
            aria-hidden={!active}
            {...(!active && { inert: '' as unknown as boolean })}
          >
            <div className="w-full max-w-3xl">{s.node}</div>
          </motion.section>
        );
      })}

      {/* Position rail — affordance + direct access. */}
      <nav
        aria-label="Sections"
        className="absolute right-5 top-1/2 z-30 flex -translate-y-1/2 flex-col gap-3 sm:right-8"
      >
        {sections.map((s, n) => (
          <button
            key={s.id}
            type="button"
            onClick={() => jump(n)}
            aria-label={`Go to section ${n + 1}`}
            aria-current={n === i ? 'true' : undefined}
            className={`h-2 w-2 cursor-pointer rounded-full transition-all duration-500 outline-none focus-visible:ring-2 focus-visible:ring-gold/70 focus-visible:ring-offset-2 focus-visible:ring-offset-ink ${
              n === i ? 'scale-125 bg-gold' : 'bg-bone/25 hover:bg-bone/50'
            }`}
          />
        ))}
      </nav>

      {/* Advance hint — only while there's somewhere to go. */}
      {i < last && (
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-6 z-30 flex flex-col items-center gap-2"
        >
          <span className="font-display text-[9px] tracking-[0.45em] text-bone/45 uppercase">
            Scroll
          </span>
          <motion.span
            className="block h-6 w-px bg-gradient-to-b from-gold/70 to-transparent"
            animate={reduce ? {} : { opacity: [0.25, 1, 0.25], y: [0, 5, 0] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
          />
        </div>
      )}
    </div>
  );
}
