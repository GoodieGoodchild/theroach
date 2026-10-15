/**
 * The Garden Route guide — the "things to do" half of the home page.
 *
 * Same law as the rest of the property: this is commentary about a place. It
 * names real, public things to do and never suggests lighting up at any of
 * them — public use is not legal here, and the guide says so out loud.
 *
 * ⚠️ DRAFT COPY. Every entry is a well-known public place, but the wording and
 * the picks are ours, not the client's. He lives here: his own list will be
 * better than this one, and he should strike anything he wouldn't send a friend
 * to. Deliberately NO opening hours, entry fees or phone numbers — they go
 * stale, and a guide that is wrong about a gate time is worse than one that
 * says "check before you go".
 *
 * ── ADDING A PLACE ───────────────────────────────────────────────────────────
 * Append to THINGS. `town` must be one of TOWNS and `kind` one of KINDS, or the
 * build fails on the type. The page shows them west to east, town by town, and
 * within a town in the order they are written here.
 */

/** West to east along the N2 — the order you drive them in. */
export const TOWNS = [
  'Mossel Bay',
  'George',
  'Wilderness',
  'Sedgefield',
  'Knysna',
  'Plettenberg Bay',
  'Tsitsikamma',
] as const;
export type Town = (typeof TOWNS)[number];

/**
 * The satellite strip over the guide (public/img/route-*.webp).
 *
 * BBOX must match scripts/route-satellite.mjs, or every pin lands in the wrong
 * place. The credit is a condition of the Copernicus licence, not a courtesy —
 * it must be shown wherever the image is, and the year must match the pass.
 */
export const ROUTE = {
  bbox: [22.05, -34.25, 24.0, -33.8] as const,
  width: 3000,
  height: 836,
  credit: 'Contains modified Copernicus Sentinel data 2026',
  creditDetail: 'Sentinel-2, 3 May 2026, via Microsoft Planetary Computer',
  creditUrl: 'https://sentinels.copernicus.eu/',
};

/**
 * Where each town's pin sits: [longitude, latitude]. Town centres, except
 * Tsitsikamma, which is Storms River Mouth. `below` puts the label under the
 * pin where it would otherwise collide with a neighbour's.
 */
export const TOWN_AT: Record<Town, { at: [number, number]; below?: boolean }> = {
  'Mossel Bay': { at: [22.137, -34.183] },
  George: { at: [22.459, -33.963] },
  Wilderness: { at: [22.578, -33.995], below: true },
  Sedgefield: { at: [22.803, -34.017] },
  Knysna: { at: [23.047, -34.036] },
  'Plettenberg Bay': { at: [23.371, -34.053] },
  Tsitsikamma: { at: [23.897, -34.021] },
};

/** Longitude/latitude → percentage position on the strip (Web Mercator, as rendered). */
export function onStrip([lon, lat]: [number, number]): { x: number; y: number } {
  const [w, s, e, n] = ROUTE.bbox;
  const merc = (d: number) => Math.log(Math.tan(Math.PI / 4 + (d * Math.PI) / 360));
  return {
    x: ((lon - w) / (e - w)) * 100,
    y: ((merc(n) - merc(lat)) / (merc(n) - merc(s))) * 100,
  };
}

export const KINDS = {
  forest: { label: 'Forest', colour: 'var(--color-moss)' },
  water: { label: 'Water', colour: 'var(--color-lagoon)' },
  views: { label: 'Views', colour: 'var(--color-gold-lit)' },
  food: { label: 'Markets & food', colour: 'var(--color-ember)' },
  rain: { label: 'Rainy day', colour: 'var(--color-mist)' },
  big: { label: 'Big day out', colour: 'var(--color-protea)' },
} as const;
export type Kind = keyof typeof KINDS;

export interface Thing {
  title: string;
  town: Town;
  kind: Kind;
  blurb: string;
  /** One line of local advice. Optional, but it is what makes a card ours. */
  tip?: string;
}

const PLACES: Thing[] = [
  // ── Knysna — home ──────────────────────────────────────────────────────────
  {
    title: 'The Heads at golden hour',
    town: 'Knysna',
    kind: 'views',
    blurb:
      'Two sandstone cliffs with the whole lagoon pouring out between them. Drive up to the Eastern Head viewpoint about an hour before sunset and just stand there.',
    tip: 'Windy up top, even in summer. Take the jersey.',
  },
  {
    title: 'The big tree at Diepwalle',
    town: 'Knysna',
    kind: 'forest',
    blurb:
      'An Outeniqua yellowwood that was already old when the first ships came past. The forest around it is the real thing: ferns, moss, loeries calling, and very little signal.',
    tip: 'Go on a misty morning. The forest is better wet.',
  },
  {
    title: 'Jubilee Creek',
    town: 'Knysna',
    kind: 'forest',
    blurb:
      'A short, flat walk along a stream into the old Millwood gold diggings, ending at a pool under the trees. The gentlest way into the deep forest.',
    tip: 'Pack lunch and stay longer than you planned.',
  },
  {
    title: 'The lagoon by paddle',
    town: 'Knysna',
    kind: 'water',
    blurb:
      'Flat water, a rising tide and a kayak or a paddleboard. The lagoon looks completely different from the middle of it, and the town goes quiet behind you.',
    tip: 'Mornings, before the wind gets up.',
  },
  {
    title: 'Oysters on the water',
    town: 'Knysna',
    kind: 'food',
    blurb:
      'Knysna is the oyster town. Sit down at the waterfront or on Thesen Island, ask for a dozen, and argue about wild versus cultivated like everybody else does.',
    tip: 'Midwinter is Oyster Festival season. Busy, loud and worth it.',
  },
  {
    title: 'Noetzie and its castles',
    town: 'Knysna',
    kind: 'views',
    blurb:
      'A steep walk down to a wild beach with stone castles built right on the sand. Nobody can quite explain them, which is most of the charm.',
    tip: 'It is a proper climb back up. Take water.',
  },
  {
    title: 'Buffalo Bay',
    town: 'Knysna',
    kind: 'water',
    blurb:
      'A long curve of beach west of town with a forgiving wave. This is where half the Garden Route learned to surf, and where the other half goes to watch.',
  },

  // ── Sedgefield ─────────────────────────────────────────────────────────────
  {
    title: 'Wild Oats on a Saturday',
    town: 'Sedgefield',
    kind: 'food',
    blurb:
      'The farmers’ market the whole coast drives to. Breakfast under the trees, real bread, growers who will talk your ear off about soil. Our kind of people.',
    tip: 'Saturday mornings only. Early is better.',
  },
  {
    title: 'Gericke’s Point at low tide',
    town: 'Sedgefield',
    kind: 'water',
    blurb:
      'A fossil dune running out into the sea, with rock pools you could lose an afternoon in. Starfish, anemones, octopus if you are patient.',
    tip: 'Check a tide table first. This one only works at low.',
  },
  {
    title: 'Go paragliding',
    town: 'Sedgefield',
    kind: 'big',
    blurb:
      'The dunes between Sedgefield and Wilderness are some of the best tandem paragliding in the country. Twenty quiet minutes above the lakes and the surf.',
    tip: 'One to do with a clear head.',
  },

  // ── Wilderness ─────────────────────────────────────────────────────────────
  {
    title: 'Map of Africa',
    town: 'Wilderness',
    kind: 'views',
    blurb:
      'From the hilltop above the village, the Kaaimans River bends itself into the shape of the continent. Turn around and you have the whole coastline as well.',
  },
  {
    title: 'Half-collared Kingfisher Trail',
    town: 'Wilderness',
    kind: 'forest',
    blurb:
      'Boardwalk through riverine forest, a pontoon you pull yourself across on, and a waterfall at the end with a pool cold enough to wake you up.',
    tip: 'Give it half a day. Swim at the top.',
  },
  {
    title: 'Canoe the Touw River',
    town: 'Wilderness',
    kind: 'water',
    blurb:
      'Tea-coloured water, overhanging trees and no current to speak of. You paddle until the river gets too narrow, then you walk the rest.',
  },

  // ── George ─────────────────────────────────────────────────────────────────
  {
    title: 'Montagu Pass',
    town: 'George',
    kind: 'views',
    blurb:
      'The old gravel road over the Outeniquas, built by hand in the 1840s and hardly changed since. Fynbos, stone walls and the coast dropping away behind you.',
    tip: 'Slowly, and with a sober driver. Always.',
  },
  {
    title: 'Victoria Bay',
    town: 'George',
    kind: 'water',
    blurb:
      'A tiny cove with a row of cottages, a tidal pool and one of the most reliable right-hand waves on the coast. Small enough to feel like a secret.',
  },
  {
    title: 'The transport museum',
    town: 'George',
    kind: 'rain',
    blurb:
      'A shed full of steam locomotives and old carriages. Sounds dull, is not. The right answer to a wet Tuesday.',
  },

  // ── Mossel Bay ─────────────────────────────────────────────────────────────
  {
    title: 'St Blaize Trail',
    town: 'Mossel Bay',
    kind: 'views',
    blurb:
      'A clifftop path west from the lighthouse, with the Indian Ocean on one side the whole way. Dolphins most days, whales in season.',
  },
  {
    title: 'Pinnacle Point caves',
    town: 'Mossel Bay',
    kind: 'rain',
    blurb:
      'Sea caves where people were living, cooking shellfish and making tools well over a hundred thousand years ago. A guided visit, and a humbling one.',
    tip: 'Guided only, so book ahead.',
  },

  // ── Plettenberg Bay ────────────────────────────────────────────────────────
  {
    title: 'Robberg',
    town: 'Plettenberg Bay',
    kind: 'big',
    blurb:
      'A peninsula hike with a seal colony below you, a dune to run down and a beach in the middle. The best half-day walk on the Garden Route. We will fight about it.',
    tip: 'Start early and carry more water than seems sensible.',
  },
  {
    title: 'Up the Keurbooms River',
    town: 'Plettenberg Bay',
    kind: 'water',
    blurb:
      'Paddle upstream into a forested gorge until the houses stop and the kingfishers start. Sandy banks to pull up on along the way.',
  },
  {
    title: 'Birds of Eden',
    town: 'Plettenberg Bay',
    kind: 'rain',
    blurb:
      'An enormous free-flight aviary over a forested valley at The Crags. You walk the boardwalks and the birds get on with it around you.',
  },

  // ── Tsitsikamma ────────────────────────────────────────────────────────────
  {
    title: 'Storms River Mouth',
    town: 'Tsitsikamma',
    kind: 'views',
    blurb:
      'Suspension bridges strung across a river mouth where the forest runs straight into the sea. A short walk from the car, and it still feels like the edge of the world.',
  },
  {
    title: 'Nature’s Valley',
    town: 'Tsitsikamma',
    kind: 'water',
    blurb:
      'A lagoon, a long empty beach and a village with one of everything, at the bottom of a forest pass. Where the Otter Trail hikers come out blinking.',
  },
  {
    title: 'Bloukrans Bridge',
    town: 'Tsitsikamma',
    kind: 'big',
    blurb:
      '216 metres of air under the highest commercial bridge bungee in the world. You can also just walk out under the arch and watch other people do it.',
    tip: 'Another one for a clear head.',
  },
];

/** West to east, the way the route rail reads. Array.sort is stable, so each
    town keeps its own written order. */
export const THINGS: Thing[] = [...PLACES].sort(
  (a, b) => TOWNS.indexOf(a.town) - TOWNS.indexOf(b.town),
);

/**
 * The year on this coast. Seasons and long-running fixtures only — never a
 * specific date, because nobody will remember to update one.
 */
export const CALENDAR: { when: string; what: string; note: string }[] = [
  {
    when: '20 April',
    what: 'Four-twenty',
    note: 'The one date on the calendar that is ours. Marked at home, among friends.',
  },
  {
    when: 'Autumn',
    what: 'Simola Hillclimb',
    note: 'Knysna fills up with fast cars for a weekend. Book a bed early.',
  },
  {
    when: 'Midwinter',
    what: 'Knysna Oyster Festival',
    note: 'Ten days of oysters, running, cycling and not much sleep.',
  },
  {
    when: 'June to November',
    what: 'Whale season',
    note: 'Southern rights come in close to calve. Any headland will do.',
  },
];

/**
 * The law, in plain words.
 *
 * ⚠️ NOT ATTORNEY-REVIEWED. This is a summary of the Constitutional Court's
 * 2018 Prince judgment as generally reported. It deliberately states NO
 * quantities and NO detail of the Cannabis for Private Purposes Act, whose
 * commencement and regulations are still moving. Get it checked before launch,
 * the same as the footer line.
 */
export const LAW: { verdict: 'yes' | 'no'; title: string; body: string }[] = [
  {
    verdict: 'yes',
    title: 'At home, as an adult',
    body: 'Since the Constitutional Court’s 2018 ruling, adults in South Africa may use, keep and grow cannabis in private. Private means a private space, with the consent of whoever it belongs to.',
  },
  {
    verdict: 'no',
    title: 'In public',
    body: 'Not on the beach, not in the forest, not in the car park, not at the festival. Every place in the guide above is a public place. Keep the two separate.',
  },
  {
    verdict: 'no',
    title: 'Behind the wheel',
    body: 'Driving high is illegal and, on these passes, stupid. Someone stays sober or nobody drives.',
  },
  {
    verdict: 'no',
    title: 'Around children',
    body: 'Adults only, and never around anyone who isn’t. No exceptions and no debate.',
  },
];

/** The words you will hear. Culture, not catalogue. */
export const GLOSSARY: { word: string; meaning: string }[] = [
  { word: 'Dagga', meaning: 'What South Africa has called cannabis for centuries. From a Khoi word, and still the one the older laws use.' },
  { word: 'Zol', meaning: 'A joint. The word your uncle uses.' },
  { word: 'Skyf', meaning: 'A smoke, or a drag of one. “Gee ’n skyf” means pass it here.' },
  { word: 'Entjie', meaning: 'A small one. Afrikaans for a cigarette, borrowed for everything else.' },
  { word: 'Boom', meaning: 'Tree. The plant itself.' },
  { word: 'Roach', meaning: 'The end of a joint that has been around the whole circle. Where we got the name.' },
];

/** How a circle behaves. */
export const ETIQUETTE: { rule: string; why: string }[] = [
  { rule: 'Pass it on', why: 'It is in the name. Nobody holds the conversation hostage.' },
  { rule: 'Ask before you light', why: 'Someone’s home is someone’s home. So is a guest house. Ask your host before you book, not after.' },
  { rule: 'Know what you’re smoking', why: 'Where it grew, what went on it. If nobody can tell you, that is your answer.' },
  { rule: 'Leave nothing behind', why: 'Not a filter, not a paper, not a roach. This forest is older than all of us.' },
];
