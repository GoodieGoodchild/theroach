import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { brand } from '@/lib/config';
import { publishedPosts, postBySlug } from '@/lib/blog';

/** Static export: every post page is prerendered from content/blog/*.md. */
export function generateStaticParams() {
  return publishedPosts().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const post = postBySlug((await params).slug);
  if (!post) return {};
  return {
    title: `${post.title} — The Daily Roach`,
    description: post.blurb,
    alternates: { canonical: `/blog/${post.slug}/` },
    openGraph: {
      title: post.title,
      description: post.blurb,
      url: `${brand.url}/blog/${post.slug}/`,
      type: 'article',
      locale: 'en_ZA',
      images: [{ url: post.image ?? '/img/og.jpg', width: 1200, height: 630 }],
    },
  };
}

export default async function PostPage({ params }: { params: Promise<{ slug: string }> }) {
  const post = postBySlug((await params).slug);
  if (!post) notFound();

  const articleLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.blurb,
    datePublished: post.date,
    url: `${brand.url}/blog/${post.slug}/`,
    inLanguage: 'en-ZA',
    author: { '@type': 'Organization', name: brand.name, url: brand.url },
    publisher: { '@type': 'Organization', name: brand.name, url: brand.url },
  };

  return (
    <main className="mx-auto max-w-3xl px-6 py-24 sm:py-32">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleLd) }}
      />

      <p className="font-display text-[11px] tracking-[0.3em] text-bone/50 uppercase">
        {new Date(post.date).toLocaleDateString('en-ZA', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })}
      </p>
      <h1 className="foil mt-4 font-display text-3xl font-extralight tracking-wide sm:text-5xl">
        {post.title}
      </h1>
      <div className="rule-gold mt-8 w-40" />

      {/* Post body from markdown, converted at build time. The prose comes from
          the collective's own journal — same voice rules as the rest of the
          site: commentary only, no products, no prices. */}
      <div
        className="prose-roach mt-10 space-y-5 text-base leading-relaxed font-light text-bone/75 sm:text-lg"
        dangerouslySetInnerHTML={{ __html: post.html }}
      />

      <footer className="mt-20 flex flex-wrap gap-x-8 gap-y-3 border-t hairline pt-8">
        <Link
          href="/blog/"
          className="font-display text-[11px] tracking-[0.3em] text-bone/60 uppercase outline-none hover:text-gold focus-visible:text-gold"
        >
          ← The journal
        </Link>
        <Link
          href="/choice/"
          className="font-display text-[11px] tracking-[0.3em] text-bone/60 uppercase outline-none hover:text-gold focus-visible:text-gold"
        >
          The street
        </Link>
      </footer>
    </main>
  );
}
