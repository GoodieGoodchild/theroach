/**
 * SEO audit of the built static export.
 *
 * Run after `npm run build`: `node scripts/seo-audit.mjs`
 * Reports the things that actually decide whether this page can rank — indexable
 * word count, heading structure, local signals, schema, and internal linking —
 * rather than a checklist of tags.
 */
import { readFileSync, existsSync } from 'node:fs';

const FILE = 'out/index.html';
if (!existsSync(FILE)) {
  console.error('No build found. Run `npm run build` first.');
  process.exit(1);
}
const html = readFileSync(FILE, 'utf8');

const text = html
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&[a-z#0-9]+;/gi, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const words = text.split(' ').filter((w) => /[a-z]/i.test(w));
const title = (/<title>(.*?)<\/title>/.exec(html) || [])[1] || '';
const desc = (/name="description" content="(.*?)"/.exec(html) || [])[1] || '';

const line = (k, v) => console.log(String(k).padEnd(24), v);

console.log('\n─── INDEXABLE CONTENT ───');
line('words on page', words.length + (words.length < 600 ? '   ⚠ thin — under ~600 struggles to rank' : ''));
line('title', title);
line('title length', title.length + (title.length > 60 ? '  ⚠ over 60, will truncate' : ''));
line('description length', desc.length + (desc.length < 120 || desc.length > 165 ? '  ⚠ aim 140–160' : ''));

console.log('\n─── HEADINGS ───');
const heads = [...html.matchAll(/<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi)].map((m) => ({
  level: +m[1],
  text: m[2].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim(),
}));
heads.forEach((h) => console.log('  h' + h.level, '·', h.text.slice(0, 64)));
const h1s = heads.filter((h) => h.level === 1);
line('h1 count', h1s.length + (h1s.length === 1 ? '' : '  ⚠ want exactly 1'));

console.log('\n─── LOCAL / TOPICAL SIGNALS ───');
for (const t of ['Knysna', 'Garden Route', 'Western Cape', 'South Africa', 'cannabis', 'weed', 'dagga', 'collective']) {
  const n = (text.match(new RegExp(t, 'gi')) || []).length;
  console.log('  ' + t.padEnd(16), n + (n === 0 ? '   ← absent' : ''));
}

console.log('\n─── STRUCTURED DATA ───');
const ld = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
if (!ld.length) console.log('  none');
ld.forEach((m) => {
  try {
    const o = JSON.parse(m[1]);
    console.log('  @type:', o['@type'], '| fields:', Object.keys(o).filter((k) => k[0] !== '@').join(', '));
  } catch {
    console.log('  ⚠ invalid JSON-LD');
  }
});

console.log('\n─── LINKS ───');
const links = [...html.matchAll(/<a [^>]*href="([^"]+)"/g)].map((m) => m[1]);
const internal = links.filter((l) => l.startsWith('/') || l.includes('theroach.co.za'));
line('internal links', internal.length + (internal.length === 0 ? '   ⚠ no internal linking — nothing to crawl' : ''));
line('external links', links.filter((l) => /^https?:/.test(l) && !l.includes('theroach.co.za')).length);
links.forEach((l) => console.log('   ', l.slice(0, 70)));

console.log('\n─── CRAWL DIRECTIVES ───');
line('robots meta', (/name="robots" content="(.*?)"/.exec(html) || [])[1] || '(none — defaults to index)');
line('canonical', (/rel="canonical" href="(.*?)"/.exec(html) || [])[1] || '⚠ missing');
line('og:image', (/property="og:image" content="(.*?)"/.exec(html) || [])[1] || '⚠ missing');
line('html lang', (/<html[^>]*lang="(.*?)"/.exec(html) || [])[1] || '⚠ missing');

console.log('\n─── PAGES ───');
line('routes in export', 'see out/ — a single route caps how many queries you can target\n');
