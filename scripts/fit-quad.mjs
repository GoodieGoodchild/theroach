/**
 * Fit the window-frame quad on a FINAL cropped asset (clean, near-black
 * surround). Robust: samples edge positions in bands away from the corners,
 * least-squares fits each edge, rejects >3px outliers, refits, intersects.
 *
 * Usage: node scripts/fit-quad.mjs <image> [threshold]
 */
import sharp from 'sharp';

const file = process.argv[2];
const T = Number(process.argv[3] ?? 12);

const { data, info } = await sharp(file).removeAlpha().greyscale().raw().toBuffer({ resolveWithObject: true });
const W = info.width, H = info.height;
const lum = (x, y) => data[y * W + x];

const firstX = (y) => { for (let x = 0; x < W; x++) if (lum(x, y) > T) return x; return -1; };
const lastX = (y) => { for (let x = W - 1; x >= 0; x--) if (lum(x, y) > T) return x; return -1; };
const firstY = (x) => { for (let y = 0; y < H; y++) if (lum(x, y) > T) return y; return -1; };
const lastY = (x) => { for (let y = H - 1; y >= 0; y--) if (lum(x, y) > T) return y; return -1; };

const sample = (fn, from, to, n) => {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const idx = Math.round(from + ((to - from) * i) / n);
    const v = fn(idx);
    if (v >= 0) pts.push([idx, v]);
  }
  return pts;
};

const fitLine = (pts) => {
  const go = (P) => {
    let sx = 0, sy = 0, sxy = 0, sxx = 0;
    for (const [u, v] of P) { sx += u; sy += v; sxy += u * v; sxx += u * u; }
    const N = P.length;
    const m = (N * sxy - sx * sy) / (N * sxx - sx * sx);
    return [m, (sy - m * sx) / N];
  };
  let [m, c] = go(pts);
  const inliers = pts.filter(([u, v]) => Math.abs(m * u + c - v) <= 3);
  if (inliers.length >= 5) [m, c] = go(inliers);
  return [m, c, inliers.length, pts.length];
};

// Edge bands chosen to stay away from corners.
const L = fitLine(sample(firstX, H * 0.25, H * 0.75, 40)); // x = m*y + c
const R = fitLine(sample(lastX, H * 0.25, H * 0.75, 40));
const Tp = fitLine(sample(firstY, W * 0.15, W * 0.85, 40)); // y = m*x + c
const B = fitLine(sample(lastY, W * 0.15, W * 0.85, 40));

const ix = ([me, ce], [mo, co]) => {
  const y = (mo * ce + co) / (1 - mo * me);
  return [me * y + ce, y];
};
const TL = ix(L, Tp), TR = ix(R, Tp), BR = ix(R, B), BL = ix(L, B);

const pc = ([x, y]) => `${((100 * x) / W).toFixed(1)},${((100 * y) / H).toFixed(1)}`;
console.log(`${file} ${W}x${H}  (inliers L${L[2]}/${L[3]} R${R[2]}/${R[3]} T${Tp[2]}/${Tp[3]} B${B[2]}/${B[3]})`);
console.log(`quad: ${pc(TL)},${pc(TR)},${pc(BR)},${pc(BL)}`);
