import type { Metadata } from 'next';
import Link from 'next/link';
import { brand } from '@/lib/config';
import { show, publishedEpisodes } from '@/lib/potcast';

/**
 * The PotCast hub — /potcast/
 *
 * A deliberately PLAIN, server-rendered page. The homepage is theatre: a video
 * gate and an animated deck. This is the opposite, and on purpose — it is the
 * page that has to be crawlable, linkable, skimmable and quotable. Every episode
 * added grows the property's indexable surface without the site ever describing
 * a product or a price.
 */
export const metadata: Metadata = {
  title: "PotCast — Bra met 'n Bek | Cannabis Podcast, Knysna",
  description:
    'A Knysna cannabis podcast about South African weed culture, the law and the craft. Late-night thoughts, real conversations, raw truth. New episodes weekly.',
  alternates: { canonical: '/potcast/' },
  openGraph: {
    title: "PotCast — Bra met 'n Bek",
    description: show.strap,
    url: `${brand.url}/potcast/`,
    type: 'website',
    locale: 'en_ZA',
    images: [{ url: '/img/og.webp', width: 1200, height: 630 }],
  },
};

/**
 * PodcastSeries schema. Google understands podcasts as a distinct entity type,
 * and a series with episodes is eligible for richer treatment than a plain page.
 * No `offers` and no price — same rule as everywhere else on this property.
 */
const seriesLd = {
  '@context': 'https://schema.org',
  '@type': 'PodcastSeries',
  name: `${show.name} — ${show.tagline}`,
  description: show.description,
  url: `${brand.url}/potcast/`,
  inLanguage: ['en-ZA', 'af-ZA'],
  genre: ['Cannabis', 'Society & Culture'],
  author: { '@type': 'Organization', name: brand.name, url: brand.url },
  publisher: { '@type': 'Organization', name: brand.name, url: brand.url },
  ...(show.rss ? { webFeed: show.rss } : {}),
  ...(show.spotify || show.apple || show.youtube
    ? { sameAs: [show.spotify, show.apple, show.youtube].filter(Boolean) }
    : {}),
};

export default function PotcastPage() {
  const episodes = publishedEpisodes();

  return (
    <main className="mx-auto max-w-3xl px-6 py-24 sm:py-32">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(seriesLd) }} />

      <p className="font-display text-[11px] font-light tracking-[0.5em] text-gold uppercase">
        {brand.town} · Garden Route · South Africa
      </p>

      <h1 className="foil mt-6 font-display text-4xl font-extralight tracking-wide sm:text-6xl">
        PotCast — Bra met ’n Bek
      </h1>

      <div className="rule-gold mt-8 w-40" />

      <p className="mt-8 text-lg font-light leading-relaxed text-bone/75">{show.strap}</p>

      <div className="mt-6 space-y-5 text-base font-light leading-relaxed text-bone/70">
        <p>
          A podcast about cannabis in South Africa — the culture, the law, the craft, and the
          conversations that only really start after dark. Recorded in Knysna, on the Garden
          Route, by people who have had their hands in the soil for fifteen years.
        </p>
        <p>
          Not a sales channel. Nothing is offered for sale here, on the podcast or anywhere on
          this site. It is a conversation about a plant, a place, and a law that is still being
          written.
        </p>
      </div>

      {(show.spotify || show.apple || show.youtube) && (
        <div className="mt-10 flex flex-wrap gap-3">
          {show.spotify && <Listen href={show.spotify} label="Spotify" />}
          {show.apple && <Listen href={show.apple} label="Apple Podcasts" />}
          {show.youtube && <Listen href={show.youtube} label="YouTube" />}
        </div>
      )}

      <section className="mt-20">
        <h2 className="font-display text-2xl font-light tracking-[0.12em] text-bone uppercase">
          Episodes
        </h2>
        <div className="rule-gold mt-6 w-24" />

        {episodes.length === 0 ? (
          <p className="mt-8 text-base font-light leading-relaxed text-bone/60">
            The first episodes are being recorded now. New episodes weekly — check back, or
            follow along on{' '}
            <a href={brand.instagram} className="text-gold underline-offset-4 hover:underline">
              Instagram
            </a>
            .
          </p>
        ) : (
          <ol className="mt-10 space-y-10">
            {episodes.map((ep) => (
              <li key={ep.slug}>
                <article>
                  <p className="font-display text-[11px] tracking-[0.35em] text-gold/70 uppercase">
                    Episode {ep.number} ·{' '}
                    <time dateTime={ep.published}>
                      {new Date(ep.published + 'T00:00:00Z').toLocaleDateString('en-ZA', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                        timeZone: 'UTC',
                      })}
                    </time>
                    {ep.minutes ? ` · ${ep.minutes} min` : ''}
                  </p>
                  <h3 className="mt-3 font-display text-2xl font-light tracking-wide text-bone">
                    <Link href={`/potcast/${ep.slug}/`} className="hover:text-gold-lit">
                      {ep.title}
                    </Link>
                  </h3>
                  <p className="mt-3 text-base font-light leading-relaxed text-bone/65">{ep.blurb}</p>
                  <Link
                    href={`/potcast/${ep.slug}/`}
                    className="mt-4 inline-block font-display text-[11px] tracking-[0.3em] text-gold uppercase underline-offset-4 hover:underline"
                  >
                    Episode notes &amp; transcript →
                  </Link>
                </article>
              </li>
            ))}
          </ol>
        )}
      </section>

      <nav className="mt-24 border-t hairline pt-8">
        <Link
          href="/"
          className="font-display text-[11px] tracking-[0.3em] text-bone/60 uppercase hover:text-gold"
        >
          ← The Roach — private cannabis collective, Knysna
        </Link>
      </nav>
    </main>
  );
}

function Listen({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="rounded-full border border-gold/50 px-6 py-3 font-display text-[11px] tracking-[0.25em] text-gold-lit uppercase transition-colors hover:border-gold"
    >
      {label}
    </a>
  );
}
