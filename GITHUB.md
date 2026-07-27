# Pushing to GitHub

The repo is initialised and committed on `main` — 52 files, working tree clean.
No remote is set yet, because that step publishes and is yours to make.

## Make it PRIVATE

Strong recommendation. The pricelist is excluded, but the repo still contains:

- the client's logo and video source artwork
- his WhatsApp number and email
- the full compliance reasoning about SA cannabis law, in code comments —
  including where the legal lines are and why particular queries are avoided

GitHub repos are crawled and indexed, and code search surfaces file contents.
None of that is dangerous in itself, but it is a competitor's and a regulator's
reading of the client's strategy, written by us, in one place.

## Create and push

**With the GitHub CLI** (not installed on this machine — `winget install GitHub.cli`):

```bash
cd "C:\GitHub\theroach"
gh repo create theroach --private --source=. --remote=origin --push
```

**Or via the website:** create an empty repo named `theroach` (no README, no
.gitignore — the repo already has both), then:

```bash
cd "C:\GitHub\theroach"
git remote add origin https://github.com/<you>/theroach.git
git push -u origin main
```

## What is deliberately NOT in the repo

| Excluded | Why |
|---|---|
| `logoassets/TheRoachPricing.png` | The client's private pricelist. Never publish — see below. |
| `logoassets/theroach.mp4`, `roachjoint.mp4` | Superseded video sources, ~6.7MB of dead weight. |
| `out/` | Build output. Rebuilt by `npm run build`; see the Docker note. |
| `.vercel/`, `node_modules/`, `.env*` | Standard. |

`scripts/guard-pricing.mjs` runs on every build and **fails it** if a pricelist
image reaches `public/`, `out/` **or the git index** — including under a renamed
file. Red-team tested: it catches a planted copy in `public/` and a renamed copy
force-added with `git add -f`, and passes cleanly otherwise. A `.gitignore` line
is a promise; that check is the guarantee.

## Docker deployment

`Dockerfile` + `docker/nginx.conf` are ready: stage 1 runs `npm ci && npm run
build`, stage 2 serves `out/` from `nginx:alpine` (~25MB, no Node at runtime, no
application surface).

```bash
docker build -t theroach .
docker run -p 8080:80 theroach
```

### ⚠️ The redirect map exists twice — keep both in sync

`public/.htaccess` is **Apache-only and does nothing in the nginx container.**
Every rule that matters is reimplemented in `docker/nginx.conf`:

- `410 Gone` for `/shop/`, `/product-category/`, `/product/`, `/brand/`,
  `/cannarootz/`, cart/checkout/account and the WordPress paths
- `301` for `/contact-us-the-roach/` only
- canonical redirect to `https://www.theroach.co.za`

Those 410s are the whole reason to deploy quickly: Google still has the old
WooCommerce URLs indexed, and each crawl that hits a 404 instead of a 410 drops
another one, taking the domain's legacy authority with it. **If you change one
file, change the other**, or the two deployment paths silently diverge.

### If your server pulls files rather than building

Then `out/` must be committed — it is currently gitignored. Remove the `out/`
line from `.gitignore`, run `npm run build`, and commit the result. Say the word
and I will switch it over.

### HTTPS

The container serves plain HTTP on 80 and expects TLS to be terminated upstream.
The canonical redirect trusts the proxy rather than `$scheme` — redirecting on
`$scheme` behind a TLS-terminating proxy is an infinite loop.
