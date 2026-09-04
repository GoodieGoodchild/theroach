import type { Metadata } from 'next';
import Link from 'next/link';
import { brand } from '@/lib/config';

/**
 * Custom 404.
 *
 * Without this, Next serves its own default page — which carries its OWN
 * <title> alongside the layout's, so the document ends up with TWO title tags
 * and the browser shows "404: This page could not be found." Unbranded, and
 * confusing to anyone auditing the site's titles.
 *
 * Not to be confused with the 410 page (public/410.html), which nginx serves
 * for the dead WooCommerce URLs. That one says "gone, and deliberately so".
 * This one says "wrong turn, here is the way back".
 */
export const metadata: Metadata = {
  title: 'Page not found — The Roach, Knysna',
  description:
    'That page is not here. The Roach is a private cannabis collective in Knysna, on South Africa’s Garden Route.',
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center px-6 text-center">
      <p className="font-display text-[11px] font-light tracking-[0.5em] text-gold uppercase">
        {brand.town} · Garden Route
      </p>
      <h1 className="foil mt-6 font-display text-4xl font-extralight tracking-wide sm:text-5xl">
        Wrong turn.
      </h1>
      <div className="rule-gold mx-auto mt-8 w-40" />
      <p className="mt-8 text-base leading-relaxed font-light text-bone/70 sm:text-lg">
        That page isn’t here — it may have moved, or never existed. The circle is still going,
        though.
      </p>

      <div className="mt-12 flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
        <Link
          href="/"
          className="font-display text-[11px] tracking-[0.3em] text-gold-lit uppercase outline-none hover:underline focus-visible:underline"
        >
          The story
        </Link>
        <Link
          href="/blog/"
          className="font-display text-[11px] tracking-[0.3em] text-bone/60 uppercase outline-none hover:text-gold focus-visible:text-gold"
        >
          The journal
        </Link>
        <Link
          href="/choice/"
          className="font-display text-[11px] tracking-[0.3em] text-bone/60 uppercase outline-none hover:text-gold focus-visible:text-gold"
        >
          The street
        </Link>
      </div>
    </main>
  );
}
