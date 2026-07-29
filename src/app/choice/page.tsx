import type { Metadata } from 'next';
import ShopChoice from '@/components/ShopChoice';
import { brand } from '@/lib/config';

/**
 * The two-door chooser.
 *
 * NOINDEX, deliberately. This page exists to route someone who already arrived
 * — it is not a landing page and should not be a search result. The left door
 * is an accessories store (paraphernalia, unproblematic); the right door is the
 * collective's WhatsApp. Letting Google index a page whose right-hand panel is
 * a lit cannabis window beside a "message us" button would undo the careful
 * targeting on the rest of the site, which deliberately avoids transactional
 * intent. Discovery happens on the homepage; this page just directs traffic.
 */
export const metadata: Metadata = {
  title: 'Choose your door — The Roach, Knysna',
  description:
    'Two doors, one collective. The goods counter, or the growers’ room. Members only, 18+.',
  robots: { index: false, follow: true },
  alternates: { canonical: `${brand.url}/choice/` },
};

export default function ChoicePage() {
  return <ShopChoice />;
}
