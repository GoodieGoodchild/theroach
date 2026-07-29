'use client';

import { motion, useReducedMotion } from 'motion/react';
import { useEffect, useState } from 'react';
import { brand, waLink } from '@/lib/config';
import { useMounted } from '@/lib/useMounted';

/**
 * Two floating display windows facing each other across an invisible street.
 *
 * The signage and CTA are baked into the render, so "the shop turns on" is done
 * by LIGHTING THE PANEL rather than overlaying HTML neon on top of painted neon
 * — two glows stacked on the same letters looks like a mistake, not a feature.
 * Idle sits dim and desaturated; hover warms it; selecting brings it to full
 * brightness, blooms its colour, lifts it and rotates it ~13° toward the viewer.
 * Selecting one dims the other, so the street only ever has one shop open.
 */

type Side = 'left' | 'right';

const DOORS = {
  left: {
    id: 'left' as const,
    // Empty until the store exists. A dead `#` link is worse than an honest
    // "opening soon": it looks live, does nothing, and traps the page in a
    // selected state with the other door dimmed to near-invisible.
    href: brand.shopUrl,
    label: brand.shopUrl
      ? 'Enter the goods store — glass, grinders and papers'
      : 'The goods store is not open yet',
    caption: brand.shopUrl ? 'GLASS · GRINDERS · PAPERS' : 'OPENING SOON',
    tint: '124, 255, 178', // mint
    text: '#CFFFE4',
    img: '/img/shop-left',
    external: false,
  },
  right: {
    id: 'right' as const,
    href: waLink,
    label: 'Message the collective on WhatsApp',
    caption: 'MEMBERS · BY ARRANGEMENT',
    tint: '255, 143, 184', // rose
    text: '#FFD5E4',
    img: '/img/shop-right',
    external: true,
  },
};

function Window({
  door,
  state,
  onEnter,
  onLeave,
  onSelect,
}: {
  door: (typeof DOORS)[Side];
  state: 'idle' | 'hover' | 'open' | 'dimmed';
  onEnter: () => void;
  onLeave: () => void;
  onSelect: () => void;
}) {
  const reduce = useReducedMotion();
  const mounted = useMounted();
  const open = state === 'open';
  const dimmed = state === 'dimmed';
  const warm = state === 'hover' || open;
  const live = Boolean(door.href);

  // Rotate toward the centre of the street: the left window turns right, the
  // right window turns left. Positive rotateY swings the left edge back.
  const turn = door.id === 'left' ? 13 : -13;

  // A door with no destination is not a link. Rendering it as one would promise
  // something that does not exist, and screen readers would announce it as a
  // link to nowhere.
  const Tag = live ? motion.a : motion.div;

  return (
    <Tag
      {...(live
        ? {
            href: door.href,
            target: door.external ? '_blank' : undefined,
            rel: door.external ? 'noopener noreferrer' : undefined,
            onClick: onSelect,
            tabIndex: 0,
          }
        : { 'aria-disabled': true })}
      onFocus={onEnter}
      onBlur={onLeave}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      aria-label={door.label}
      className={`group relative block w-full max-w-[560px] outline-none ${live ? '' : 'cursor-default'}`}
      style={{ transformStyle: 'preserve-3d' }}
      animate={
        reduce || !mounted
          ? {}
          : {
              rotateY: open ? turn : 0,
              y: open ? -14 : 0,
              scale: open ? 1.02 : dimmed ? 0.98 : 1,
              opacity: dimmed ? 0.32 : 1,
            }
      }
      transition={{ duration: 0.9, ease: [0.2, 0.7, 0.2, 1] }}
    >
      <div
        className="relative overflow-hidden"
        style={{
          // The render is the shop. Everything else on this page is black, so
          // the frame reads as floating with no building around it.
          boxShadow: warm
            ? `0 30px 90px rgba(0,0,0,.9), 0 0 70px rgba(${door.tint},.22), inset 0 0 0 1px rgba(${door.tint},.35)`
            : `0 20px 60px rgba(0,0,0,.8), inset 0 0 0 1px rgba(${door.tint},.12)`,
          transition: 'box-shadow .7s ease',
        }}
      >
        <picture>
          <source
            type="image/webp"
            srcSet={`${door.img}-640.webp 640w, ${door.img}-768.webp 768w`}
            sizes="(min-width: 900px) 46vw, 92vw"
          />
          <img
            src={`${door.img}-768.webp`}
            alt=""
            width={768}
            height={1024}
            className="block h-auto w-full select-none"
            draggable={false}
            style={{
              // The lights coming on. Dim and desaturated when closed; full
              // brightness and a touch over-saturated when open.
              filter: open
                ? 'brightness(1.14) saturate(1.2) contrast(1.04)'
                : warm
                  ? 'brightness(0.92) saturate(1)'
                  : 'brightness(0.55) saturate(0.65)',
              transition: 'filter .8s ease',
            }}
          />
        </picture>

        {/* Interior spill — the colour the shop throws onto the street. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background: `radial-gradient(ellipse 70% 42% at 50% 34%, rgba(${door.tint},${open ? 0.2 : warm ? 0.1 : 0.03}), transparent 72%)`,
            transition: 'background .8s ease',
          }}
        />

        {/* Glass reflection sweeping across as it opens. */}
        {!reduce && (
          <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
            <div
              className="absolute -top-1/4 h-[150%] w-1/3"
              style={{
                background:
                  'linear-gradient(90deg, rgba(255,255,255,0), rgba(255,255,255,.10), rgba(255,255,255,0))',
                transform: `translateX(${open ? '340%' : '-140%'}) skewX(-18deg)`,
                transition: 'transform 1.4s cubic-bezier(.2,.7,.2,1)',
              }}
            />
          </div>
        )}

        {/* Keyboard focus — the panel is the control, so ring the whole thing. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-0 transition-opacity group-focus-visible:opacity-100"
          style={{ boxShadow: `inset 0 0 0 2px rgba(${door.tint},.9)` }}
        />
      </div>

      <div
        className="mt-4 text-center font-display text-[10px] tracking-[0.34em] uppercase transition-colors duration-700"
        style={{ color: warm ? door.text : `rgba(${door.tint},.42)` }}
      >
        {door.caption}
      </div>
    </Tag>
  );
}

export default function ShopChoice() {
  const [hovered, setHovered] = useState<Side | null>(null);
  const [opened, setOpened] = useState<Side | null>(null);

  /**
   * Selecting a door dims the other to 32%. Both doors lead away from this
   * page, so that state is normally only visible during the hand-off — but if
   * navigation does not happen (blocked pop-up, a door with no destination
   * yet), the page would sit permanently half-dark with no way back. Escape or
   * a click on the street resets it.
   */
  useEffect(() => {
    if (!opened) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpened(null);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [opened]);

  const stateFor = (side: Side): 'idle' | 'hover' | 'open' | 'dimmed' => {
    if (opened === side) return 'open';
    if (opened && opened !== side) return 'dimmed';
    if (hovered === side) return 'hover';
    if (hovered && hovered !== side) return 'dimmed';
    return 'idle';
  };

  return (
    <div
      className="relative flex min-h-screen flex-col items-center px-5 py-14 sm:py-20"
      onClick={(e) => {
        // Click on the street (not a door) closes the open one.
        if (e.target === e.currentTarget) setOpened(null);
      }}
    >
      {/* Gold wash from above — the only light that is not coming from a shop. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[620px]"
        style={{
          background:
            'radial-gradient(ellipse 60% 100% at 50% 0%, rgba(201,162,39,.10), transparent 68%)',
        }}
      />

      <header className="relative flex flex-col items-center gap-5 text-center">
        <img
          src="/img/lockup-640.webp"
          alt="The Roach"
          width={640}
          height={640}
          className="w-[120px] select-none sm:w-[165px]"
          style={{ filter: 'drop-shadow(0 0 40px rgba(201,162,39,.25))' }}
          draggable={false}
        />
        <div className="flex items-center gap-4">
          <span className="h-px w-8 bg-gradient-to-r from-transparent to-gold/70 sm:w-20" />
          <span className="font-display text-[10px] tracking-[0.5em] text-gold uppercase">
            Two doors. One collective.
          </span>
          <span className="h-px w-8 bg-gradient-to-l from-transparent to-gold/70 sm:w-20" />
        </div>
        <p className="font-serif max-w-xl text-lg leading-relaxed font-light text-bone/60 italic sm:text-xl">
          Step off the street and choose your entrance — the goods counter, or the growers’ room.
        </p>
      </header>

      {/* The street. Perspective lives on the container so both windows share a
          vanishing point and genuinely face each other. */}
      <div
        className="relative mt-12 flex w-full max-w-[1280px] flex-col items-center justify-center gap-10 sm:mt-16 lg:flex-row lg:items-start lg:gap-6"
        style={{ perspective: 1800 }}
        onMouseLeave={() => setHovered(null)}
      >
        <Window
          door={DOORS.left}
          state={stateFor('left')}
          onEnter={() => setHovered('left')}
          onLeave={() => setHovered(null)}
          onSelect={() => setOpened('left')}
        />

        <div
          aria-hidden
          className="hidden flex-col items-center gap-5 self-stretch py-16 lg:flex"
        >
          <span className="w-px flex-1 bg-gradient-to-b from-transparent to-gold/45" />
          <span
            className="font-serif text-base tracking-[0.24em] text-gold/85 italic"
            style={{ writingMode: 'vertical-rl' }}
          >
            choose
          </span>
          <span className="w-px flex-1 bg-gradient-to-t from-transparent to-gold/45" />
        </div>

        <Window
          door={DOORS.right}
          state={stateFor('right')}
          onEnter={() => setHovered('right')}
          onLeave={() => setHovered(null)}
          onSelect={() => setOpened('right')}
        />
      </div>

      <footer className="relative mt-16 flex w-full max-w-[1280px] flex-col gap-4 border-t hairline pt-7 sm:flex-row sm:items-center sm:justify-between">
        <span className="font-display text-[10px] tracking-[0.34em] text-bone/40 uppercase">
          {brand.name} · {brand.strapline}
        </span>
        {/* Same disclaimer as the rest of the site — the position has to be
            identical everywhere, including here. */}
        <span className="font-serif max-w-xl text-sm leading-relaxed text-bone/45 italic">
          A private members’ collective, strictly {brand.minimumAge}+. Nothing on this page is an
          offer of sale.
        </span>
      </footer>
    </div>
  );
}
