# Runbook — theroach.co.za on xneelo

Operating the live site: deploy, verify, roll back, diagnose.

Everything marked **verified** was measured on the date shown, not remembered.
Re-measure before trusting anything older than a few months.

- **Live:** https://www.theroach.co.za
- **Server:** xneelo Self-Managed Server (a full VPS you own — *not* shared hosting)
- **Public IP:** `129.232.235.130` — verified 2026-07-29
- **Repo:** https://github.com/GoodieGoodchild/theroach
- **Related docs:** [README.md](README.md) for how the site is built,
  [GITHUB.md](GITHUB.md) for repo rules. See "Doc drift" at the bottom.

---

## 1. What is running on this box

Verified 2026-07-29. **Do not assume this server is only yours to fill** — it
also carries mail for other domains.

| Port | Owner | Notes |
|---|---|---|
| 80, 443 | **caddy 2.10** | Reverse proxy, provisions TLS automatically. Nothing else may bind these. |
| 25, 465, 587, 110, 143, 993, 995 | **mailcow** | The mail stack. |
| 8080, 8443 | mailcow UI | |
| 8090 | webuild | Another site. |
| 127.0.0.1:3010 | **theroach** | This site. Localhost-only on purpose — see §7. |

The site container joins a shared Docker network called `web`. That is the only
way Caddy can resolve the name `theroach`. **The `web` network is external** —
it was created by whatever brought Caddy up. If Compose ever creates a second
one, Caddy silently stops finding the site.

### How a request actually flows

```
browser → Caddy (TLS, :443) → theroach:80 → nginx inside the container → static files
```

There is **no Node at runtime.** The container is a two-stage build: `node:22`
compiles the Next.js static export, then `nginx:1.27` serves the resulting
`out/` directory. Nothing is dynamic, nothing writes to disk, and the container
runs `read_only: true`.

---

## 2. Deploying a change

The normal path. The build happens **on the server, inside Docker**, so the box
needs no Node toolchain.

**Step 1 — push from your machine.**

```bash
cd "C:/GitHub/theroach" && git push origin main
```

**Step 2 — SSH in, then locate the compose directory.** Ask Docker rather than
guessing:

```bash
docker inspect -f '{{index .Config.Labels "com.docker.compose.project.working_dir"}}' theroach
```

**Step 3 — pull and rebuild** (substitute the path from step 2):

```bash
cd <path> && git pull && docker compose up -d --build
```

The old container keeps serving until the new image builds successfully. A
failed build therefore does **not** take the site down.

**Step 4 — verify.** See §3. Do not skip it.

**Step 5 — reclaim disk.** Every `--build` orphans the previous image layers,
and this box also hosts mail, so a full disk is not a small problem:

```bash
docker image prune -f
```

### The build can fail on purpose

`npm run build` runs `scripts/guard-pricing.mjs` both before and after. If the
client's private pricelist ever reaches the repo, **the build aborts and the
deploy stops.** That is the guard working, not a bug. See §8.

---

## 3. Verifying a deploy

Run these after every deploy. Port 3010 is localhost-only, so `curl`ing it
tests the container directly and takes Caddy out of the picture.

**Is the container serving at all?**

```bash
curl -sI http://127.0.0.1:3010/ | head -1
```

**Is it the build you just pushed?** Pick something only the new build contains.
For the current sign geometry:

```bash
curl -s http://127.0.0.1:3010/choice/ | grep -o 'perspective-origin:[^;"]*' | sort -u
```

**Are the legacy 410s intact?** These matter more than they look — see §6:

```bash
curl -sI http://127.0.0.1:3010/shop/ | head -1
```

**Is the HTML still uncacheable?** This one is easy to regress and the damage
only shows up for returning visitors, on their phones, an hour after a deploy:

```bash
curl -sI https://www.theroach.co.za/ | grep -i cache-control
```

It must say `no-cache`. If it says `max-age=` anything, stop and fix
`docker/nginx.conf` — see the note in `location /`.

**Through Caddy, from outside:**

```bash
curl -sI https://www.theroach.co.za/ | head -1
```

**Canonical redirect (apex → www):**

```bash
curl -sI https://theroach.co.za/ | head -1
```

Expected: `200`, then the marker string, then `410 Gone`, then `200`, then `301`.

---

## 4. Rolling back

The image is built from a git commit, so rolling back is rolling git back.

**Find the commit you want:**

```bash
git log --oneline -10
```

**Check it out and rebuild:**

```bash
git checkout <sha> && docker compose up -d --build
```

Then return the working tree to the branch once you have fixed forward:

```bash
git checkout main
```

Detached HEAD is fine for an emergency rollback but do not leave the server
sitting there — the next person to `git pull` will be confused.

---

## 5. Logs, health and restarts

**Is it healthy?** The container has a healthcheck (`wget` against itself every
30s):

```bash
docker ps --filter name=theroach
```

Look for `(healthy)`. `(unhealthy)` means nginx is not answering inside the
container.

**Container logs** (nginx access + error; capped at 3 × 10MB):

```bash
docker logs --tail 100 -f theroach
```

**Caddy's logs** — check these when the site is unreachable but the container is
healthy, especially for TLS/ACME failures:

```bash
docker logs --tail 100 caddy
```

**Restart without rebuilding** (rarely needed — this is a static server):

```bash
docker compose restart theroach
```

**Full stop/start:**

```bash
docker compose down && docker compose up -d
```

---

## 6. The redirect map — and why it exists twice

**Verified working 2026-07-29:** `/shop/` returns `410 Gone`, apex returns `301`.

The domain has fifteen years of history and Google still holds the old
WooCommerce URLs. Those return **410 Gone, deliberately not 301**:

- Technically, mass-redirecting many dissimilar URLs onto one homepage is
  treated as a soft 404. It passes no authority and keeps the URL indexed
  *longer* than a 410 does.
- Substantively, 301ing a cannabis retail catalogue onto a page that says
  "nothing is offered for sale" asserts continuity between the two. The redirect
  map would be contradicting the site's own disclaimer.

`/contact-us-the-roach/` is the one exception — a real 301, because the visitor
still wants the same thing.

### ⚠️ The map is defined in two places

| File | Applies where |
|---|---|
| `docker/nginx.conf` | **This is the live one.** Inside the container. |
| `public/.htaccess` | Apache only. **Does nothing in this deployment.** |

`.htaccess` is kept for a possible Apache/shared-hosting fallback. If you change
a redirect, change both or they drift. `docker/Caddyfile.snippet` also documents
an alternative where Caddy answers the 410s itself — if you ever switch to that,
delete one copy. Two sources of truth for a redirect map always drift.

---

## 7. TLS, Caddy and DNS

**DNS, verified 2026-07-29** — both records point at this box:

| Record | Value | Status |
|---|---|---|
| `theroach.co.za` A | `129.232.235.130` | ✅ correct |
| `www.theroach.co.za` A | `129.232.235.130` | ✅ correct |
| `mail.theroach.co.za` A | `41.203.18.177` | ❌ **wrong box** — see §9 |

Managed in the xneelo control panel under **Manage DNS → theroach.co.za**.

**You never manage certificates.** Caddy obtains and renews Let's Encrypt certs
automatically on first request, for both hostnames. There is no cron job, no
certbot, nothing to renew. If TLS breaks, the cause is almost always DNS or a
blocked port 80 (ACME needs HTTP-01), not the certificate itself.

Caddy's config for this site is three lines:

```
theroach.co.za, www.theroach.co.za {
	reverse_proxy theroach:80
}
```

Everything else — canonical host, 410s, caching — happens inside the container.

**Port 3010 is bound to `127.0.0.1` on purpose.** If you publish it as
`3010:80`, the site becomes reachable over plain HTTP on that port, bypassing
your TLS *and* the whole redirect map. Anyone could hit the raw site and skip
the 410s. Leave it on localhost.

---

## 8. Things that must never happen

1. **The pricelist must never reach the repo or the server.** It lives only in
   the client's WhatsApp. `logoassets/TheRoachPricing.png` is held by
   `.gitignore:34` and `scripts/guard-pricing.mjs` fails the build if anything
   matching `pricing|pricelist|prices` in a media extension appears in
   `public/`, `out/`, or `git ls-files`. Because the server clones from git, the
   file simply does not exist there. Verified 2026-07-29.
2. **No prices, no product listings, no "buy" language on the site.** Orders
   happen in WhatsApp, person to person. The site says nothing is offered for
   sale — the deployment must not contradict that (see §6).
3. **Nothing else may bind :80 or :443.** Caddy owns them. Binding them breaks
   TLS renewal for every site on the box, including mail.
4. **Do not let Compose create a second `web` network.** It is `external: true`
   for this reason.
5. **Do not add `X-Robots-Tag: noindex` to production.** It belongs on the Vercel
   demo only. Production must be indexable or the SEO work is wasted.

---

## 9. ⚠️ Known problems

### Mail is pointed at the wrong machine — unresolved

**Verified 2026-07-29.** `theroach.co.za` MX → `mail.theroach.co.za` →
`41.203.18.177`. That is xneelo **shared hosting**. mailcow runs on *this* box
at `129.232.235.130`. So `high@theroach.co.za` cannot receive mail through
mailcow as things stand.

Before changing the `mail` A record, **check whether mailcow serves other
domains from that hostname** — repointing it will break their delivery too. This
needs a proper look, not a quick edit.

### `/choice/` was 404 in production as of 2026-07-29

The two-storefront page had never been deployed at the time of writing. If
`curl -sI https://www.theroach.co.za/choice/` still returns 404, the server is
running an old build — do §2.

### Motion animations inert on `/choice/`

Hover swing, the turn on select, and the dim of the other door do not animate.
Lighting, neon strike and CTA glow all work. The sign geometry is static CSS and
is unaffected. Not a deployment fault — it reproduces in local dev and in the
production build.

### Repo is public

Recommended private. The pricelist is excluded either way, but the repo exposes
the client's brand strategy and compliance reasoning.

---

## 10. Troubleshooting

| Symptom | Likely cause | Check |
|---|---|---|
| **No landing video, story just scrolls** (usually only on a phone, only for people who visited before) | Cached HTML pointing at chunks a later deploy deleted, so JS 404s and React never hydrates. The no-JS fallback is what you are seeing. | `curl -sI https://www.theroach.co.za/ \| grep -i cache-control` — must say `no-cache`, never `max-age`. Confirm by opening the site in a private tab. |
| Site unreachable, container healthy | Caddy can't resolve `theroach` | `docker network inspect web` — is the container attached? |
| TLS error / cert expired | DNS moved, or :80 blocked so ACME fails | `nslookup theroach.co.za`; `docker logs caddy` |
| Deploy "worked" but the change isn't live | Browser or `Cache-Control: immutable` on hashed assets | `curl` the marker string in §3, not the browser |
| Build dies partway | Out of memory on the box | `free -h`; the old container is still serving, so no outage |
| `410` became `404` | nginx config lost, or serving a stale image | `curl -sI http://127.0.0.1:3010/shop/` |
| Old page content after deploy | Built an old commit | `git log --oneline -1` in the compose dir |
| Container `(unhealthy)` | nginx not answering internally | `docker logs theroach` |

---

## Doc drift — read before trusting the other files

This repo carries several docs written at different stages, and some have been
overtaken by events:

- **`GO-LIVE.md`** — written pre-launch, when it was unclear which xneelo
  product this was. Covers "SSL first" and uploading files. The site is live on
  Docker now and TLS is automatic, so most of it no longer applies.
- **`DEPLOYMENT.md`** — opens with "🔴 URGENT — the old URLs are 404ing right
  now". That was fixed at DNS cutover; `/shop/` returns 410 as of 2026-07-29.
- **`GITHUB.md`** — still accurate on repo rules and what is deliberately
  excluded.
- **`README.md`** — accurate on how the site is built. Its "Deploying to xneelo"
  section overlaps this file; **this runbook is the source of truth for
  operations.**

Retiring the stale docs is worth doing, but deleting someone's launch notes is
not a call to make silently — decide deliberately.
