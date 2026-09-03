/**
 * The Roach — journal desk. Email + password, no GitHub account required.
 *
 * WHY THIS EXISTS AND NOT DECAP: Decap CMS signs in with GitHub. The client
 * has no GitHub account and should not need one, so this replaces it. It is
 * bespoke software with an authenticated write surface, running on a box that
 * also carries mail — so it is deliberately small, dependency-free and
 * readable end to end. Everything below is load-bearing; read before editing.
 *
 * WHAT IT DOES
 *   Writes markdown into /repo/content/blog/, images into
 *   /repo/content/blog/uploads/, commits, pushes to GitHub (the backup), and
 *   touches /repo/.rebuild-requested so the host's cron rebuilds the site.
 *
 * WHY A FLAG FILE RATHER THAN REBUILDING DIRECTLY: rebuilding needs the Docker
 * socket, and mounting that into an internet-facing container is a root
 * escalation waiting to happen. The flag is inert; cron does the privileged
 * part. Also note the deploy watch CANNOT detect these commits by comparing
 * HEAD to upstream — we commit locally and push, so the two match immediately.
 * The flag is what tells cron there is anything to do.
 *
 * SECURITY NOTES
 *   · scrypt password hashing, timing-safe compare
 *   · signed HttpOnly/Secure/SameSite=Strict session cookie, 12h expiry
 *   · login rate-limited per IP with backoff — a public login form on a
 *     mail-carrying host will be probed
 *   · slugs and upload names are whitelisted, never interpolated from input
 *   · uploads are size-capped and sniffed by MAGIC BYTES, not by extension
 */
import { createServer } from 'node:http';
import { execFileSync } from 'node:child_process';
import {
  scryptSync, randomBytes, timingSafeEqual, createHmac,
} from 'node:crypto';
import {
  readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync, unlinkSync,
} from 'node:fs';
import { join } from 'node:path';

const REPO = '/repo';
const POSTS = join(REPO, 'content', 'blog');
const UPLOADS = join(POSTS, 'uploads');
/**
 * USERS. `ADMIN_USERS` is a comma-separated list of `email=salt:hash` — the
 * separators are safe because an email address contains neither `=` nor `,`,
 * and the salt/hash are hex.
 *
 *   ADMIN_USERS=high@theroach.co.za=abc123:def456,jon@example.com=aaa:bbb
 *
 * The older single-account ADMIN_EMAIL/ADMIN_PASSWORD_HASH pair still works and
 * is merged in, so an existing .env keeps running untouched.
 */
const USERS = new Map();
for (const entry of (process.env.ADMIN_USERS || '').split(',')) {
  const at = entry.indexOf('=');
  if (at < 1) continue;
  const email = entry.slice(0, at).trim().toLowerCase();
  const cred = entry.slice(at + 1).trim();
  if (email && cred.includes(':')) USERS.set(email, cred);
}
if (process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD_HASH) {
  USERS.set(process.env.ADMIN_EMAIL.toLowerCase(), process.env.ADMIN_PASSWORD_HASH);
}
const SECRET = process.env.SESSION_SECRET || '';
const GIT_TOKEN = process.env.GIT_TOKEN || '';
const GIT_REMOTE = process.env.GIT_REMOTE || 'github.com/GoodieGoodchild/theroach.git';
const MAX_UPLOAD = 12 * 1024 * 1024; // a phone photo, before browser-side shrink

if (!USERS.size || !SECRET) {
  console.error('No users configured (ADMIN_USERS) or SESSION_SECRET missing — refusing to start.');
  process.exit(1);
}
console.log(`journal desk: ${USERS.size} account(s) configured`);

/* ── auth ─────────────────────────────────────────────────────────────────── */

const checkPassword = (email, given) => {
  const [salt, want] = (USERS.get(email) || '').split(':');
  if (!salt || !want) return false;
  const got = scryptSync(given, salt, 64).toString('hex');
  // Both are hex of identical length, so timingSafeEqual is safe to call.
  return got.length === want.length &&
    timingSafeEqual(Buffer.from(got), Buffer.from(want));
};

const sign = (v) => createHmac('sha256', SECRET).update(v).digest('base64url');

/** Session carries WHO, so a post can be committed under the person who wrote it. */
const mintSession = (email) => {
  const body = `${Date.now() + 12 * 3600e3}.${Buffer.from(email).toString('base64url')}`;
  return `${body}.${sign(body)}`;
};
/** Returns the signed-in email, or null. */
const sessionUser = (c) => {
  if (!c) return null;
  const i = c.lastIndexOf('.');
  if (i < 1) return null;
  const body = c.slice(0, i);
  const mac = c.slice(i + 1);
  const expect = sign(body);
  if (mac.length !== expect.length) return null;
  if (!timingSafeEqual(Buffer.from(mac), Buffer.from(expect))) return null;
  const [exp, who] = body.split('.');
  if (Number(exp) <= Date.now()) return null;
  const email = Buffer.from(who || '', 'base64url').toString();
  // A user removed from .env loses access immediately, session or not.
  return USERS.has(email) ? email : null;
};

// Per-IP backoff. In memory on purpose: a restart clearing it is fine, and it
// keeps this service free of a datastore.
const attempts = new Map();
const blocked = (ip) => {
  const a = attempts.get(ip);
  return a && a.n >= 5 && Date.now() < a.until;
};
const noteFail = (ip) => {
  const a = attempts.get(ip) || { n: 0, until: 0 };
  a.n += 1;
  a.until = Date.now() + Math.min(2 ** a.n, 900) * 1000;
  attempts.set(ip, a);
};

/* ── posts ────────────────────────────────────────────────────────────────── */

const SLUG_OK = /^[a-z0-9][a-z0-9-]{1,80}$/;
const slugify = (s) =>
  s.toLowerCase().normalize('NFKD').replace(/[^\w\s-]/g, '')
    .trim().replace(/\s+/g, '-').replace(/-+/g, '-').slice(0, 80);

const listPosts = () => {
  if (!existsSync(POSTS)) return [];
  return readdirSync(POSTS).filter((f) => f.endsWith('.md')).map((f) => {
    const raw = readFileSync(join(POSTS, f), 'utf8');
    const g = (k) => (raw.match(new RegExp(`^${k}:\\s*"?(.*?)"?\\s*$`, 'm')) || [])[1] || '';
    return {
      slug: f.replace(/\.md$/, ''),
      title: g('title'),
      date: g('date'),
      published: !/^published:\s*false/m.test(raw),
    };
  }).sort((a, b) => (a.date < b.date ? 1 : -1));
};

const readPost = (slug) => {
  const p = join(POSTS, `${slug}.md`);
  if (!SLUG_OK.test(slug) || !existsSync(p)) return null;
  const raw = readFileSync(p, 'utf8');
  const m = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!m) return null;
  const g = (k) => (m[1].match(new RegExp(`^${k}:\\s*"?(.*?)"?\\s*$`, 'm')) || [])[1] || '';
  return {
    slug,
    title: g('title'),
    date: g('date'),
    blurb: g('blurb'),
    image: g('image'),
    published: !/^published:\s*false/m.test(m[1]),
    body: m[2],
  };
};

// YAML-safe: quote and escape, so an apostrophe or a colon in his title
// cannot break the frontmatter and fail the build.
const yamlStr = (s) => `"${String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;

const writePost = (p) => {
  const fm = [
    '---',
    `title: ${yamlStr(p.title)}`,
    `date: ${p.date}`,
    `blurb: ${yamlStr(p.blurb)}`,
    ...(p.image ? [`image: ${p.image}`] : []),
    ...(p.published ? [] : ['published: false']),
    '---',
    '',
  ].join('\n');
  writeFileSync(join(POSTS, `${p.slug}.md`), fm + p.body.replace(/\r\n/g, '\n'), 'utf8');
};

/* ── git ──────────────────────────────────────────────────────────────────── */

const git = (...args) =>
  execFileSync('git', args, { cwd: REPO, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });

const publish = (message, author) => {
  try {
    git('add', '-A', 'content/blog');
    // Attributed to whoever is signed in, so `git log` shows who posted what
    // once more than one person has a login.
    git('-c', `user.email=${author}`, '-c', 'user.name=The Roach Journal',
      'commit', '-m', message);
  } catch (e) {
    // Nothing staged is not a failure — he may have saved without changing anything.
    if (!/nothing to commit/i.test(e.stdout || '')) throw e;
  }
  // The flag is what actually gets the site rebuilt; write it before the push
  // so a network failure still results in a deploy.
  writeFileSync(join(REPO, '.rebuild-requested'), new Date().toISOString());
  if (GIT_TOKEN) {
    try {
      git('push', `https://x-access-token:${GIT_TOKEN}@${GIT_REMOTE}`, 'HEAD:main');
    } catch (e) {
      // Local commit stands and the site will still rebuild; only the offsite
      // backup is behind. Never surface the token in a log line.
      console.error('push failed (post is saved locally and will still publish)');
    }
  }
};

/* ── html ─────────────────────────────────────────────────────────────────── */

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const shell = (title, body) => `<!doctype html><html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow"><title>${esc(title)} — The Roach</title>
<style>
:root{--ink:#0a0a0a;--ink2:#141414;--gold:#c9a227;--goldlit:#e8c96a;--bone:#efe9dd}
*{box-sizing:border-box}
body{margin:0;background:var(--ink);color:var(--bone);font:16px/1.6 system-ui,-apple-system,sans-serif;padding:24px}
.wrap{max-width:720px;margin:0 auto}
h1{font-weight:200;letter-spacing:.04em;color:var(--goldlit);font-size:1.6rem}
label{display:block;margin:18px 0 6px;font-size:12px;letter-spacing:.18em;text-transform:uppercase;color:#a09880}
input,textarea,select{width:100%;padding:12px;background:var(--ink2);color:var(--bone);
 border:1px solid #2a2a2a;border-radius:4px;font:inherit}
textarea{min-height:320px;font-family:ui-monospace,monospace;font-size:14px}
button,.btn{display:inline-block;margin-top:20px;padding:12px 22px;background:transparent;
 color:var(--goldlit);border:1px solid var(--gold);border-radius:999px;font:inherit;
 letter-spacing:.16em;text-transform:uppercase;font-size:12px;cursor:pointer;text-decoration:none}
button:hover,.btn:hover{background:rgba(201,162,39,.12)}
.row{display:flex;gap:12px;flex-wrap:wrap;align-items:center}
.post{border-bottom:1px solid #222;padding:14px 0;display:flex;justify-content:space-between;gap:12px}
.muted{color:#8a8375;font-size:13px}
.err{background:#2a1414;border:1px solid #5a2424;padding:12px;border-radius:4px;margin:16px 0}
.ok{background:#14241a;border:1px solid #245a34;padding:12px;border-radius:4px;margin:16px 0}
img.prev{max-width:100%;border-radius:4px;margin-top:12px}
</style></head><body><div class="wrap">${body}</div></body></html>`;

const loginPage = (msg) => shell('Sign in', `
<h1>The Roach — Journal Desk</h1>
${msg ? `<div class="err">${esc(msg)}</div>` : ''}
<form method="post" action="/admin/login">
  <label>Email</label><input name="email" type="email" autocomplete="username" required>
  <label>Password</label><input name="password" type="password" autocomplete="current-password" required>
  <button type="submit">Sign in</button>
</form>`);

const listPage = (posts, note, who) => shell('Journal', `
<div class="row" style="justify-content:space-between">
  <h1>The Daily Roach</h1>
  <a class="btn" href="/admin/new">New post</a>
</div>
${note ? `<div class="ok">${esc(note)}</div>` : ''}
${posts.map((p) => `<div class="post">
  <div><a href="/admin/edit/${esc(p.slug)}" style="color:var(--bone)">${esc(p.title || p.slug)}</a>
  <div class="muted">${esc(p.date)}${p.published ? '' : ' · draft'}</div></div>
</div>`).join('') || '<p class="muted">No posts yet.</p>'}
<form method="post" action="/admin/logout">
  <button>Sign out</button> <span class="muted">signed in as ${esc(who)}</span>
</form>`);

const editPage = (p) => shell(p.slug ? 'Edit' : 'New', `
<h1>${p.slug ? 'Edit post' : 'New post'}</h1>
<form method="post" action="/admin/save" id="f">
  <input type="hidden" name="slug" value="${esc(p.slug)}">
  <label>Title</label><input name="title" value="${esc(p.title)}" required>
  <label>Date</label><input name="date" type="date" value="${esc(p.date)}" required>
  <label>Blurb — the line Google shows. Keep it under 155 characters.</label>
  <textarea name="blurb" style="min-height:70px" maxlength="155" required>${esc(p.blurb)}</textarea>

  <label>Photo</label>
  <input type="file" id="file" accept="image/*">
  <div class="muted">Shrunk on your phone before it uploads, then again when the site builds.</div>
  <input type="hidden" name="image" id="image" value="${esc(p.image)}">
  ${p.image ? `<img class="prev" id="prev" src="${esc(p.image)}">` : '<img class="prev" id="prev" style="display:none">'}

  <label>Body — markdown. Blank line between paragraphs; end a line with \\ to break it.</label>
  <textarea name="body" required>${esc(p.body)}</textarea>

  <label class="row" style="margin-top:20px">
    <input type="checkbox" name="published" style="width:auto" ${p.published ? 'checked' : ''}>
    <span style="text-transform:none;letter-spacing:0">Publish this (untick to keep it a draft)</span>
  </label>

  <div class="row"><button type="submit">Save &amp; publish</button>
  <a class="btn" href="/admin/">Back</a></div>
</form>
<script>
// Shrink on the DEVICE before upload. A modern phone photo is 8-12MB; over a
// South African mobile connection that is a slow, expensive upload and often a
// failed one. Longest side 1600px matches what the build would produce anyway.
document.getElementById('file').addEventListener('change', async (e) => {
  const file = e.target.files[0]; if (!file) return;
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas');
  c.width = Math.round(bmp.width * scale); c.height = Math.round(bmp.height * scale);
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
  const dataUrl = c.toDataURL('image/jpeg', 0.82);
  const name = file.name.replace(/[^a-zA-Z0-9._-]/g, '-').replace(/\\.[^.]+$/, '') + '.jpg';
  const r = await fetch('/admin/upload', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, data: dataUrl })
  });
  const j = await r.json();
  if (!j.ok) { alert(j.error || 'Upload failed'); return; }
  document.getElementById('image').value = j.path;
  const prev = document.getElementById('prev');
  prev.src = dataUrl; prev.style.display = 'block';
});
</script>`);

/* ── server ───────────────────────────────────────────────────────────────── */

const body = (req, cap = MAX_UPLOAD) => new Promise((res, rej) => {
  let n = 0; const chunks = [];
  req.on('data', (c) => {
    n += c.length;
    if (n > cap) { rej(new Error('too large')); req.destroy(); return; }
    chunks.push(c);
  });
  req.on('end', () => res(Buffer.concat(chunks)));
  req.on('error', rej);
});

const send = (res, code, html, headers = {}) => {
  res.writeHead(code, { 'Content-Type': 'text/html; charset=utf-8', ...headers });
  res.end(html);
};
const COOKIE = (v, age) =>
  `rd=${v}; Path=/admin; HttpOnly; Secure; SameSite=Strict; Max-Age=${age}`;

createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  const path = url.pathname.replace(/\/+$/, '') || '/admin';
  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'local';
  const cookie = /(?:^|;\s*)rd=([^;]+)/.exec(req.headers.cookie || '')?.[1];
  const user = sessionUser(cookie);

  try {
    if (path === '/admin/login' && req.method === 'POST') {
      if (blocked(ip)) return send(res, 429, loginPage('Too many attempts. Wait a few minutes.'));
      const form = new URLSearchParams((await body(req, 4096)).toString());
      const email = (form.get('email') || '').trim().toLowerCase();
      if (!checkPassword(email, form.get('password') || '')) {
        noteFail(ip);
        return send(res, 401, loginPage('Wrong email or password.'));
      }
      attempts.delete(ip);
      return send(res, 302, '', { Location: '/admin/', 'Set-Cookie': COOKIE(mintSession(email), 43200) });
    }

    if (path === '/admin/logout') {
      return send(res, 302, '', { Location: '/admin/', 'Set-Cookie': COOKIE('', 0) });
    }

    if (!user) return send(res, 200, loginPage(''));

    if (path === '/admin') return send(res, 200, listPage(listPosts(), url.searchParams.get('saved') ? 'Saved. The site rebuilds within a few minutes.' : '', user));

    if (path === '/admin/new') {
      return send(res, 200, editPage({
        slug: '', title: '', date: new Date().toISOString().slice(0, 10),
        blurb: '', image: '', published: true, body: '',
      }));
    }

    if (path.startsWith('/admin/edit/')) {
      const p = readPost(path.slice('/admin/edit/'.length));
      if (!p) return send(res, 404, shell('Not found', '<h1>No such post</h1><a class="btn" href="/admin/">Back</a>'));
      return send(res, 200, editPage(p));
    }

    if (path === '/admin/upload' && req.method === 'POST') {
      const { name, data } = JSON.parse((await body(req)).toString());
      const m = /^data:image\/(jpeg|png|webp);base64,(.+)$/.exec(data || '');
      if (!m) throw new Error('unsupported image');
      const buf = Buffer.from(m[2], 'base64');
      // Sniff MAGIC BYTES, never the filename — an extension is attacker input.
      const jpg = buf[0] === 0xff && buf[1] === 0xd8;
      const png = buf[0] === 0x89 && buf[1] === 0x50;
      const webp = buf.slice(8, 12).toString() === 'WEBP';
      if (!jpg && !png && !webp) throw new Error('not an image');
      const safe = String(name).replace(/[^a-zA-Z0-9._-]/g, '-').slice(-60) || 'photo.jpg';
      mkdirSync(UPLOADS, { recursive: true });
      writeFileSync(join(UPLOADS, safe), buf);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ ok: true, path: `/img/blog/${safe}` }));
    }

    if (path === '/admin/save' && req.method === 'POST') {
      const f = new URLSearchParams((await body(req, 512 * 1024)).toString());
      const title = (f.get('title') || '').trim();
      let slug = f.get('slug') || '';
      if (!slug) slug = slugify(title);
      if (!SLUG_OK.test(slug)) throw new Error('Could not build a filename from that title.');
      writePost({
        slug,
        title,
        date: (f.get('date') || '').slice(0, 10),
        blurb: (f.get('blurb') || '').trim(),
        image: f.get('image') || '',
        published: f.get('published') === 'on',
        body: f.get('body') || '',
      });
      publish(`journal: ${slug}`, user);
      return send(res, 302, '', { Location: '/admin/?saved=1' });
    }

    return send(res, 404, shell('Not found', '<h1>Not found</h1>'));
  } catch (e) {
    console.error('admin error:', e.message);
    if (req.headers['content-type'] === 'application/json') {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ ok: false, error: e.message }));
    }
    return send(res, 400, shell('Problem', `<h1>That didn’t save</h1><div class="err">${esc(e.message)}</div><a class="btn" href="/admin/">Back</a>`));
  }
}).listen(3000, () => console.log('journal desk on :3000'));
