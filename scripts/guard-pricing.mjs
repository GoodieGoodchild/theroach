/**
 * BUILD GUARD — the client's pricelist must never be published.
 *
 * Why this exists: an adversarial review found the earlier tripwire only checked
 * public/img, and only ran during `npm run images`. Nothing guarded the path that
 * actually publishes files. If anyone dropped TheRoachPricing.png into public/,
 * `next build` would copy it verbatim into out/ and it would go live at
 * https://www.theroach.co.za/TheRoachPricing.png.
 *
 * Publishing prices is the "advertise for sale" limb of the CfPPA's definition
 * of "deal in" — a 10-year offence on proclamation. Prices belong in a private
 * 1:1 WhatsApp chat; that separation is the whole compliance architecture here.
 *
 * Runs as prebuild AND postbuild, and checks git as well as the web root.
 * Fails loudly rather than shipping quietly.
 */
import { readdir, stat } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { join, basename } from 'node:path';

const ROOTS = ['public', 'out'];

/**
 * Restricted to MEDIA extensions on purpose.
 *
 * A bare /pricing/i also matches this very file (guard-pricing.mjs), and source
 * files named after the thing they guard are entirely legitimate. A check that
 * fires falsely on every build is worse than no check at all, because people
 * learn to ignore it — and this one would have blocked every build forever. The
 * asset being guarded is an image, so only media can trip it.
 */
const MEDIA = /\.(png|jpe?g|webp|gif|avif|bmp|tiff?|pdf|svg|heic)$/i;
const NAME = /pricing|pricelist|price[-_ ]?list|\bprices?\b/i;
const isForbidden = (file) => MEDIA.test(file) && NAME.test(file);

async function walk(dir, hits = []) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return hits; // dir absent (e.g. out/ before a first build) — nothing to check
  }
  for (const e of entries) {
    const full = join(dir, e.name);
    if (e.isDirectory()) await walk(full, hits);
    else if (isForbidden(e.name)) {
      const { size } = await stat(full);
      hits.push({ path: full, kb: Math.round(size / 1024) });
    }
  }
  return hits;
}

const hits = (await Promise.all(ROOTS.map((r) => walk(r)))).flat();

/**
 * Also check git. Committing is publishing — arguably worse than the web root,
 * because history is permanent and forks keep their own copy, so the mistake
 * cannot be undone by deleting the file. A .gitignore entry is a promise; this
 * is what makes it a guarantee.
 */
const tracked = [];
try {
  const out = execFileSync('git', ['ls-files'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  });
  for (const f of out.split('\n')) {
    if (f && isForbidden(basename(f))) tracked.push(f);
  }
} catch {
  // Not a git repo, or git unavailable — nothing to check.
}

if (hits.length > 0 || tracked.length > 0) {
  console.error('\n\x1b[41m\x1b[97m  BLOCKED - PRICELIST IN A PUBLISH PATH  \x1b[0m\n');
  for (const h of hits) console.error(`  x served publicly: ${h.path}  (${h.kb}KB)`);
  for (const t of tracked) console.error(`  x tracked by git:  ${t}`);
  console.error(
    '\n  The pricelist is private WhatsApp material and must never be published.\n' +
      '  Prices belong in a 1:1 chat, not on a website and not in a repo -\n' +
      '  the CfPPA folds "advertise for sale" into "deal in".\n' +
      (tracked.length
        ? '\n  To untrack without deleting your local copy:\n' +
          tracked.map((t) => `      git rm --cached "${t}"`).join('\n') +
          '\n  If it is already in a pushed commit, the history must be rewritten.\n'
        : '\n  Move it back to logoassets/ (never published) and rebuild.\n') +
      '\n  See README.md -> "Brand assets".\n',
  );
  process.exit(1);
}

console.log('OK pricing guard: clean (public/, out/, and git)');
