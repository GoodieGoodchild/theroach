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

// OG card — social platforms composite on white, so flatten onto our ink.
await sharp(join(SRC, 'TheRoachLogo2.png'))
  .resize({ width: 940, height: 630, fit: 'contain', background: '#000000' })
  .extend({ left: 130, right: 130, background: '#000000' })
  .flatten({ background: '#000000' }) // matches --color-ink exactly
  .webp({ quality: 88 })
  .toFile(join(OUT, 'og.webp'));
console.log('og card  → public/img/og.webp (1200x630)');
