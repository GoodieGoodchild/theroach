'use client';

import { useReducedMotion } from 'motion/react';
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

/**
 * Height of the glass itself. Everything else in a door column is sized from
 * this, so the sign, window and button always fit the viewport together — the
 * windows previously ate so much height that the button fell below the fold.
 */
const WINDOW_H = 'clamp(230px, 36vh, 360px)';

/**
 * Both columns take the width of the WIDER window, and each window is centred
 * inside its column at its own natural width. That keeps the signs and buttons
 * identically sized and perfectly aligned across the street, while the two
 * photographs keep their real proportions — sizing each column to its own
 * window made the wider one grow a taller sign and drop its button 14px.
 */
const COLUMN_ASPECT = 2124 / 2360;

/**
 * The sign, as a fraction of the column. Wider than the glass on purpose: a
 * shopfront sign overhangs its window, and there is ~128px of street between
 * the columns for it to hang into.
 */
const SIGN_SCALE = 1.16;

/** Column width and sign width, as CSS expressions — everything derives from
    the glass height so one clamp controls the whole layout. */
const COLUMN_W = `calc(${WINDOW_H} * ${COLUMN_ASPECT})`;
const SIGN_W = `calc(${COLUMN_W} * ${SIGN_SCALE})`;

/**
 * ── THE SIGN'S PERSPECTIVE ───────────────────────────────────────────────────
 *
 * Deliberately NOT the street's `perspective: 1800`. That value is a gentle,
 * architectural depth for two columns standing apart; the windows themselves
 * were photographed with a far shorter effective camera distance, and their
 * trapezoids are correspondingly steep. Solving angleFromClip() against 1800
 * asks for sin θ > 1 — there is literally no rotation that reproduces the
 * photograph at that depth. Giving the sign its own perspective equal to its
 * own width matches the renders and keeps the derived angles sane (~13–18°).
 *
 * This value and angleFromClip() are a matched pair: change one and the sign
 * stops sitting in the window's plane. See the derivation in angleFromClip.
 */
const SIGN_PERSPECTIVE = SIGN_W;

/**
 * Derive the plane's rotation from the window's own trapezoid — no eyeballing.
 *
 * The clip is `polygon(TL, TR, BR, BL)` in percentages. Under perspective, a
 * plane rotated about its vertical axis projects its near edge taller than its
 * far edge in exact proportion to their distances from the camera:
 *
 *     r = leftEdgeHeight / rightEdgeHeight = (P + (W/2)·sin θ) / (P − (W/2)·sin θ)
 *
 * Solving for the rotation, with k = (r − 1) / (r + 1):
 *
 *     sin θ = 2k · P / W
 *
 * and because we set the sign's perspective P equal to its width W above, that
 * collapses to sin θ = 2k. r > 1 means the LEFT edge is nearer, which is a
 * positive rotateY — so the sign leans exactly as its photograph does.
 */
/** The sign's box in WINDOW_H units — everything below is measured in these. */
const SIGN_W_U = COLUMN_ASPECT * SIGN_SCALE;
const SIGN_H_U = SIGN_W_U * (132 / 400); // the NeonSign viewBox aspect

/** The four clip corners as fractions: [TL, TR, BR, BL]. */
function clipCorners(clip: string): [number, number][] {
  const n = clip.match(/-?[\d.]+(?=%)/g)?.map(Number) ?? [];
  return [
    [n[0] / 100, n[1] / 100],
    [n[2] / 100, n[3] / 100],
    [n[4] / 100, n[5] / 100],
    [n[6] / 100, n[7] / 100],
  ];
}

/** Where two lines cross, each given by two points. */
function intersect(
  a: [number, number], b: [number, number],
  c: [number, number], d: [number, number],
): [number, number] {
  const den = (a[0] - b[0]) * (c[1] - d[1]) - (a[1] - b[1]) * (c[0] - d[0]);
  const p = a[0] * b[1] - a[1] * b[0];
  const q = c[0] * d[1] - c[1] * d[0];
  return [(p * (c[0] - d[0]) - (a[0] - b[0]) * q) / den, (p * (c[1] - d[1]) - (a[1] - b[1]) * q) / den];
}

/**
 * ── WHERE THE CAMERA STANDS ──────────────────────────────────────────────────
 *
 * The angle alone is not enough. Left at its default, `perspective-origin` puts
 * the camera at the centre of the SIGN, giving the sign a private horizon: its
 * horizontal lines stay symmetric about its own midline, so it foreshortens
 * left-to-right but never slopes, and it reads as a flat card floating in front
 * of the building instead of signage bolted to it.
 *
 * The window's real horizon is where its top and bottom edges converge — the
 * vanishing point of the wall. Extending those two clip edges until they cross
 * gives it exactly. We then re-express that point inside the sign's own box
 * (the sign is centred over the glass and sits flush above it) and place the
 * camera so the sign's horizontals converge on the same point.
 *
 * For a plane turned by θ under perspective P, the vanishing point of its
 * horizontals lands at (originX + P·cot θ, originY). So:
 *
 *     originY = the wall's vanishing point, in sign-box units
 *     originX = vanishingPointX − P·cot θ
 *
 * The near/far ratio is untouched by this — it depends only on depth, so the
 * foreshortening angleFromClip() derived still holds. Returned as percentages,
 * which are relative to the sign's own box and therefore survive every viewport.
 */
function cameraFromClip(clip: string, aspect: number, angleDeg: number) {
  const [tl, tr, br, bl] = clipCorners(clip);
  // Into WINDOW_H units: the window is `aspect` wide and 1 tall.
  const u = ([x, y]: [number, number]): [number, number] => [x * aspect, y];
  const vp = intersect(u(tl), u(tr), u(bl), u(br));

  // Re-express in the sign's box: centred on the glass, sitting directly above.
  const vpX = vp[0] + (SIGN_W_U - aspect) / 2;
  const vpY = vp[1] + SIGN_H_U;

  // P equals the sign's width — see SIGN_PERSPECTIVE.
  const originX = vpX - SIGN_W_U / Math.tan((angleDeg * Math.PI) / 180);
  return {
    x: +((100 * originX) / SIGN_W_U).toFixed(2),
    y: +((100 * vpY) / SIGN_H_U).toFixed(2),
  };
}

function angleFromClip(clip: string): number {
  const nums = clip.match(/-?[\d.]+(?=%)/g)?.map(Number) ?? [];
  if (nums.length < 8) return 0;
  const [, tlY, , trY, , brY, , blY] = nums; // TL TR BR BL, x/y interleaved
  const leftH = blY - tlY;
  const rightH = brY - trY;
  if (leftH <= 0 || rightH <= 0) return 0;

  const r = leftH / rightH;
  const k = (r - 1) / (r + 1);
  // Clamp: a ratio steeper than the perspective can express has no solution,
  // and asin(>1) is NaN. Degrade to edge-on rather than to a broken transform.
  const sin = Math.max(-1, Math.min(1, 2 * k));
  return (Math.asin(sin) * 180) / Math.PI;
}

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
    ratio: '715 / 980',
    aspect: 715 / 980,
    /**
     * Measured with probe-edges.mjs (the frame is dark-on-dark, so the quad
     * fitter cannot see it) and proven with the red-mask preview. Photographed
     * from its LEFT, so the near edge is longer: the window is 84% tall down
     * the left side and 72% down the right.
     */
    clip: 'polygon(0% 0.5%, 99.9% 12.8%, 99.9% 85%, 0% 99%)',
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
    ratio: '2124 / 2360',
    aspect: 2124 / 2360,
    /**
     * Fitted by scripts/fit-quad.mjs on the final crop (41/41 edge inliers) and
     * proven with the red-mask preview: the quad's top and bottom run PARALLEL
     * to the photographed frame (top falls 10.3% left-to-right, bottom rises
     * 9.7% — the render's own perspective, right edge nearer). The frame spans
     * the crop's full width, so the sides sit at 0/100%.
     */
    clip: 'polygon(0% 11.1%, 100% 0.8%, 100% 97.4%, 0% 87.7%)',
    external: true,
  },
};

/**
 * Each sign's idle rotation, read off its own window. Computed once at module
 * load — the clips are constants, so this never needs to run again, and the
 * angle can never drift out of step with a re-measured crop.
 *
 *   left  +17.9°  (left edge nearer — the H sits closer than the Y)
 *   right −13.3°  (right edge nearer — mirrored, as the render is)
 */
const SIGN_ANGLE: Record<Side, number> = {
  left: angleFromClip(DOORS.left.clip),
  right: angleFromClip(DOORS.right.clip),
};

/**
 * Camera position per sign, so each one converges on its own window's
 * vanishing point rather than on its own centre. See cameraFromClip.
 */
const SIGN_CAMERA: Record<Side, { x: number; y: number }> = {
  left: cameraFromClip(DOORS.left.clip, DOORS.left.aspect, SIGN_ANGLE.left),
  right: cameraFromClip(DOORS.right.clip, DOORS.right.aspect, SIGN_ANGLE.right),
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
              {/* Rules run out to SIGN_BOX_L, matching HIGH SOCIETY's measured
                  extent above, so the sign fills a rectangle instead of
                  tapering to a narrow base. Inner ends stop 11.1 units clear of
                  GOODS (measured x161.1–238.9 via getBBox). */}
              <line x1="44" y1="108" x2="150" y2="108" stroke={l.fill} strokeWidth="1.2" />
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
              <line x1="250" y1="108" x2="356" y2="108" stroke={l.fill} strokeWidth="1.2" />
            </>
          ) : (
            <>
              <text
                x="200"
                y="72"
                textAnchor="middle"
                fill={l.fill}
                style={{
                  /* 60px, not 52: at 52 the title measured x64–334 while the
                     rules below ran x42–358, so the sign flared OUTWARD at the
                     base — the mirror of the left sign's inward taper. 60px
                     brings it to the shared x44–356 box. */
                  font: 'italic 300 60px var(--font-serif)',
                  letterSpacing: '0.03em',
                }}
              >
                Bud &amp; Bloom
              </text>
              {/* Inner ends at x=108/292: "FLOWER SHOP" at 13px with 0.42em
                  tracking measures x119.8–280.2 via getBBox, so ending here
                  keeps 11.8 units clear either side. Earlier values ran the
                  rules straight through the F and the P — the "strikethrough".
                  Outer ends match the title above, for a rectangular sign. */}
              <line x1="44" y1="104" x2="108" y2="104" stroke={l.fill} strokeWidth="1.2" />
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
              <line x1="292" y1="104" x2="356" y2="104" stroke={l.fill} strokeWidth="1.2" />
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
  angle,
  coarse,
  onEnter,
  onLeave,
  onSelect,
}: {
  door: (typeof DOORS)[Side];
  state: DoorState;
  /** Idle lean of the sign. Derived from the clip; the ?tune panel overrides it. */
  angle: number;
  /** Touch device: the first tap lights the shop, the second one opens it. */
  coarse: boolean;
  onEnter: () => void;
  onLeave: () => void;
  onSelect: (e: React.MouseEvent) => void;
}) {
  const reduce = useReducedMotion();
  const mounted = useMounted();
  const open = state === 'open';
  const dimmed = state === 'dimmed';
  const warm = state === 'hover' || open;
  const live = Boolean(door.href);
  /** Hold everything at rest: no JS yet, or the visitor asked for less motion. */
  const still = reduce || !mounted;

  // The door turns toward the centre of the street; the sign counter-rotates by
  // the same angle when open, so it faces the camera dead-on while the window
  // stays turned. Nested preserve-3d makes the child rotation relative.
  const turn = door.id === 'left' ? 13 : -13;

  // Plain elements: nothing on this door is Motion-driven any more.
  const Tag = live ? 'a' : 'div';

  return (
    <Tag
      {...(live
        ? {
            href: door.href,
            target: door.external ? '_blank' : undefined,
            rel: door.external ? 'noopener noreferrer' : undefined,
            tabIndex: 0,
          }
        : { 'aria-disabled': true })}
      /* Attached to BOTH kinds of door, not just the linked one: on a touch
         screen a tap is the only way to light a shop up, and the accessories
         window deserves to light up too even though it has nowhere to go yet. */
      onClick={onSelect}
      onFocus={onEnter}
      onBlur={onLeave}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      aria-label={door.label}
      className={`group relative block outline-none ${live ? '' : 'cursor-default'}`}
      /**
       * The column is sized FROM the window: its height is capped so the sign,
       * glass and button all sit on one screen without scrolling, and the width
       * follows from the photograph's aspect. Both windows share a height so
       * their buttons line up; their widths differ because the two photographs
       * do — which is honest to them, and reads as two real shopfronts.
       *
       * ── WHY THIS IS CSS AND NOT MOTION ────────────────────────────────────
       *
       * Motion's `animate` is inert on this page and this page only. Measured:
       * with the door genuinely open (CTA switched to TAP AGAIN, glass lit at
       * brightness(1.24)) and sampled continuously from 30ms to 1500ms, Motion
       * wrote `transform: none` and `opacity: 1` the entire time, while the
       * identical pattern animates fine on the home page.
       *
       * Everything on this page that DOES work — the sign's lean, the window
       * lighting, the neon strike, the CTA glow — is plain CSS. So the turn is
       * too. It also means the effect no longer depends on a JS library
       * succeeding on a phone, which is exactly where it needs to survive.
       */
      style={{
        transformStyle: 'preserve-3d',
        width: COLUMN_W,
        maxWidth: '100%',
        transform: still
          ? undefined
          : open
            ? `translateY(-12px) rotateY(${turn}deg) scale(1.02)`
            : dimmed
              ? 'scale(0.98)'
              : undefined,
        opacity: dimmed ? 0.3 : 1,
        transition: still ? undefined : 'transform .9s cubic-bezier(.2,.7,.2,1), opacity .9s ease',
      }}
    >
      {/* ── The sign — hangs IN the window's own perspective at idle: the same
          angle and depth as the photograph beneath it, so on the left the H of
          HIGH SOCIETY sits nearer the viewer than the Y, mirrored on the right.
          On hover it comes forward with a swing (spring overshoot) toward the
          camera; on select it counter-rotates the door's turn to face the
          viewer dead-on and grows. ── */}
      {/* The sign carries its OWN perspective — see SIGN_PERSPECTIVE. It is
          wider than the column, so it hangs into the street the way a real
          shopfront sign overhangs its window; centred by translate rather than
          auto margins, which collapse to zero once the child overflows. */}
      <div
        className="relative left-1/2 z-10 -translate-x-1/2"
        style={{
          width: SIGN_W,
          perspective: SIGN_PERSPECTIVE,
          perspectiveOrigin: `${SIGN_CAMERA[door.id].x}% ${SIGN_CAMERA[door.id].y}%`,
        }}
      >
        {/* The lean is STATIC CSS, not an animated value. It is the sign's
            resting geometry — it hangs in the window's plane — so it must be in
            the first paint, survive prefers-reduced-motion, and survive JS never
            arriving. Driving it through `animate` meant no transform was written
            at all until something changed, and the signs sat dead flat. */}
        <div style={{ transform: `rotateY(${angle}deg)`, transformStyle: 'preserve-3d' }}>
          {/* Motion animates only the DEVIATION from that rest pose: on hover it
              unwinds the lean to face the camera; on select it unwinds the
              door's turn as well. Idle is 0 — no transform needed. */}
          {/* CSS for the same reason as the door above. The cubic-bezier
              overshoots past 1, which is what keeps this reading as a swing
              rather than a slide — it was a spring before. */}
          <div
            style={{
              transformOrigin: '50% 100%',
              transform:
                still || (!open && !warm)
                  ? undefined
                  : open
                    ? `translateY(-5px) rotateY(${-angle - turn}deg) scale(1.15)`
                    : `translateY(-2px) rotateY(${-angle}deg) scale(1.07)`,
              transition: still ? undefined : 'transform .55s cubic-bezier(.34,1.56,.64,1)',
            }}
          >
            <NeonSign side={door.id} lit={warm} />
          </div>
        </div>
      </div>

      {/* ── The glass window — one image, lit entirely by filters ──
          The frame is a photographed trapezoid, so the cutout is a measured
          clip-path on the inner box, and the glow is drop-shadow on THIS outer
          wrapper — drop-shadow follows the clipped silhouette, where box-shadow
          would draw a rectangle around a non-rectangular window. */}
      {/* Flush, no negative margin: cameraFromClip derives the camera assuming
          the sign sits directly on top of the glass. A 4px overlap here put the
          sign's vanishing point 4px off the window's — small, but it is exactly
          the kind of drift that makes two objects stop sharing a plane. */}
      <div
        className="relative"
        style={{
          filter: open
            ? `drop-shadow(0 30px 60px rgba(0,0,0,.85)) drop-shadow(0 0 46px rgba(${door.tint},.34))`
            : warm
              ? `drop-shadow(0 26px 55px rgba(0,0,0,.85)) drop-shadow(0 0 30px rgba(${door.tint},.2))`
              : 'drop-shadow(0 20px 45px rgba(0,0,0,.75))',
          transition: 'filter .7s ease',
        }}
      >
      <div
        className="relative mx-auto overflow-hidden"
        style={{
          height: WINDOW_H,
          width: `calc(${WINDOW_H} * ${door.aspect})`,
          maxWidth: '100%',
          aspectRatio: door.ratio,
          clipPath: door.clip,
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

        {/* No rectangular focus ring — it cannot follow the trapezoid. Focus
            fires the warm state instead (onFocus lights the sign, CTA
            glows, window brightens), which is the visible focus indicator. */}
      </div>
      </div>

      {/* ── The CTA — a neon box below the glass ── */}
      <div
        className="mx-auto mt-4 flex w-[74%] items-center justify-center px-6 py-3 text-center font-display text-[12px] tracking-[0.38em] uppercase"
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
        {/* On touch, an armed door says so. Without this the first tap reads as
            a dead link — the shop lights up, but nothing tells you the tap
            landed on purpose or that a second one opens it. */}
        {coarse && open && live ? 'TAP AGAIN TO OPEN' : door.cta}
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

/**
 * Angle tuner — visit /choice/?tune to drag the signs and read exact values.
 *
 * Development instrument, not a feature. It is gated on the query string and
 * read AFTER mount, so it never renders for a visitor and never reaches the
 * static HTML. Once a value here looks right, paste it into SIGN_ANGLE (or,
 * better, fix the clip it was derived from — the derivation is the source of
 * truth and the slider is only a second opinion on it).
 */
function Tuner({
  angles,
  derived,
  onChange,
}: {
  angles: Record<Side, number>;
  derived: Record<Side, number>;
  onChange: (side: Side, v: number) => void;
}) {
  return (
    <div className="fixed bottom-4 left-4 z-50 w-72 rounded-lg border border-gold/40 bg-black/90 p-4 font-mono text-[11px] text-bone/85 backdrop-blur">
      <p className="mb-3 tracking-[0.2em] text-gold uppercase">Sign angle</p>
      {(['left', 'right'] as Side[]).map((side) => (
        <label key={side} className="mb-3 block">
          <span className="flex justify-between">
            <span>{side === 'left' ? 'HIGH SOCIETY' : 'Bud &amp; Bloom'}</span>
            <span className="text-gold-lit">{angles[side].toFixed(1)}°</span>
          </span>
          <input
            type="range"
            min={-45}
            max={45}
            step={0.5}
            value={angles[side]}
            onChange={(e) => onChange(side, Number(e.target.value))}
            className="mt-1 w-full accent-gold"
          />
          <span className="text-bone/45">
            derived from clip: {derived[side].toFixed(1)}°
          </span>
        </label>
      ))}
      <p className="mt-3 border-t border-gold/20 pt-2 leading-relaxed text-bone/50">
        Hover a window to see the swing. Values are idle-state only.
      </p>
    </div>
  );
}

export default function ShopChoice() {
  const [hovered, setHovered] = useState<Side | null>(null);
  const [opened, setOpened] = useState<Side | null>(null);
  const [tuning, setTuning] = useState(false);
  const [angles, setAngles] = useState<Record<Side, number>>(SIGN_ANGLE);
  const [coarse, setCoarse] = useState(false);

  /**
   * `(hover: none)` — the device cannot hover, so it never gets the lit-up
   * state a mouse gets for free. Deliberately NOT a width breakpoint: a narrow
   * desktop window still has a mouse and should still open on one click, and a
   * large tablet has no mouse and should not.
   *
   * Read after mount and kept live, so plugging in a mouse or rotating into a
   * desktop-class pointer switches behaviour without a reload.
   */
  useEffect(() => {
    // /choice/?touch forces the two-stage tap on a desktop, so the interaction
    // can be demonstrated (and tested) without a phone in hand. Query-gated
    // like ?tune, so it never reaches a visitor.
    if (new URLSearchParams(window.location.search).has('touch')) {
      setCoarse(true);
      return;
    }
    const mq = window.matchMedia('(hover: none)');
    const sync = () => setCoarse(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  // After mount only: the query string does not exist during the static export,
  // so reading it in render would desync hydration.
  useEffect(() => {
    setTuning(new URLSearchParams(window.location.search).has('tune'));
  }, []);

  useEffect(() => {
    if (!opened) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpened(null);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [opened]);

  /**
   * Mouse: one click opens, exactly as before.
   *
   * Touch: the first tap arms the door — it lights, turns toward you and dims
   * the other side — and the second tap follows the link. Without this, a tap
   * navigates instantly and the storefront moment never happens at all.
   *
   * "Armed" reuses `opened`, so the two-stage tap gets the full open state for
   * free rather than inventing a second, near-identical visual state.
   */
  const select = (side: Side) => (e: React.MouseEvent) => {
    if (coarse && opened !== side) {
      // Only meaningful on the linked door; harmless on the one with no href.
      e.preventDefault();
      setOpened(side);
      return;
    }
    setOpened(side);
  };

  const stateFor = (side: Side): DoorState => {
    if (opened === side) return 'open';
    if (opened && opened !== side) return 'dimmed';
    if (hovered === side) return 'hover';
    if (hovered && hovered !== side) return 'dimmed';
    return 'idle';
  };

  return (
    <div
      className="relative flex min-h-screen flex-col items-center px-5 py-10 sm:py-14"
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

      {/* Kept deliberately compact: the sign, the glass and the button have to
          share one screen on a 720px-tall laptop, and the lockup is square — so
          every pixel of its width costs the same in height. */}
      <header className="relative flex flex-col items-center gap-3 text-center">
        <img
          src="/img/lockup-640.webp"
          alt="The Roach"
          width={640}
          height={640}
          className="w-[92px] select-none sm:w-[112px]"
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
        <p className="font-serif max-w-xl text-base leading-relaxed font-light text-bone/60 italic sm:text-lg">
          Step off the street and choose your entrance — the goods counter, or the growers’ room.
        </p>
      </header>

      {/* The street: shared perspective so the windows genuinely face each other */}
      <div
        className="relative mt-6 flex w-full max-w-[1240px] flex-col items-center justify-center gap-14 sm:mt-8 lg:flex-row lg:items-start lg:gap-[clamp(72px,10vw,180px)]"
        style={{ perspective: 1800 }}
        onMouseLeave={() => setHovered(null)}
      >
        <Window
          door={DOORS.left}
          state={stateFor('left')}
          angle={angles.left}
          coarse={coarse}
          onEnter={() => setHovered('left')}
          onLeave={() => setHovered(null)}
          onSelect={select('left')}
        />

        <Window
          door={DOORS.right}
          state={stateFor('right')}
          angle={angles.right}
          coarse={coarse}
          onEnter={() => setHovered('right')}
          onLeave={() => setHovered(null)}
          onSelect={select('right')}
        />
      </div>

      {/* Everything that used to live at the end of the story deck now lives
          here, since this is where the journey actually ends. */}
      <footer className="relative mt-14 flex w-full max-w-[840px] flex-col items-center gap-6 border-t hairline pt-10 text-center">
        <p className="max-w-xl text-base leading-relaxed font-light text-bone/70">
          We also make a podcast about all of this —{' '}
          <a
            href="/potcast/"
            className="text-gold-lit underline-offset-4 outline-none hover:underline focus-visible:underline"
          >
            PotCast, Bra met ’n Bek
          </a>
          . Late-night thoughts, real conversations, raw truth. New episodes weekly.
        </p>

        <img
          src="/img/badge-320.webp"
          alt=""
          width={320}
          height={320}
          className="mt-2 w-16 select-none opacity-90"
          loading="lazy"
          draggable={false}
        />

        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
          <a
            href={brand.instagram}
            target="_blank"
            rel="noopener noreferrer"
            className="font-display text-[11px] tracking-[0.3em] text-bone/60 uppercase outline-none transition-colors hover:text-gold focus-visible:text-gold"
          >
            Instagram
          </a>
          <span className="h-1 w-1 rounded-full bg-gold/40" aria-hidden />
          <a
            href={`mailto:${brand.email}`}
            className="font-display text-[11px] tracking-[0.3em] text-bone/60 lowercase outline-none transition-colors hover:text-gold focus-visible:text-gold"
          >
            {brand.email}
          </a>
          <span className="h-1 w-1 rounded-full bg-gold/40" aria-hidden />
          <span className="font-display text-[11px] tracking-[0.3em] text-bone/60 uppercase">
            {brand.town} · Garden Route
          </span>
        </div>

        <p className="max-w-md text-xs leading-relaxed font-light text-bone/65">
          The Roach is a private adult collective. Nothing is offered for sale on this website.
          Strictly {brand.minimumAge}+. Enjoyed in private, as the law intends.
        </p>
      </footer>

      {tuning && (
        <Tuner
          angles={angles}
          derived={SIGN_ANGLE}
          onChange={(side, v) => setAngles((a) => ({ ...a, [side]: v }))}
        />
      )}
    </div>
  );
}
