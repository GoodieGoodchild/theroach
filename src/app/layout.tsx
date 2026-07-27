import type { Metadata } from 'next';
import { Montserrat, Jost, Cormorant_Garamond } from 'next/font/google';
import { brand, waLink } from '@/lib/config';
import './globals.css';

const montserrat = Montserrat({
  subsets: ['latin'],
  weight: ['200', '300', '400'],
  variable: '--font-montserrat',
});
const jost = Jost({
  subsets: ['latin'],
  weight: ['300', '400', '500'],
  variable: '--font-jost',
});
const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['300', '400'],
  style: ['normal', 'italic'],
  variable: '--font-cormorant',
});

/**
 * Title targets "cannabis club Knysna" — the phrase Google's index ALREADY
 * associates with this domain (the old pages still carry the title suffix
 * "Cannabis Club in Knysna"), and a phrase that describes what the entity IS
 * rather than offering anything for sale. Deliberately NOT targeting "buy weed
 * Knysna" or "dispensary Knysna": those are winnable but they turn a private
 * collective into documented evidence of intent to reach purchasers. See the
 * SEO section of README.md.
 */
export const metadata: Metadata = {
  metadataBase: new URL(brand.url),
  // 49 chars — fits before Google truncates (~60), and deliberately echoes the
  // legacy title the index already holds for this domain ("Cannabis Club in
  // Knysna - The Roach"), so the entity reconciles instead of competing.
  title: 'The Roach — Cannabis Club in Knysna, Garden Route',
  // 152 chars — inside the ~160 truncation point.
  description:
    'A private cannabis collective in Knysna on South Africa’s Garden Route. Fifteen years of organic craft. Members only, 18+. Nothing is offered for sale.',
  keywords: [
    'cannabis club Knysna',
    'private cannabis collective',
    'cannabis Garden Route',
    'Knysna cannabis',
    'cannabis social club South Africa',
  ],
  alternates: { canonical: '/' },
  /**
   * Share card is JPEG, deliberately. WhatsApp — the client's main sharing
   * channel — does not reliably render WebP link previews, and a WebP og:image
   * degrades silently to a text-only preview with no picture at all.
   * `type` is declared explicitly because some scrapers will not sniff it.
   */
  openGraph: {
    title: 'The Roach — Private Cannabis Club in Knysna',
    description:
      'A private cannabis collective on the Garden Route. Fifteen years of organic craft. Members only, 18+.',
    url: brand.url,
    siteName: brand.name,
    images: [
      {
        url: '/img/og.jpg',
        width: 1200,
        height: 630,
        type: 'image/jpeg',
        alt: 'The Roach — crafted for the collective. Knysna, Garden Route.',
      },
    ],
    locale: 'en_ZA',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'The Roach — Private Cannabis Club in Knysna',
    description:
      'A private cannabis collective on the Garden Route. Fifteen years of organic craft. Members only, 18+.',
    images: ['/img/og.jpg'],
  },
  robots: { index: true, follow: true },
};

/**
 * Brand-level schema. Deliberately NO offers, NO prices, NO product catalogue —
 * the public site is a brand page, not a shopfront (see docs in README).
 */
/**
 * Organization, deliberately — NOT LocalBusiness.
 *
 * LocalBusiness plus a street address and geo coordinates is what feeds the map
 * pack, and it would help rankings. It is also a public, machine-readable
 * declaration of exactly where the premises are. That is a disclosure decision
 * for the client to make knowingly alongside the Google Business Profile
 * question — not something to slip in as a technical tweak. Locality only, until
 * he decides. See README.md → SEO.
 *
 * No `offers`, no `priceRange`, no `makesOffer`: nothing here may describe a sale.
 *
 * `alternateName` carries the legacy brand so the entity reconciles — Google's
 * index still holds this domain under "High Tide … Cannabis Club in Knysna".
 */
const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: brand.name,
  alternateName: ['The Roach Knysna', 'High Tide Knysna'],
  url: brand.url,
  logo: `${brand.url}/img/badge-640.webp`,
  slogan: brand.strapline,
  description:
    'A private cannabis collective in Knysna on the Garden Route, South Africa. Members only, 18+. Nothing is offered for sale.',
  email: brand.email,
  sameAs: [brand.instagram],
  areaServed: [
    { '@type': 'City', name: 'Knysna' },
    { '@type': 'Place', name: 'Garden Route' },
    { '@type': 'AdministrativeArea', name: 'Western Cape' },
  ],
  address: {
    '@type': 'PostalAddress',
    addressLocality: brand.town,
    addressRegion: brand.region,
    addressCountry: 'ZA',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-ZA" className={`${montserrat.variable} ${jost.variable} ${cormorant.variable}`}>
      <body className="grain">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
        <noscript>
          <div
            style={{
              position: 'relative',
              zIndex: 200,
              padding: '2rem',
              textAlign: 'center',
              borderBottom: '1px solid #8a6a35',
            }}
          >
            The Roach · Knysna · 18+ · JavaScript is off — reach us directly:{' '}
            <a href={waLink} style={{ color: '#d3aa6a' }}>
              WhatsApp
            </a>
          </div>
        </noscript>
        {children}
      </body>
    </html>
  );
}
