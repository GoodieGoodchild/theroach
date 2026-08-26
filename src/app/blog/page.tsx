import type { Metadata } from 'next';
import Link from 'next/link';
import { brand } from '@/lib/config';
import { publishedPosts } from '@/lib/blog';

/**
 * The Daily Roach hub — /blog/
 *
 * Same philosophy as /potcast/: deliberately plain and server-rendered where
 * the homepage is theatre. This is crawlable, linkable surface — every post
 * grows the property's index without the site ever describing a product or a
 * price. Posts come from content/blog/*.md via src/lib/blog.ts.
 */
export const metadata: Metadata = {
  title: 'The Daily Roach — Journal | Cannabis Culture, Knysna',
  description:
    'The journal of a private cannabis collective in Knysna: notes on the craft, the culture and the law, from the Garden Route.',
  alternates: { canonical: '/blog/' },
  openGraph: {
    title: 'The Daily Roach — Journal',
    description: 'Notes on the craft, the culture and the law, from the Garden Route.',
    url: `${brand.url}/blog/`,
    type: 'website',
    locale: 'en_ZA',
    images: [{ url: '/img/og.jpg', width: 1200, height: 630 }],
  },
};

export default function BlogPage() {
  const posts = publishedPosts();

  return (
    <main className="mx-auto max-w-3xl px-6 py-24 sm:py-32">
      <p className="font-display text-[11px] font-light tracking-[0.5em] text-gold uppercase">
        {brand.town} · Garden Route · South Africa
      </p>
      <h1 className="foil mt-6 font-display text-4xl font-extralight tracking-wide sm:text-6xl">
        The Daily Roach
      </h1>
      <p className="font-serif mt-5 text-lg font-light italic text-bone/70 sm:text-xl">
        Notes from the circle — the craft, the culture, the quiet green corners.
      </p>
      <div className="rule-gold mt-8 w-40" />

      <div className="mt-14 space-y-12">
        {posts.map((post) => (
          <article key={post.slug}>
            <p className="font-display text-[11px] tracking-[0.3em] text-bone/50 uppercase">
              {new Date(post.date).toLocaleDateString('en-ZA', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </p>
            <h2 className="mt-2 font-display text-2xl font-extralight tracking-wide text-bone">
              <Link
                href={`/blog/${post.slug}/`}
                className="outline-none transition-colors hover:text-gold-lit focus-visible:text-gold-lit"
              >
                {post.title}
              </Link>
            </h2>
            <p className="mt-3 text-base leading-relaxed font-light text-bone/70">{post.blurb}</p>
            <Link
              href={`/blog/${post.slug}/`}
              className="mt-3 inline-block font-display text-[11px] tracking-[0.3em] text-gold uppercase outline-none hover:text-gold-lit focus-visible:text-gold-lit"
            >
              Read on →
            </Link>
          </article>
        ))}
      </div>

      <footer className="mt-20 border-t hairline pt-8">
        <Link
          href="/choice/"
          className="font-display text-[11px] tracking-[0.3em] text-bone/60 uppercase outline-none hover:text-gold focus-visible:text-gold"
        >
          ← Back to the street
        </Link>
      </footer>
    </main>
  );
}
