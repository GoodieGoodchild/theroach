/**
 * Print where the bright (glass) region starts/ends along sampled columns and
 * rows, as % of the image. Use this when a frame is dark-on-dark and the
 * automatic quad fit has too few inliers to trust.
 *
 * Usage: node scripts/probe-edges.mjs <src> [threshold] [runLength]
 */
import sharp from 'sharp';

const file = process.argv[2];
const T = Number(process.argv[3] ?? 35);
// Require a RUN of bright pixels, so a single stray highlight (a lamp, a
// reflection on the pavement) cannot masquerade as the frame edge.
const RUN = Number(process.argv[4] ?? 6);

const { data, info } = await sharp(file).removeAlpha().greyscale().raw().toBuffer({ resolveWithObject: true });
const W = info.width, H = info.height;
const at = (x, y) => data[y * W + x];

const scanCol = (x, dir) => {
  const from = dir > 0 ? 0 : H - 1;
  const to = dir > 0 ? H : -1;
  let run = 0;
  for (let y = from; y !== to; y += dir) {
    if (at(x, y) > T) { run++; if (run >= RUN) return y - dir * (RUN - 1); } else run = 0;
  }
  return -1;
};
const scanRow = (y, dir) => {
  const from = dir > 0 ? 0 : W - 1;
  const to = dir > 0 ? W : -1;
  let run = 0;
  for (let x = from; x !== to; x += dir) {
    if (at(x, y) > T) { run++; if (run >= RUN) return x - dir * (RUN - 1); } else run = 0;
  }
  return -1;
};

const pc = (v, d) => ((100 * v) / d).toFixed(1);
console.log(`${file} ${W}x${H}  threshold ${T}, run ${RUN}\n`);

console.log('col%   topEdge%  bottomEdge%');
for (let i = 5; i <= 95; i += 10) {
  const x = Math.round((i / 100) * W);
  console.log(`${String(i).padStart(3)}    ${String(pc(scanCol(x, 1), H)).padStart(6)}    ${String(pc(scanCol(x, -1), H)).padStart(6)}`);
}

console.log('\nrow%   leftEdge%  rightEdge%');
for (let i = 5; i <= 95; i += 10) {
  const y = Math.round((i / 100) * H);
  console.log(`${String(i).padStart(3)}    ${String(pc(scanRow(y, 1), W)).padStart(6)}     ${String(pc(scanRow(y, -1), W)).padStart(6)}`);
}
