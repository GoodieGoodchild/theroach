import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import matter from 'gray-matter';
import { marked } from 'marked';

/**
 * The Daily Roach — the journal behind the writer's booth on /choice.
 *
 * Posts are MARKDOWN FILES with YAML frontmatter in content/blog/, one file per
 * post, and that format is a deliberate architectural decision: it is exactly
 * what a git-based CMS writes. Whatever editing tool the client ends up with
 * commits a .md file here, the server rebuilds, and this loader needs no
 * changes. The content store and the editing tool stay decoupled.
 *
 * Everything in this module runs AT BUILD TIME only (static export — there is
 * no Node at runtime), so fs access and synchronous parsing are fine, and a
 * malformed post fails the build rather than the page.
 *
 * Same law as the rest of the property: posts are commentary — culture, craft,
 * law, stories. No products, no prices, no "order here". The blog exists to
 * grow indexable surface the way the PotCast does (see src/lib/potcast.ts for
 * the full reasoning).
 *
 * ── FRONTMATTER ──────────────────────────────────────────────────────────────
 *   title:     required
 *   date:      required, ISO (2026-08-26)
 *   blurb:     required — meta description, keep under ~155 chars
 *   published: optional, default true — false hides a draft from the build
 *   image:     optional — path under /img/blog/, already shrunk by the
 *              media pipeline (never a raw upload)
 */

export interface Post {
  slug: string;
  title: string;
  date: string;
  blurb: string;
  image?: string;
  html: string;
}

const DIR = join(process.cwd(), 'content', 'blog');

export function publishedPosts(): Post[] {
  if (!existsSync(DIR)) return [];
  return readdirSync(DIR)
    .filter((f) => f.endsWith('.md'))
    .map((f) => {
      const { data, content } = matter(readFileSync(join(DIR, f), 'utf8'));
      for (const key of ['title', 'date', 'blurb'] as const) {
        // Fail the BUILD, loudly and by name — not the page, silently.
        if (!data[key]) throw new Error(`content/blog/${f}: missing "${key}" in frontmatter`);
      }
      return {
        slug: f.replace(/\.md$/, ''),
        title: String(data.title),
        date: String(data.date),
        blurb: String(data.blurb),
        image: data.image ? String(data.image) : undefined,
        html: marked.parse(content, { async: false }),
        published: data.published !== false,
      };
    })
    .filter((p) => p.published)
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .map(({ published: _published, ...post }) => post);
}

export function postBySlug(slug: string): Post | undefined {
  return publishedPosts().find((p) => p.slug === slug);
}
