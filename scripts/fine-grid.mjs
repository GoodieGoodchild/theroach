/**
 * Bright 2%-grid overlay for reading window-frame corners off a dark render.
 * Usage: node scripts/fine-grid.mjs <src> <out> [brightness] [width]
 */
import sharp from 'sharp';

const [src, out, brightArg, widthArg] = process.argv.slice(2);
const brightness = Number(brightArg ?? 3.0);
const targetW = Number(widthArg ?? 900);

const base = await sharp(src)
  .resize({ width: targetW, withoutEnlargement: true })
  .modulate({ brightness })
  .toBuffer();
const { width: W, height: H } = await sharp(base).metadata();

const parts = [];
for (let i = 2; i < 100; i += 2) {
  const x = (i / 100) * W;
  const y = (i / 100) * H;
  const major = i % 10 === 0;
  const stroke = major ? '#ff2020' : 'rgba(0,255,255,0.45)';
  const w = major ? 2 : 1;
  parts.push(`<line x1="${x}" y1="0" x2="${x}" y2="${H}" stroke="${stroke}" stroke-width="${w}"/>`);
  parts.push(`<line x1="0" y1="${y}" x2="${W}" y2="${y}" stroke="${stroke}" stroke-width="${w}"/>`);
  if (major) {
    parts.push(`<text x="${x + 3}" y="22" fill="#fff" font-size="17" font-family="monospace">${i}</text>`);
    parts.push(`<text x="4" y="${y - 4}" fill="#fff" font-size="17" font-family="monospace">${i}</text>`);
  }
}

await sharp(base)
  .composite([
    { input: Buffer.from(`<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">${parts.join('')}</svg>`) },
  ])
  .png()
  .toFile(out);
console.log('grid ->', out, `(${W}x${H})`);
