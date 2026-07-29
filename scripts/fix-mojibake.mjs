/**
 * One-shot repair for UTF-8 double-encoding introduced by a PowerShell
 * Get-Content/Set-Content round-trip (it read UTF-8 as CP1252 and re-encoded).
 * Safe to run repeatedly — the mojibake sequences cannot occur in clean source.
 */
import { readFileSync, writeFileSync } from 'node:fs';

const p = 'src/components/ShopChoice.tsx';
let t = readFileSync(p, 'utf8');

// Longest sequences first, so 'â€”' is consumed before any bare 'â€'.
const fixes = [
  ['â€”', '—'], // —
  ['â€™', '’'], // ’
  ['â€œ', '“'], // “
  ['â€', '”'], // ”
  ['â”€', '─'], // ─ (box-drawing in comments)
  ['Â·', '·'],       // ·
  ['Â°', '°'],       // °
  ['â‰ˆ', '≈'], // ≈
];

let n = 0;
for (const [bad, good] of fixes) {
  const c = t.split(bad).length - 1;
  n += c;
  t = t.split(bad).join(good);
}
writeFileSync(p, t, 'utf8');
console.log('repaired', n, 'mojibake sequences');

const leftovers = (t.match(/[âÂ]/g) || []).length;
console.log('remaining suspicious lead bytes:', leftovers);
