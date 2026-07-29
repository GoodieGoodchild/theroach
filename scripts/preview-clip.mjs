/**
 * Crop a window render and paint everything OUTSIDE the clip quad translucent
 * red — makes any sliver of out-of-frame scene, or any over-cut into the frame,
 * immediately visible. The polygon is a % quad exactly as it will appear in the
 * component's clip-path.
 *
 * Usage: node scripts/preview-clip.mjs <src> <left,top,w,h> <x1,y1,x2,y2,x3,y3,x4,y4(%)> <out>
 */
import sharp from 'sharp';

const [src, rectArg, quadArg, out] = process.argv.slice(2);
const [left, top, width, height] = rectArg.split(',').map(Number);
const q = quadArg.split(',').map(Number);

// Downscale BEFORE compositing — sharp rejects SVG overlays on large bases.
const PREVIEW_W = 760;
const scale = Math.min(1, PREVIEW_W / width);
const pw = Math.round(width * scale);
const ph = Math.round(height * scale);

const cropped = await sharp(src)
  .extract({ left, top, width, height })
  .resize({ width: pw })
  .toBuffer();

const pts = [];
for (let i = 0; i < 8; i += 2) pts.push(`${(q[i] / 100) * pw},${(q[i + 1] / 100) * ph}`);

const svg = Buffer.from(
  `<svg width="${pw}" height="${ph}" xmlns="http://www.w3.org/2000/svg">` +
    `<path d="M0 0H${pw}V${ph}H0Z M${pts.join(' L')} Z" fill="rgba(255,0,64,0.55)" fill-rule="evenodd"/>` +
    `<polygon points="${pts.join(' ')}" fill="none" stroke="#00ff88" stroke-width="2"/>` +
    `</svg>`,
);

await sharp(cropped).modulate({ brightness: 1.8 }).composite([{ input: svg }]).png().toFile(out);
console.log('preview ->', out, `(${pw}x${ph})`);
