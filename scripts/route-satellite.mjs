/**
 * The Garden Route from above — Mossel Bay to Tsitsikamma.
 *
 * `npm run satellite` → public/img/route-{1400,2200,3000}.webp, plus a
 * close-up of each guide place that has no photo (public/img/guide/*-above),
 * listed in src/lib/guide-aerials.ts.
 *
 * SOURCE AND LICENCE. Copernicus Sentinel-2 Level-2A, a single cloud-free pass
 * (DATE below), read through Microsoft Planetary Computer's public mosaic API.
 * Copernicus Sentinel data is free for any use, commercial included, on the one
 * condition that it is credited — the line on the page must read
 * "Contains modified Copernicus Sentinel data <year>". See CREDIT in
 * src/lib/guide.ts, which must stay in step with DATE here.
 *
 * Deliberately NOT EOX "Sentinel-2 cloudless", which looks smoother but needs a
 * paid licence for commercial use.
 *
 * WHY ONE DATE, NOT A COMPOSITE. Every tile from 34HEH (Mossel Bay) to 35HKC
 * (Tsitsikamma) reported 0% cloud on 3 May 2026, so a single pass gives one
 * consistent light across the whole strip. It is a real photograph of one
 * afternoon. There is a single wisp of cloud over the forest north of Knysna —
 * left in, not retouched.
 *
 * Only re-run if the date changes. The output is committed; nothing here runs
 * at build time.
 */
import sharp from 'sharp';
import { writeFile } from 'node:fs/promises';

const DATE = '2026-05-03';
/** [west, south, east, north] — must match ROUTE_BBOX in src/lib/guide.ts. */
const BBOX = [22.05, -34.25, 24.0, -33.8];
const Z = 11; // with @2x tiles: ~38 m per pixel at this latitude
const WIDTHS = [1400, 2200, 3000];
const API = 'https://planetarycomputer.microsoft.com/api/data/v1';

/**
 * Guide places with no acceptable photo on Commons (see guide-photos.mjs) get
 * the same pass, cropped close around the spot: [longitude, latitude] of the
 * place, keyed by its card title in src/lib/guide.ts. Each crop is ~16 km wide.
 */
const ABOVE = {
  'Pinnacle Point caves': [22.1, -34.195],
  'Wild Oats on a Saturday': [22.8, -34.012],
  'Gericke’s Point at low tide': [22.757, -34.03],
  'The big tree at Diepwalle': [23.2, -33.955], // nudged east, clear of the one cloud
  'Noetzie and its castles': [23.128, -34.077],
  'Up the Keurbooms River': [23.37, -34.0],
};

const reg = await fetch(`${API}/mosaic/register`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({
    collections: ['sentinel-2-l2a'],
    bbox: BBOX,
    'filter-lang': 'cql2-json',
    filter: {
      op: 'anyinteracts',
      args: [{ property: 'datetime' }, { interval: [`${DATE}T00:00:00Z`, `${DATE}T23:59:59Z`] }],
    },
  }),
}).then((r) => r.json());
if (!reg.searchid) throw new Error(`mosaic register failed: ${JSON.stringify(reg)}`);

const n = 2 ** Z;
const tx = (lon) => ((lon + 180) / 360) * n;
const ty = (lat) => {
  const r = (lat * Math.PI) / 180;
  return ((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * n;
};
const x0 = Math.floor(tx(BBOX[0]));
const x1 = Math.floor(tx(BBOX[2]));
const y0 = Math.floor(ty(BBOX[3]));
const y1 = Math.floor(ty(BBOX[1]));

const jobs = [];
for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) jobs.push({ x, y });
console.log(`Sentinel-2 ${DATE}: ${jobs.length} tiles at z${Z}`);

const tiles = [];
let next = 0;
async function worker() {
  while (next < jobs.length) {
    const { x, y } = jobs[next++];
    const url = `${API}/mosaic/${reg.searchid}/tiles/WebMercatorQuad/${Z}/${x}/${y}@2x.png?collection=sentinel-2-l2a&assets=visual`;
    for (let attempt = 1; ; attempt++) {
      const r = await fetch(url);
      if (r.ok) {
        tiles.push({ input: Buffer.from(await r.arrayBuffer()), left: (x - x0) * 512, top: (y - y0) * 512 });
        break;
      }
      if (attempt === 4) throw new Error(`tile ${x}/${y}: HTTP ${r.status}`);
      await new Promise((s) => setTimeout(s, 1500 * attempt));
    }
  }
}
await Promise.all(Array.from({ length: 6 }, worker));

const canvas = await sharp({
  create: { width: (x1 - x0 + 1) * 512, height: (y1 - y0 + 1) * 512, channels: 3, background: '#000' },
})
  .composite(tiles)
  .png()
  .toBuffer();

// Crop to the exact bbox, so the town pins in guide.ts land where they should.
const left = Math.round((tx(BBOX[0]) - x0) * 512);
const top = Math.round((ty(BBOX[3]) - y0) * 512);
const width = Math.round((tx(BBOX[2]) - x0) * 512) - left;
const height = Math.round((ty(BBOX[1]) - y0) * 512) - top;
const strip = await sharp(canvas).extract({ left, top, width, height }).toBuffer();

const lift = (img) => img.modulate({ brightness: 1.18, saturation: 1.08 });

// Close-ups: 480×320 source pixels around each place (the strip is ~34 m/px).
const slug = (t) => t.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const aerials = {};
for (const [place, [lon, lat]] of Object.entries(ABOVE)) {
  const cx = Math.round((tx(lon) - x0) * 512) - left;
  const cy = Math.round((ty(lat) - y0) * 512) - top;
  const box = {
    left: Math.max(0, Math.min(width - 480, cx - 240)),
    top: Math.max(0, Math.min(height - 320, cy - 160)),
    width: 480,
    height: 320,
  };
  const name = `${slug(place)}-above`;
  for (const w of [640, 1000]) {
    await lift(sharp(strip).extract(box).resize(w))
      .webp({ quality: 74, effort: 6 })
      .toFile(`public/img/guide/${name}-${w}.webp`);
  }
  aerials[place] = `/img/guide/${name}`;
}
await writeFile(
  'src/lib/guide-aerials.ts',
  `// Generated by scripts/route-satellite.mjs — do not edit by hand.
` +
    `// Close-ups from the same Sentinel-2 pass as the route strip; same credit (ROUTE in guide.ts).

` +
    `export const AERIALS: Record<string, string> = ${JSON.stringify(aerials, null, 2)};
`,
);
console.log(`${Object.keys(aerials).length} close-ups → public/img/guide/*-above`);

for (const w of WIDTHS) {
  const out = `public/img/route-${w}.webp`;
  // A gentle lift only: the raw true-colour render is very dark on screen.
  // Nothing is added, removed or recoloured.
  const info = await lift(sharp(strip).resize(w))
    .webp({ quality: 74, effort: 6 })
    .toFile(out);
  console.log(`${out}  ${info.width}x${info.height}  ${Math.round(info.size / 1024)}KB`);
}
