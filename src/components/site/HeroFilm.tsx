'use client';

import { useReducedMotion } from 'motion/react';
import SeamlessVideo from '@/components/SeamlessVideo';
import { useMounted } from '@/lib/useMounted';

/**
 * The burning-joint film, as a picture on the page rather than a gate in front
 * of it. The full-screen version still opens /story/.
 *
 * Until mount this is just the poster: SeamlessVideo parks its second element
 * at `opacity:0`, and nothing hidden is allowed into the static HTML (see
 * useMounted). The poster is the film's own first frame, so the swap is
 * invisible.
 *
 * Geometry is the landing's: a square stage, `object-contain`, and the wordmark
 * in the dead band under the ember via `.wm`.
 */
export default function HeroFilm() {
  const mounted = useMounted();
  const reduce = useReducedMotion();

  return (
    <div className="relative mx-auto aspect-square w-full max-w-[280px] sm:max-w-[360px] lg:max-w-[480px]">
      {mounted ? (
        <SeamlessVideo src="/video/roach.mp4" poster="/img/roach-poster.webp" paused={!!reduce} />
      ) : (
        <img
          src="/img/roach-poster.webp"
          alt=""
          className="absolute inset-0 h-full w-full object-contain"
          draggable={false}
        />
      )}
      <img
        src="/img/wordmark-1100.webp"
        alt="The Roach — Crafted for the Collective"
        width={1100}
        height={250}
        className="wm absolute z-10 select-none"
        draggable={false}
      />
    </div>
  );
}
