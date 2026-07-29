/**
 * Brand assets → transparent, responsive WebP.
 *
 * Sources are the client's ORIGINAL artwork in logoassets/ — never redrawn.
 *
 * CUTOUT: the source PNGs are gold artwork on a SOLID BLACK plate. Dropped onto
 * the page as-is they read as a pasted rectangle (the plate's #000 never quite
 * matches the page black, and the circular badge shows a hard square edge).
 * So we key the black out by deriving alpha from the brightest channel, then
 * UN-PREMULTIPLYING the colour (rgb / alpha). That matters: without the divide,
 * every pixel composites back darker than the original. With it, the art over
 * black is pixel-identical to the source, but the plate is gone and the glow
 * falls off softly instead of stopping at an edge.
 *
 * ⚠️ TheRoachPricing.png is the client's PRIVATE WhatsApp pricelist. It is not in
 * the allowlist below and must never be published. scripts/guard-pricing.mjs
 * enforces that at build time — this script's allowlist is only the first gate.
 *
 * Run: npm run images
 */
import sharp from 'sharp';
import { mkdir, stat } from 'node:fs/promises';
import { join } from 'node:path';

const SRC = 'logoassets';
const OUT = 'public/img';

/**
 * Only these are ever processed. Adding art here is a deliberate act.
 *
 * `trim` crops the transparent padding so the asset IS the artwork. The wordmark
 * is overlaid on the hero video at an exact height (it has to clear the burning
 * joint), and ~40% baked-in padding makes that placement guesswork.
 */
const MAP = [
  { file: 'TheRoachLogo3.png', name: 'rmark', widths: [480, 800] },
  { file: 'TheRoachWordMark.png', name: 'wordmark', widths: [640, 1100, 1600], trim: true },
  { file: 'TheRoachLogo2.png', name: 'lockup', widths: [640, 1080] },
  { file: 'TheroachLogo.png', name: 'badge', widths: [320, 640, 900] },
];

/**
 * Key the black plate to transparency, preserving appearance over black.
 * Returns a sharp instance carrying straight (un-premultiplied) RGBA.
 */
async function cutout(inPath) {
  const { data, info } = await sharp(inPath)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const px = info.width * info.height;
  const out = Buffer.allocUnsafe(px * 4);

  // FLOOR: pixels dimmer than this are plate noise (these sources carry codec
  // artefacts). Zero them outright — otherwise the un-premultiply below turns
  // rgb(2,0,1) into rgb(255,0,127) at alpha 2/255: invisible, but high-frequency
  // saturated noise that WebP cannot compress. Skipping this ballooned the
  // wordmark from 16KB to 677KB.
  const FLOOR = 12;
  // KNEE: cap the amplification. Dividing by a tiny alpha explodes chroma for no
  // visible gain, since the pixel is ~transparent anyway.
  const KNEE = 48;

  for (let i = 0, j = 0; j < out.length; i += 3, j += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    // Alpha from the dominant channel: gold/cream art survives, black plate dies.
    const a = r > g ? (r > b ? r : b) : g > b ? g : b;

    if (a < FLOOR) {
      out[j] = out[j + 1] = out[j + 2] = out[j + 3] = 0;
      continue;
    }

    // Un-premultiply so compositing over black reproduces the source.
    const k = 255 / (a < KNEE ? KNEE : a);
    out[j] = Math.min(255, Math.round(r * k));
    out[j + 1] = Math.min(255, Math.round(g * k));
    out[j + 2] = Math.min(255, Math.round(b * k));
    out[j + 3] = a;
  }

  return sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } });
}

await mkdir(OUT, { recursive: true });

for (const { file, name, widths, trim } of MAP) {
  const inPath = join(SRC, file);
  const meta = await sharp(inPath).metadata();
  const original = (await stat(inPath)).size;

  for (const w of widths) {
    let cut = await cutout(inPath);
    // Trim AFTER keying (the padding is only transparent once the plate is gone)
    // and BEFORE resizing, so the requested width describes the artwork itself.
    if (trim) cut = sharp(await cut.png().toBuffer()).trim({ threshold: 12 });
    await cut
      .resize({ width: w, withoutEnlargement: true })
      // alphaQuality high but not 100 — the glow falloff is the effect, yet 100
      // stores the alpha plane losslessly and costs far more than it's worth.
      .webp({ quality: 84, alphaQuality: 92, effort: 6 })
      .toFile(join(OUT, `${name}-${w}.webp`));
  }

  const biggest = (await stat(join(OUT, `${name}-${widths.at(-1)}.webp`))).size;
  console.log(
    `${file.padEnd(24)} ${String(meta.width).padStart(4)}x${String(meta.height).padEnd(5)} ` +
      `${(original / 1024).toFixed(0).padStart(5)}KB → ${(biggest / 1024).toFixed(0).padStart(4)}KB  [${widths.join(', ')}]`,
  );
}

// Favicon — keep the plate here: a transparent favicon vanishes on light chrome.
await sharp(join(SRC, 'TheroachLogo.png')).resize(512, 512).png().toFile('src/app/icon.png');
console.log('favicon  → src/app/icon.png');

/**
 * ── SHARE CARD (Open Graph / WhatsApp / LinkedIn / X) ────────────────────────
 *
 * JPEG, NOT WebP. This matters: WhatsApp — the client's main sharing channel —
 * does not reliably render WebP link previews, and nor do several other
 * platforms. A WebP og:image silently degrades to a bare text preview with no
 * picture, which is the opposite of the "professional looking link" this is for.
 * JPEG is understood everywhere. Do not "optimise" this back to WebP.
 *
 * Composition: the full lockup centred on black with generous margin rather
 * than filling the frame. Platforms crop this card to very different aspect
 * ratios — WhatsApp near-square, LinkedIn 1.91:1, X 2:1 — and a centred mark
 * with padding survives all of them. A horizontal layout loses the wordmark to
 * the first tight crop.
 *
 * Kept well under ~300KB, roughly where WhatsApp gives up fetching a preview.
 */
/**
 * ── SHOP STOREFRONTS ─────────────────────────────────────────────────────────
 *
 * One render contains BOTH windows side by side, so split it down the middle.
 * The signage and CTA are baked into the render (the original brief called for
 * empty sign boards with HTML neon on top, but this render has clean, legible
 * lettering — no AI garbling — so it is better used as-is than fought with).
 *
 * The "shop turns on" effect therefore comes from lighting the whole panel in
 * CSS rather than from overlaying text on text, which would double up the glow.
 */
const SHOP_SRC = join(SRC, 'The Roach Shop assets/uploads/storefronts.png');
try {
  const meta = await sharp(SHOP_SRC).metadata();
  const half = Math.floor(meta.width / 2);
  for (const [name, left] of [
    ['shop-left', 0],
    ['shop-right', half],
  ]) {
    for (const w of [640, 768]) {
      await sharp(SHOP_SRC)
        .extract({ left, top: 0, width: half, height: meta.height })
        .resize({ width: w, withoutEnlargement: true })
        .webp({ quality: 82, effort: 5 })
        .toFile(join(OUT, `${name}-${w}.webp`));
    }
    const sz = (await stat(join(OUT, `${name}-768.webp`))).size;
    console.log(`${name.padEnd(12)} ${half}x${meta.height} -> ${(sz / 1024).toFixed(0)}KB  [640, 768]`);
  }
} catch (e) {
  console.warn('  shop render not processed:', e.message);
}

const OG_W = 1200;
const OG_H = 630;
const OG_MARK = 500; // height of the ARTWORK itself, after trimming its padding

// Trim first. The source carries a lot of black padding, so resizing it whole
// leaves the mark looking lost in the frame — noticeably weak at the thumbnail
// size WhatsApp renders. Keying the black out lets us measure and place the
// artwork rather than the plate, then flatten straight back onto black.
const lockup = await sharp(
  await sharp(join(SRC, 'TheRoachLogo2.png')).ensureAlpha().toBuffer(),
)
  .trim({ threshold: 18 })
  .resize({ height: OG_MARK, fit: 'inside', withoutEnlargement: false })
  .toBuffer();

const lm = await sharp(lockup).metadata();
// Guard the square crop. WhatsApp often shows a centred square, so anything
// wider than OG_H would have its edges cut off.
if (lm.width > OG_H - 40) {
  console.warn(
    `  note: lockup is ${lm.width}px wide; a centred square crop shows only ${OG_H}px ` +
      '— reduce OG_MARK if the wordmark gets clipped.',
  );
}

await sharp({
  create: {
    width: OG_W,
    height: OG_H,
    channels: 3,
    // Pure black — the artwork's own plate is #000, so any other value draws a
    // visible rectangle around the logo in the preview.
    background: { r: 0, g: 0, b: 0 },
  },
})
  .composite([{ input: lockup, gravity: 'centre' }])
  .jpeg({ quality: 90, chromaSubsampling: '4:4:4', mozjpeg: true })
  .toFile(join(OUT, 'og.jpg'));

const ogSize = (await stat(join(OUT, 'og.jpg'))).size;
console.log(
  `share card -> public/img/og.jpg (${OG_W}x${OG_H}, ${(ogSize / 1024).toFixed(0)}KB)` +
    (ogSize > 300 * 1024 ? '   WARNING: over 300KB, WhatsApp may skip it' : ''),
);
