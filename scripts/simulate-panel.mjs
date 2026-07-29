/**
 * Render what the /choice panel actually displays for a window: the shipped
 * crop, with the component's clip polygon applied (area outside the quad
 * blacked, its edge drawn thin green), at idle brightness. If this looks tight
 * while a user's screenshot shows margins, the user is seeing stale content;
 * if this shows the same fault, the crop/clip is genuinely wrong.
 *
 * Usage: node scripts/simulate-panel.mjs <webp> <x1,y1,...,x4,y4(%)> <out> [brightness]
 */
import sharp from 'sharp';

const [src, quadArg, out, brightArg] = process.argv.slice(2);
const q = quadArg.split(',').map(Number);
const bright = Number(brightArg ?? 0.52);

const meta = await sharp(src).metadata();
const W = meta.width, H = meta.height;
const pts = [];
for (let i = 0; i < 8; i += 2) pts.push(`${(q[i] / 100) * W},${(q[i + 1] / 100) * H}`);

const mask = Buffer.from(
  `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">` +
    `<path d="M0 0H${W}V${H}H0Z M${pts.join(' L')} Z" fill="#000" fill-rule="evenodd"/>` +
    `<polygon points="${pts.join(' ')}" fill="none" stroke="#00ff66" stroke-width="1.5"/>` +
    `</svg>`,
);

await sharp(src)
  .modulate({ brightness: bright, saturation: 0.62 })
  .composite([{ input: mask }])
  .png()
  .toFile(out);
console.log('panel sim ->', out, `(${W}x${H}, brightness ${bright})`);
