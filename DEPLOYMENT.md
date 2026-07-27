# Deployment

## 🔴 URGENT — the old URLs are 404ing right now

Checked live (26 July 2026). `theroach.co.za` is registered again (xneelo, created
25 July 2026) and resolving to `41.203.18.177`, serving a 2.3KB Apache placeholder.
But:

| URL | Now | Should be |
|---|---|---|
| `/shop/` | **404** | 301 → `/` |
| `/product-category/flowers-the-roach-knysna/pre-rolls/` | **404** | 301 → `/` |
| `/contact-us-the-roach/` | **404** | 301 → `/` |
| `/brand/african-cannamed-co/` | **404** | 301 → `/` |
| `https://` | **no valid certificate** | valid, forced |

Google still has those URLs indexed from the WooCommerce era. **Every crawl that
hits a 404 instead of a 301 drops one more of them, and the legacy authority goes
with it.** That authority is the single biggest SEO asset this client has — it is
the whole reason re-registering the domain mattered — and it is decaying daily.

`public/.htaccess` already contains the correct 301s. It is doing nothing until it
is uploaded. **Deploying to xneelo is more urgent than any on-page work**, and it
does not have to wait for the site to be final: uploading `out/` today stops the
bleed, and the content can be improved afterwards.

Also enable SSL in the xneelo control panel (Let's Encrypt is included) before
pointing anyone at the domain — the canonical, the sitemap and the `.htaccess`
redirect all target `https://www.`, so without a certificate every one of them
lands on a browser warning.


Two targets, different jobs. Don't mix them up.

| Target | Purpose | Indexed? |
|---|---|---|
| **Vercel** | Client demo | ❌ `noindex` — deliberately |
| **xneelo** | Production, on `theroach.co.za` | ✅ Yes |

## Live client demo

**https://theroach.vercel.app** — public, no login, currently `noindex`.

⚠️ The two URL forms behave differently. The project **alias** above is public.
The deployment-specific URL (`theroach-<hash>-goodiegoodchilds-projects.vercel.app`)
sits behind Vercel's deployment protection and serves a **Vercel login page** —
sending that one to a client shows them a sign-in wall. **Always send the alias.**

Redeploy:

```bash
npx vercel deploy --yes --archive=tgz --prod
```

`.vercelignore` excludes `logoassets/` — the client's private pricelist lives
there and must not be uploaded to a third party. The build doesn't need it; the
derived images and video are already committed under `public/`.

### Why the demo is noindex

`vercel.json` sets `X-Robots-Tag: noindex, nofollow, noarchive` on every route.

**This matters more here than on a typical preview.** The entire point of this
build is recovering the search history of `theroach.co.za`. An indexed
`theroach.vercel.app` would be near-identical content competing with the real
domain for the exact brand term — self-inflicted duplicate content on the one
keyword we cannot afford to lose.

**Remove the header when production moves to the real domain**, or the live site
will be invisible to Google.

## xneelo (production)

Standard xneelo web hosting is **PHP/Apache and cannot run Node**. `npm` does not
execute there. Build locally and upload the output.

1. `npm run build`
2. Upload the **contents** of `out/` — including the dotfile `.htaccess` — to
   `public_html/`.
3. Point the domain's document root at it.
4. Confirm `https://theroach.co.za/shop/` 301s to `https://www.theroach.co.za/`.

`vercel.json` is ignored by Apache, so it does no harm sitting in the repo.

### After DNS cutover

- Verify the domain in Google Search Console and submit `sitemap.xml`.
- Use "Validate Fix" on the old 404s so Google re-crawls the 301s.
- Reclaim the **Google Business Profile** — the old reviews live on the GBP, not
  on the website. The site's job is to be the consistent canonical home.

## Before showing the client

- [ ] The WhatsApp number in `src/lib/config.ts` is **unverified** — it came from
      an old directory listing. Every order conversation routes through it.
- [ ] The video fix for mobile has not been confirmed on a real handset.
