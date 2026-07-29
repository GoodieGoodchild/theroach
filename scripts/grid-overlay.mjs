/**
 * Draw a labelled 5% grid over an image so frame corners can be read off
 * visually, brightened so dark frames are visible.
 * Usage: node scripts/grid-overlay.mjs <image> <out.png>
 */
import sharp from 'sharp';

const [file, out] = process.argv.slice(2);
// Downscale FIRST, then grid the small image — compositing a full-size SVG onto
// a multi-thousand-pixel source trips sharp's dimension checks on some inputs.
const base = await sharp(file).resize({ width: 1000, withoutEnlargement: true }).toBuffer();
const meta = await sharp(base).metadata();
const W = meta.width, H = meta.height;

const lines = [];
for (let i = 5; i < 100; i += 5) {
  const x = (i / 100) * W, y = (i / 100) * H;
  const major = i % 25 === 0;
  const c = major ? '#ff4040' : 'rgba(255,255,0,0.5)';
  const w = major ? 3 : 1;
  lines.push(`<line x1="${x}" y1="0" x2="${x}" y2="${H}" stroke="${c}" stroke-width="${w}"/>`);
  lines.push(`<line x1="0" y1="${y}" x2="${W}" y2="${y}" stroke="${c}" stroke-width="${w}"/>`);
  lines.push(`<text x="${x + 4}" y="26" fill="#fff" font-size="${Math.round(W / 55)}" font-family="monospace">${i}</text>`);
  lines.push(`<text x="6" y="${y - 5}" fill="#fff" font-size="${Math.round(W / 55)}" font-family="monospace">${i}</text>`);
}
const svg = Buffer.from(`<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">${lines.join('')}</svg>`);

await sharp(base)
  .modulate({ brightness: 2.2 })
  .composite([{ input: svg }])
  .png()
  .toFile(out);
console.log('grid ->', out, `(${W}x${H})`);
