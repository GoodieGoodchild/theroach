'use client';

import { motion, useReducedMotion } from 'motion/react';
import { useEffect, useState } from 'react';
import { brand, waLink } from '@/lib/config';
import { useMounted } from '@/lib/useMounted';

/**
 * Two floating display windows facing each other across an invisible street.
 *
 * Each door is three stacked objects — SVG neon sign, glass window, neon CTA —
 * and ONE image per window. Every lighting state is CSS brightness/contrast on
 * that single image (the client's explicit instruction: filters do the glow,
 * never a lit/unlit image swap). The signs are SVG so they can strike, breathe
 * and swing independently of the window they hang over.
 *
 * Selecting a door rotates the whole assembly ~13° toward the viewer while the
 * sign counter-rotates to face the camera dead-on and grows — the "looking at
 * you now" move. The other door dims. Escape or a click on the street resets
 * (both doors navigate away, but if navigation doesn't happen — blocked pop-up,
 * a door with no destination yet — the page must never trap half-dark).
 */

type Side = 'left' | 'right';
type DoorState = 'idle' | 'hover' | 'open' | 'dimmed';

const DOORS = {
  left: {
    id: 'left' as const,
    href: brand.shopUrl,
    label: brand.shopUrl
      ? 'Enter the goods store — glass, grinders and papers'
      : 'The goods store is not open yet',
    cta: brand.shopUrl ? 'ENTER STORE' : 'OPENING SOON',
    caption: 'GLASS · GRINDERS · PAPERS',
    tint: '124, 255, 178', // mint
    text: '#CFFFE4',
    img: '/img/window-left',
    ratio: '744 / 786',
    external: false,
  },
  right: {
    id: 'right' as const,
    href: waLink,
    label: 'Message the collective on WhatsApp',
    cta: 'WHATSAPP FOR MORE',
    caption: 'MEMBERS · BY ARRANGEMENT',
    tint: '255, 143, 184', // rose
    text: '#FFD5E4',
    img: '/img/window-right',
    ratio: '752 / 740',
    external: true,
  },
};

/* ── The cannabis-leaf tube from the client's prepped mockup ── */
function LeafTube({ stroke }: { stroke: string }) {
  return (
    <g
      fill="none"
      stroke={stroke}
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 38V22" />
      <path d="M22 24c-4-2-9-7-10-13 5 1 9 5 10 9" />
      <path d="M22 24c4-2 9-7 10-13-5 1-9 5-10 9" />
      <path d="M22 20c-3-3-5-9-4-16 4 3 6 9 6 13" />
      <path d="M22 20c3-3 5-9 4-16-4 3-6 9-6 13" />
      <path d="M21 28c-4-1-9-2-13-6 4-1 10 0 13 3" />
      <path d="M23 28c4-1 9-2 13-6-4-1-10 0-13 3" />
    </g>
  );
}

/**
 * A neon sign is the same artwork painted three times: a wide soft glow, a
 * tight halo, and the crisp tube on top. Unlit, only the tube stays faintly
 * visible — exactly how dead neon looks in daylight.
 */
function NeonSign({
  side,
  lit,
}: {
  side: Side;
  lit: boolean;
}) {
  const mint = side === 'left';
  const tube = mint ? '#EAFFF3' : '#FFF0F5';
  const tint = mint ? '#7CFFB2' : '#FF8FB8';
  const fid = `neon-${side}`;

  const layers = [
    { id: `${fid}-wide`, blur: 7, fill: tint, opacity: lit ? 0.85 : 0.06 },
    { id: `${fid}-halo`, blur: 2.4, fill: tint, opacity: lit ? 0.9 : 0.1 },
  ];

  return (
    <svg
      viewBox="0 0 400 132"
      className={`block w-full ${lit ? 'neon-strike neon-lit' : ''}`}
      style={{
        opacity: lit ? 1 : 0.4,
        transition: 'opacity .7s ease',
      }}
      aria-hidden
    >
      <defs>
        {layers.map((l) => (
          <filter key={l.id} id={l.id} x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation={l.blur} />
          </filter>
        ))}
      </defs>

      {[...layers, { id: '', blur: 0, fill: tube, opacity: 1 }].map((l, i) => (
        <g
          key={i}
          filter={l.id ? `url(#${l.id})` : undefined}
          opacity={l.opacity}
          style={{ transition: 'opacity .7s ease' }}
        >
          {mint ? (
            <>
              <g transform="translate(178, 2) scale(0.82)">
                <LeafTube stroke={l.fill} />
              </g>
              <text
                x="200"
                y="78"
                textAnchor="middle"
                fill={l.fill}
                style={{
                  font: '300 34px var(--font-display)',
                  letterSpacing: '0.16em',
                }}
              >
                HIGH SOCIETY
              </text>
              <line x1="76" y1="108" x2="150" y2="108" stroke={l.fill} strokeWidth="1.2" />
              <text
                x="200"
                y="113"
                textAnchor="middle"
                fill={l.fill}
                style={{
                  font: '300 13px var(--font-display)',
                  letterSpacing: '0.42em',
                }}
              >
                GOODS
              </text>
              <line x1="250" y1="108" x2="324" y2="108" stroke={l.fill} strokeWidth="1.2" />
            </>
          ) : (
            <>
              <text
                x="200"
                y="72"
                textAnchor="middle"
                fill={l.fill}
                style={{
                  font: 'italic 300 52px var(--font-serif)',
                  letterSpacing: '0.03em',
                }}
              >
                Bud &amp; Bloom
              </text>
              <line x1="66" y1="104" x2="140" y2="104" stroke={l.fill} strokeWidth="1.2" />
              <text
                x="200"
                y="109"
                textAnchor="middle"
                fill={l.fill}
                style={{
                  font: '300 13px var(--font-display)',
                  letterSpacing: '0.42em',
                }}
              >
                FLOWER SHOP
              </text>
              <line x1="260" y1="104" x2="334" y2="104" stroke={l.fill} strokeWidth="1.2" />
            </>
          )}
        </g>
      ))}
    </svg>
  );
}

function Window({
  door,
  state,
  onEnter,
  onLeave,
  onSelect,
}: {
  door: (typeof DOORS)[Side];
  state: DoorState;
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

  // The door turns toward the centre of the street; the sign counter-rotates by
  // the same angle when open, so it faces the camera dead-on while the window
  // stays turned. Nested preserve-3d makes the child rotation relative.
  const turn = door.id === 'left' ? 13 : -13;

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
      className={`group relative block w-full max-w-[520px] outline-none ${live ? '' : 'cursor-default'}`}
      style={{ transformStyle: 'preserve-3d' }}
      animate={
        reduce || !mounted
          ? {}
          : {
              rotateY: open ? turn : 0,
              y: open ? -12 : 0,
              scale: open ? 1.02 : dimmed ? 0.98 : 1,
              opacity: dimmed ? 0.3 : 1,
            }
      }
      transition={{ duration: 0.9, ease: [0.2, 0.7, 0.2, 1] }}
    >
      {/* ── The sign — swings independently of the window it hangs over ── */}
      <motion.div
        className="relative z-10 mx-auto w-[86%]"
        style={{ transformStyle: 'preserve-3d', transformOrigin: '50% 100%' }}
        animate={
          reduce || !mounted
            ? {}
            : open
              ? { rotateY: -turn, scale: 1.16, y: -6 }
              : warm
                ? { rotateY: 0, scale: 1.06, y: -2 }
                : { rotateY: door.id === 'left' ? -9 : 9, scale: 1, y: 0 }
        }
        transition={{ type: 'spring', stiffness: 170, damping: 19 }}
      >
        <NeonSign side={door.id} lit={warm} />
      </motion.div>

      {/* ── The glass window — one image, lit entirely by filters ── */}
      <div
        className="relative -mt-1 overflow-hidden"
        style={{
          aspectRatio: door.ratio,
          boxShadow: open
            ? `0 34px 100px rgba(0,0,0,.9), 0 0 90px rgba(${door.tint},.28), inset 0 0 0 1px rgba(${door.tint},.4)`
            : warm
              ? `0 30px 90px rgba(0,0,0,.9), 0 0 60px rgba(${door.tint},.18), inset 0 0 0 1px rgba(${door.tint},.3)`
              : `0 20px 60px rgba(0,0,0,.8), inset 0 0 0 1px rgba(${door.tint},.1)`,
          transition: 'box-shadow .7s ease',
        }}
      >
        <picture>
          <source
            type="image/webp"
            srcSet={`${door.img}-560.webp 560w, ${door.img}-744.webp 744w`}
            sizes="(min-width: 900px) 42vw, 88vw"
          />
          <img
            src={`${door.img}-744.webp`}
            alt=""
            className="block h-full w-full object-cover select-none"
            draggable={false}
            style={{
              // The lights coming on — same pixels, different electricity.
              filter: open
                ? 'brightness(1.24) saturate(1.32) contrast(1.05)'
                : warm
                  ? 'brightness(0.98) saturate(1.12)'
                  : dimmed
                    ? 'brightness(0.38) saturate(0.5)'
                    : 'brightness(0.52) saturate(0.62)',
              transition: 'filter .8s ease',
            }}
          />
        </picture>

        {/* Interior light spilling onto the street */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background: `radial-gradient(ellipse 70% 44% at 50% 30%, rgba(${door.tint},${open ? 0.16 : warm ? 0.08 : 0.02}), transparent 72%)`,
            transition: 'background .8s ease',
          }}
        />

        {/* Reflection sweeping the glass as it opens */}
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

        {/* Keyboard focus ring on the whole pane */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-0 transition-opacity group-focus-visible:opacity-100"
          style={{ boxShadow: `inset 0 0 0 2px rgba(${door.tint},.9)` }}
        />
      </div>

      {/* ── The CTA — a neon box below the glass ── */}
      <div
        className="mx-auto mt-5 flex w-[74%] items-center justify-center px-6 py-4 text-center font-display text-[12px] tracking-[0.38em] uppercase"
        style={{
          color: warm ? door.text : `rgba(${door.tint},.5)`,
          border: `1px solid rgba(${door.tint},${warm ? 0.75 : 0.28})`,
          background: warm ? `rgba(${door.tint},.07)` : 'transparent',
          boxShadow: warm
            ? `0 0 24px rgba(${door.tint},.35), inset 0 0 18px rgba(${door.tint},.12)`
            : 'none',
          textShadow: warm
            ? `0 0 4px rgba(255,255,255,.8), 0 0 16px rgba(${door.tint},.9)`
            : 'none',
          transition: 'all .6s ease',
        }}
      >
        {door.cta}
      </div>

      <div
        className="mt-3 text-center font-display text-[9px] tracking-[0.3em] uppercase transition-colors duration-700"
        style={{ color: warm ? `rgba(${door.tint},.75)` : `rgba(${door.tint},.32)` }}
      >
        {door.caption}
      </div>
    </Tag>
  );
}

export default function ShopChoice() {
  const [hovered, setHovered] = useState<Side | null>(null);
  const [opened, setOpened] = useState<Side | null>(null);

  useEffect(() => {
    if (!opened) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpened(null);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [opened]);

  const stateFor = (side: Side): DoorState => {
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
        if (e.target === e.currentTarget) setOpened(null);
      }}
    >
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

      {/* The street: shared perspective so the windows genuinely face each other */}
      <div
        className="relative mt-12 flex w-full max-w-[1240px] flex-col items-center justify-center gap-12 sm:mt-16 lg:flex-row lg:items-start lg:gap-5"
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

        <div aria-hidden className="hidden flex-col items-center gap-5 self-stretch py-16 lg:flex">
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

      <footer className="relative mt-16 flex w-full max-w-[1240px] flex-col gap-4 border-t hairline pt-7 sm:flex-row sm:items-center sm:justify-between">
        <span className="font-display text-[10px] tracking-[0.34em] text-bone/40 uppercase">
          {brand.name} · {brand.strapline}
        </span>
        <span className="font-serif max-w-xl text-sm leading-relaxed text-bone/45 italic">
          A private members’ collective, strictly {brand.minimumAge}+. Nothing on this page is an
          offer of sale.
        </span>
      </footer>
    </div>
  );
}
