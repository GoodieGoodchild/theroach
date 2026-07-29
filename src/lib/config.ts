/**
 * Single source of truth. One place to correct, everything flows.
 *
 * ⚠️ WHATSAPP NUMBER IS UNVERIFIED. It comes from the club's old CannaStaySA
 * directory listing, NOT from the client. It is the single most important value
 * in this file — every order conversation routes through it. CONFIRM WITH THE
 * CLIENT BEFORE LAUNCH, then change it here only.
 */
export const brand = {
  name: 'The Roach',
  strapline: 'Crafted for the Collective',

  /** Canonical host. The old indexed URLs were www — keep www to inherit them. */
  url: 'https://www.theroach.co.za',

  // ⚠️ UNVERIFIED — see header note.
  whatsapp: '27649288682',
  whatsappPrefill: 'Hey — I found The Roach.',

  /** Client-supplied. Lives on the domain, so it only works once mail is configured. */
  email: 'high@theroach.co.za',

  /**
   * The accessories store (glass, grinders, papers — paraphernalia, not cannabis).
   * EMPTY until it exists: /choice renders that door as "opening soon" rather
   * than a dead `#` link, so nobody clicks into nothing.
   */
  shopUrl: '',

  instagram: 'https://www.instagram.com/theroach710/',

  town: 'Knysna',
  region: 'Western Cape',

  minimumAge: 18,
} as const;

export const waLink = `https://wa.me/${brand.whatsapp}?text=${encodeURIComponent(
  brand.whatsappPrefill,
)}`;
