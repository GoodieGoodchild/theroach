'use client';

import { useState } from 'react';
import { PHOTOS, type Photo } from '@/lib/guide-photos';
import { AERIALS } from '@/lib/guide-aerials';
import { KINDS, ROUTE, THINGS, TOWN_AT, TOWNS, onStrip, type Kind, type Town } from '@/lib/guide';

/**
 * The guide: every place, filterable by town and by mood.
 *
 * EVERY CARD IS ALWAYS IN THE DOM. Filtering sets `hidden`, it never unmounts —
 * so the static export carries the whole guide for a crawler, and with no JS at
 * all the visitor simply sees the full list with inert filter buttons. Same
 * rule as the deck on /story/: server output must stand on its own.
 */

const kinds = Object.keys(KINDS) as Kind[];

export default function ThingsToDo() {
  const [town, setTown] = useState<Town | null>(null);
  const [kind, setKind] = useState<Kind | null>(null);

  const match = (t: (typeof THINGS)[number]) =>
    (!town || t.town === town) && (!kind || t.kind === kind);
  const shown = THINGS.filter(match).length;

  /** How many places a filter would leave, given the OTHER filter as it stands. */
  const inTown = (x: Town) => THINGS.filter((t) => t.town === x && (!kind || t.kind === kind)).length;
  const ofKind = (k: Kind) => THINGS.filter((t) => t.kind === k && (!town || t.town === town)).length;

  return (
    <div>
      {/* ── The route from above ──────────────────────────────────────────
          A real satellite pass (see scripts/route-satellite.mjs), with each
          town pinned at its true position. The pins are the town filter. On a
          phone the strip keeps a readable size and scrolls sideways. */}
      <figure>
        <div className="no-scrollbar -mx-5 overflow-x-auto px-5 sm:mx-0 sm:px-0">
          <div
            className="relative min-w-[880px] overflow-hidden rounded-[14px] border hairline bg-ink-2"
            style={{ aspectRatio: `${ROUTE.width} / ${ROUTE.height}` }}
          >
            <img
              src="/img/route-2200.webp"
              srcSet="/img/route-1400.webp 1400w, /img/route-2200.webp 2200w, /img/route-3000.webp 3000w"
              sizes="(min-width: 1200px) 1152px, max(880px, 100vw)"
              width={ROUTE.width}
              height={ROUTE.height}
              alt="Satellite view of the Garden Route coast, from Mossel Bay in the west to Tsitsikamma in the east, with the Outeniqua mountains and forest inland."
              loading="lazy"
              className="absolute inset-0 h-full w-full object-cover select-none"
              draggable={false}
            />

            {TOWNS.map((x) => {
              const on = town === x;
              const n = inTown(x);
              const { x: px, y: py } = onStrip(TOWN_AT[x].at);
              const below = TOWN_AT[x].below;
              // Labels near either edge hang inward, so they never clip.
              const align = px < 10 ? 'left-0' : px > 90 ? 'right-0' : 'left-1/2 -translate-x-1/2';
              return (
                <button
                  key={x}
                  type="button"
                  onClick={() => setTown(on ? null : x)}
                  aria-pressed={on}
                  aria-label={`${x}, ${n} ${n === 1 ? 'place' : 'places'}`}
                  disabled={n === 0 && !on}
                  className="group absolute h-5 w-5 -translate-x-1/2 -translate-y-1/2 cursor-pointer outline-none disabled:cursor-default"
                  style={{ left: `${px}%`, top: `${py}%` }}
                >
                  <span
                    className={`absolute inset-0 rounded-full border-2 shadow-[0_0_0_3px_rgba(0,0,0,.45)] transition-colors duration-300 group-focus-visible:ring-2 group-focus-visible:ring-gold-lit group-focus-visible:ring-offset-2 group-focus-visible:ring-offset-ink group-disabled:opacity-40 ${
                      on ? 'border-gold-lit bg-gold-lit' : 'border-gold-lit bg-ink/60 group-hover:bg-gold/60'
                    }`}
                  />
                  <span
                    className={`absolute ${align} ${below ? 'top-7' : 'bottom-7'} rounded-full px-3 py-1 whitespace-nowrap backdrop-blur-sm transition-colors duration-300 group-disabled:opacity-40 ${
                      on ? 'bg-gold-lit text-ink' : 'bg-ink/75 text-bone group-hover:text-gold-lit'
                    }`}
                  >
                    <span className="font-display text-[13px]">{x}</span>
                    <span className={`ml-1.5 text-[12px] ${on ? 'text-ink/70' : 'text-bone/60'}`}>{n}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
        <figcaption className="mt-3 flex flex-wrap justify-between gap-x-6 gap-y-1 text-[12px] text-bone/55">
          <span>West to east along the N2. Tap a town to filter.</span>
          <span>
            <a
              href={ROUTE.creditUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="underline-offset-4 outline-none hover:text-gold-lit hover:underline focus-visible:text-gold-lit"
            >
              {ROUTE.credit}
            </a>
            {' · '}
            {ROUTE.creditDetail}
          </span>
        </figcaption>
      </figure>

      {/* ── Mood ── */}
      <div className="mt-8 flex flex-wrap items-center gap-2.5">
        {kinds.map((k) => {
          const on = kind === k;
          const n = ofKind(k);
          return (
            <button
              key={k}
              type="button"
              onClick={() => setKind(on ? null : k)}
              aria-pressed={on}
              disabled={n === 0 && !on}
              className={`flex cursor-pointer items-center gap-2 rounded-full border px-4 py-2 text-[14px] outline-none transition-colors duration-300 focus-visible:ring-2 focus-visible:ring-gold-lit focus-visible:ring-offset-2 focus-visible:ring-offset-ink disabled:cursor-default disabled:opacity-35 ${
                on
                  ? 'border-gold-lit bg-gold/15 text-gold-lit'
                  : 'border-gold/25 text-bone/80 hover:border-gold/60'
              }`}
            >
              <span
                aria-hidden
                className="h-2 w-2 rounded-full"
                style={{ background: KINDS[k].colour }}
              />
              {KINDS[k].label}
            </button>
          );
        })}
      </div>

      <p className="mt-6 text-[14px] text-bone/65" aria-live="polite">
        Showing {shown} of {THINGS.length}
        {town ? ` · ${town}` : ''}
        {kind ? ` · ${KINDS[kind].label}` : ''}
        {(town || kind) && (
          <>
            {' · '}
            <button
              type="button"
              onClick={() => {
                setTown(null);
                setKind(null);
              }}
              className="cursor-pointer text-gold-lit underline underline-offset-4 outline-none hover:text-gold focus-visible:text-gold"
            >
              Show everything
            </button>
          </>
        )}
      </p>

      <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {THINGS.map((t) => (
          <li key={t.title} hidden={!match(t)} className="card flex flex-col overflow-hidden">
            {PHOTOS[t.title] ? (
              <CardPhoto photo={PHOTOS[t.title]} />
            ) : AERIALS[t.title] ? (
              <CardAerial src={AERIALS[t.title]} />
            ) : null}
            <div className="flex flex-1 flex-col p-6">
            <p className="flex items-center justify-between gap-3 text-[13px]">
              <span className="flex items-center gap-2 text-bone/75">
                <span
                  aria-hidden
                  className="h-2 w-2 rounded-full"
                  style={{ background: KINDS[t.kind].colour }}
                />
                {KINDS[t.kind].label}
              </span>
              <span className="font-display tracking-[0.04em] text-gold">{t.town}</span>
            </p>
            <h3 className="mt-4 font-display text-[21px] leading-snug font-normal text-bone">
              {t.title}
            </h3>
            <p className="mt-3 text-[16px] leading-relaxed text-bone/75">{t.blurb}</p>
            {t.tip && (
              <p className="font-serif mt-auto pt-5 text-[18px] leading-snug text-gold-lit italic">
                {t.tip}
              </p>
            )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * A card's photo and its credit. The credit is not optional and not hidden in
 * a tooltip: CC BY and CC BY-SA require the author, the licence and a link,
 * shown with the work, and "cropped" because the card crops it to 3:2.
 */
function CardPhoto({ photo }: { photo: Photo }) {
  return (
    <figure>
      <img
        src={`${photo.src}-640.webp`}
        srcSet={`${photo.src}-640.webp 640w, ${photo.src}-1000.webp 1000w`}
        sizes="(min-width: 1024px) 370px, (min-width: 640px) 50vw, 100vw"
        width={640}
        height={427}
        alt=""
        loading="lazy"
        className="aspect-[3/2] w-full object-cover"
      />
      <figcaption className="px-6 pt-2.5 text-[11px] leading-snug text-bone/50">
        Photo:{' '}
        <a
          href={photo.page}
          target="_blank"
          rel="noopener noreferrer"
          className="outline-none hover:text-gold-lit hover:underline focus-visible:text-gold-lit"
        >
          {photo.author}
        </a>
        {' · '}
        {photo.licenseUrl ? (
          <a
            href={photo.licenseUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="outline-none hover:text-gold-lit hover:underline focus-visible:text-gold-lit"
          >
            {photo.license}
          </a>
        ) : (
          photo.license
        )}
        , cropped
      </figcaption>
    </figure>
  );
}

/**
 * No usable photo exists for a handful of places, so they get the spot itself
 * from the same satellite pass as the route map — real, and credited the same
 * way (the Copernicus licence asks for nothing more).
 */
function CardAerial({ src }: { src: string }) {
  return (
    <figure>
      <img
        src={`${src}-640.webp`}
        srcSet={`${src}-640.webp 640w, ${src}-1000.webp 1000w`}
        sizes="(min-width: 1024px) 370px, (min-width: 640px) 50vw, 100vw"
        width={640}
        height={427}
        alt=""
        loading="lazy"
        className="aspect-[3/2] w-full object-cover"
      />
      <figcaption className="px-6 pt-2.5 text-[11px] leading-snug text-bone/50">
        From above:{' '}
        <a
          href={ROUTE.creditUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="outline-none hover:text-gold-lit hover:underline focus-visible:text-gold-lit"
        >
          {ROUTE.credit.charAt(0).toLowerCase() + ROUTE.credit.slice(1)}
        </a>
      </figcaption>
    </figure>
  );
}
