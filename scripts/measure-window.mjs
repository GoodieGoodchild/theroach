/**
 * Measure a storefront render: content bounding box (for the crop rect) and the
 * window frame's trapezoid (for the CSS clip-path), by least-squares fitting
 * the four lit edges and intersecting them.
 *
 * Usage: node scripts/measure-window.mjs <image> [threshold]
 */
import sharp from 'sharp';

const file = process.argv[2];
const T = Number(process.argv[3] ?? 20);

const { data, info } = await sharp(file).removeAlpha().greyscale().raw().toBuffer({ resolveWithObject: true });
const W = info.width, H = info.height;

// content bbox
let bx0 = W, bx1 = 0, by0 = H, by1 = 0;
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  if (data[y * W + x] > T) { if (x < bx0) bx0 = x; if (x > bx1) bx1 = x; if (y < by0) by0 = y; if (y > by1) by1 = y; }
}
console.log(`source ${W}x${H}  bbox x ${bx0}-${bx1}  y ${by0}-${by1}  (${bx1 - bx0 + 1}x${by1 - by0 + 1})`);

// per-row / per-column lit extremes WITHIN the bbox
const xl = [], xr = [], yt = [], yb = [];
for (let y = by0; y <= by1; y++) { let a = -1, b = -1; for (let x = bx0; x <= bx1; x++) { if (data[y * W + x] > T) { if (a < 0) a = x; b = x; } } xl.push(a); xr.push(b); }
for (let x = bx0; x <= bx1; x++) { let a = -1, b = -1; for (let y = by0; y <= by1; y++) { if (data[y * W + x] > T) { if (a < 0) a = y; b = y; } } yt.push(a); yb.push(b); }

const fit = (arr) => {
  const pts = [];
  const n = arr.length;
  for (let i = Math.floor(n * 0.2); i < Math.floor(n * 0.8); i++) if (arr[i] >= 0) pts.push([i, arr[i]]);
  let sx = 0, sy = 0, sxy = 0, sxx = 0; const N = pts.length;
  for (const [u, v] of pts) { sx += u; sy += v; sxy += u * v; sxx += u * u; }
  const m = (N * sxy - sx * sy) / (N * sxx - sx * sx);
  return [m, (sy - m * sx) / N];
};

const [ml, cl] = fit(xl), [mr, cr] = fit(xr), [mt, ct] = fit(yt), [mb, cb] = fit(yb);
// intersect edge x(y-rel) with edge y(x-rel); indices are bbox-relative
const ix = (me, ce, mo, co) => {
  const y = (mo * ce + co) / (1 - mo * me);
  return [me * y + ce, y];
};
const TL = ix(ml, cl, mt, ct), BL = ix(ml, cl, mb, cb), TR = ix(mr, cr, mt, ct), BR = ix(mr, cr, mb, cb);

const cw = bx1 - bx0 + 1, ch = by1 - by0 + 1;
const pc = ([x, y]) => `${((100 * x) / cw).toFixed(2)}% ${((100 * y) / ch).toFixed(2)}%`;
console.log(`quad (as % of the bbox crop):`);
console.log(`  TL ${pc(TL)}   TR ${pc(TR)}`);
console.log(`  BL ${pc(BL)}   BR ${pc(BR)}`);
console.log(`crop rect: left=${bx0}, top=${by0}, width=${cw}, height=${ch}`);
