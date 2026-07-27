/**
 * PotCast — Bra met 'n Bek.
 *
 * THIS FILE IS THE SEO ENGINE. The main site is ~325 words on one route, which
 * is below the floor for ranking anything competitive. Every episode added here
 * becomes an indexable page with its own title, description, show notes and
 * transcript — so the property grows from one thin page into a genuine content
 * library, without the site ever describing a product or a price.
 *
 * That distinction is the whole point: a podcast about cannabis culture, law and
 * craft is commentary. It is not an offer to sell, so it carries none of the
 * "advertise for sale" exposure that transactional pages would. It is the one
 * way this client can legitimately out-publish every shop on the Garden Route.
 *
 * ── ADDING AN EPISODE ────────────────────────────────────────────────────────
 * Append to EPISODES. Only `slug`, `number`, `title`, `blurb` and `published`
 * are required; everything else improves the page if present.
 *
 * `transcript` matters more than anything else here. It is long-form, keyword-
 * rich, naturally-written text on exactly the topics we want to own — the single
 * highest-value SEO asset the client can produce, and he is producing it anyway
 * by talking. Even a rough auto-transcript (YouTube, Whisper) tidied up beats
 * having none.
 */

export interface Episode {
  slug: string;
  number: number;
  title: string;
  /** One or two sentences. Becomes the meta description — keep under ~155 chars. */
  blurb: string;
  /** ISO date, e.g. '2026-07-25'. */
  published: string;
  /** Runtime in minutes, if known. */
  minutes?: number;
  /** Bullet show notes — good for skim-readers and for featured snippets. */
  notes?: string[];
  /** Full transcript. The most valuable field on this object. */
  transcript?: string;
  /** Where to listen. */
  links?: { spotify?: string; apple?: string; youtube?: string };
  /** Topic tags, lower case. Used for internal linking between episodes. */
  topics?: string[];
}

export const show = {
  name: 'PotCast',
  tagline: "Bra met 'n Bek",
  strap: 'Late-night thoughts. Real conversations. Raw truth.',
  description:
    'PotCast — Bra met ’n Bek is a Knysna podcast about cannabis culture in South Africa: the law, the craft, the people, and the conversations that happen after dark on the Garden Route. New episodes weekly.',
  /** ⚠️ Fill these in as the show is distributed — they are also the backlinks. */
  spotify: '',
  apple: '',
  youtube: '',
  /** Podcast RSS feed, once it exists. Required for most directories. */
  rss: '',
};

/**
 * ⚠️ Episode 1 below is transcribed FROM THE CLIENT'S OWN PROMO ARTWORK — the
 * title, the pull quote, the discussion prompt and the themes are all his. I
 * have invented nothing. But it still needs, from him:
 *
 *   · the real `published` date (currently a placeholder)
 *   · `minutes`, and the Spotify / Apple / YouTube links once distributed
 *   · THE TRANSCRIPT — by far the most valuable field. Run the audio through
 *     Whisper or YouTube auto-captions, tidy the worst of it, paste it in.
 *
 * Do not add episodes that do not exist. A thin or invented episode page is
 * worse than an empty shelf: Google demonstrably discounts thin auto-generated
 * pages, and it would undermine the one honest asset this property has.
 */
export const EPISODES: Episode[] = [
  {
    slug: 'the-myth-of-starting-over',
    number: 1,
    title: 'The Myth of Starting Over',
    blurb:
      'Why new beginnings never arrive the way you expect — and why most people don’t need a fresh start so much as the courage to finish what they’ve been avoiding.',
    published: '2026-07-25', // ⚠️ placeholder — set the real publish date
    notes: [
      'Most people don’t need a new beginning. They need the courage to finish what they’ve been avoiding.',
      'The things we call excuses: fear, the comfort zone, “what if”, “not ready yet”.',
      '“Every moment is a fresh beginning.” — T. S. Eliot',
      'If you could restart one part of your life tomorrow, what would it be — and what’s stopping you today?',
    ],
    topics: ['starting over', 'fear', 'comfort zone', 'late-night thoughts'],
  },
];

export const publishedEpisodes = () =>
  [...EPISODES].sort((a, b) => b.published.localeCompare(a.published));

export const episodeBySlug = (slug: string) => EPISODES.find((e) => e.slug === slug);
