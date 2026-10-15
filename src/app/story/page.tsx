import type { Metadata } from 'next';
import Link from 'next/link';
import Experience from '@/components/Experience';
import { brand } from '@/lib/config';

/**
 * The story — the film gate and the deck, exactly as they were on the home page.
 *
 * Moved here, not removed. It is the brand moment and it is good; it was just
 * the wrong front door, because nobody arriving cold could tell what the site
 * was. Now it is something you choose to watch from the home page.
 *
 * All the deck's rules still hold (README → "The interaction"): every section
 * stays mounted, nothing renders hidden before mount.
 */
export const metadata: Metadata = {
  title: 'Our story — The Roach, Knysna',
  description:
    'Fifteen years of slow, organic growing in the forest outside Knysna, and why a private cannabis collective on the Garden Route is named after a roach.',
  alternates: { canonical: '/story/' },
  openGraph: {
    title: 'Our story — The Roach, Knysna',
    description: 'Fifteen years of slow, organic growing on the Garden Route.',
    url: `${brand.url}/story/`,
    type: 'website',
    locale: 'en_ZA',
    images: [{ url: '/img/og.jpg', width: 1200, height: 630, type: 'image/jpeg' }],
  },
};

export default function StoryPage() {
  return (
    <>
      <Experience />
      {/* The way back. Above the deck (z-30 rail) and beneath the gate (z-50),
          so it appears once the film has been dismissed. */}
      <Link
        href="/"
        className="fixed top-5 left-5 z-40 font-display text-[12px] tracking-[0.18em] text-bone/70 uppercase outline-none transition-colors hover:text-gold-lit focus-visible:text-gold-lit sm:top-7 sm:left-8"
      >
        ← The Roach
      </Link>
    </>
  );
}
