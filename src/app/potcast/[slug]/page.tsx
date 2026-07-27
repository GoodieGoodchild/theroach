import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { brand } from '@/lib/config';
import { show, EPISODES, episodeBySlug, publishedEpisodes } from '@/lib/potcast';

/**
 * One page per episode — /potcast/<slug>/
 *
 * This is where the SEO actually compounds. Each episode is a distinct URL with
 * its own title, description, notes and (crucially) transcript: long-form,
 * naturally-written, keyword-rich text on precisely the topics this client
 * should own, produced as a by-product of talking. Ten episodes turn a 325-word
 * site into a real content property. Nothing here describes a product or price.
 */

/**
 * Static export needs every episode URL known at build time. `dynamicParams:
 * false` makes anything not listed a 404 rather than an attempted render, which
 * is what we want on a static host.
 */
export const dynamicParams = false;

export async function generateStaticParams(): Promise<{ slug: string }[]> {
  return EPISODES.map((e) => ({ slug: e.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const ep = episodeBySlug(slug);
  if (!ep) return {};
  return {
    title: `${ep.title} | PotCast — Bra met 'n Bek`,
    description: ep.blurb,
    alternates: { canonical: `/potcast/${ep.slug}/` },
    openGraph: {
      title: ep.title,
      description: ep.blurb,
      url: `${brand.url}/potcast/${ep.slug}/`,
      type: 'article',
      locale: 'en_ZA',
      publishedTime: ep.published,
      images: [{ url: '/img/og.webp', width: 1200, height: 630 }],
    },
  };
}

export default async function EpisodePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const ep = episodeBySlug(slug);
  if (!ep) notFound();

  const others = publishedEpisodes()
    .filter((e) => e.slug !== ep.slug)
    .slice(0, 3);

  const ld = {
    '@context': 'https://schema.org',
    '@type': 'PodcastEpisode',
    url: `${brand.url}/potcast/${ep.slug}/`,
    name: ep.title,
    episodeNumber: ep.number,
    datePublished: ep.published,
    description: ep.blurb,
    inLanguage: 'en-ZA',
    partOfSeries: {
      '@type': 'PodcastSeries',
      name: `${show.name} — ${show.tagline}`,
      url: `${brand.url}/potcast/`,
    },
    ...(ep.minutes ? { timeRequired: `PT${ep.minutes}M` } : {}),
    ...(ep.transcript ? { transcript: ep.transcript } : {}),
  };

  const listen = ep.links ?? {};

  return (
    <main className="mx-auto max-w-3xl px-6 py-24 sm:py-32">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />

      <Link
        href="/potcast/"
        className="font-display text-[11px] tracking-[0.3em] text-gold uppercase hover:underline"
      >
        ← PotCast
      </Link>

      <p className="mt-8 font-display text-[11px] tracking-[0.35em] text-gold/70 uppercase">
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

      <h1 className="foil mt-4 font-display text-3xl font-extralight tracking-wide sm:text-5xl">
        {ep.title}
      </h1>

      <div className="rule-gold mt-8 w-32" />

      <p className="mt-8 text-lg font-light leading-relaxed text-bone/75">{ep.blurb}</p>

      {(listen.spotify || listen.apple || listen.youtube) && (
        <div className="mt-10 flex flex-wrap gap-3">
          {listen.spotify && <Listen href={listen.spotify} label="Spotify" />}
          {listen.apple && <Listen href={listen.apple} label="Apple Podcasts" />}
          {listen.youtube && <Listen href={listen.youtube} label="YouTube" />}
        </div>
      )}

      {ep.notes?.length ? (
        <section className="mt-16">
          <h2 className="font-display text-xl font-light tracking-[0.14em] text-bone uppercase">
            In this episode
          </h2>
          <ul className="mt-6 space-y-3">
            {ep.notes.map((n, i) => (
              <li key={i} className="flex gap-4 text-base font-light leading-relaxed text-bone/70">
                <span className="mt-2.5 h-1 w-1 shrink-0 rounded-full bg-gold" />
                {n}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {ep.transcript ? (
        <section className="mt-16">
          <h2 className="font-display text-xl font-light tracking-[0.14em] text-bone uppercase">
            Transcript
          </h2>
          <div className="mt-6 space-y-4 text-base font-light leading-relaxed whitespace-pre-line text-bone/70">
            {ep.transcript}
          </div>
        </section>
      ) : null}

      {others.length > 0 && (
        <section className="mt-20 border-t hairline pt-10">
          <h2 className="font-display text-xl font-light tracking-[0.14em] text-bone uppercase">
            More episodes
          </h2>
          <ul className="mt-6 space-y-4">
            {others.map((o) => (
              <li key={o.slug}>
                <Link
                  href={`/potcast/${o.slug}/`}
                  className="text-base font-light text-bone/70 hover:text-gold-lit"
                >
                  {o.number}. {o.title}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <nav className="mt-20 border-t hairline pt-8">
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
