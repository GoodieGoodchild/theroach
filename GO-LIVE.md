# Go live on xneelo — theroach.co.za

Everything is built and packaged. **`theroach-upload.zip` (1.5MB, 66 files)** is
the whole site. Roughly 20 minutes end to end.

> **Why the hurry:** `/shop/`, `/product-category/…` and `/contact-us-the-roach/`
> currently return **404**. Google still has those URLs indexed from the
> WooCommerce era, and every crawl that hits a 404 instead of a 410 drops one
> more of them — taking the domain's legacy authority with it. That authority is
> the whole reason re-registering the domain mattered. Uploading stops the bleed;
> the content can keep improving afterwards.

---

## 1. SSL first — before anything else

The canonical tag, the sitemap and every redirect target `https://www.` If there
is no certificate when you upload, the `.htaccess` will redirect visitors to an
HTTPS URL that throws a browser warning. **Certificate before upload.**

1. konsoleH → log in → select **theroach.co.za**
2. **Web Services → SSL Certificates** (sometimes under *Manage Domain*)
3. Issue the free **Let's Encrypt** certificate for both `theroach.co.za` and
   `www.theroach.co.za`
4. Wait for it to show as active — usually a few minutes, occasionally up to an hour

Confirm before continuing:

```bash
curl -sI https://www.theroach.co.za/ | head -1
```

Anything other than a TLS error means the certificate is live.

---

## 2. Upload

The document root is **`public_html`**. Upload the **contents** of the zip into
it — not the folder itself. `index.html` must land at `public_html/index.html`,
not `public_html/out/index.html`.

**Option A — konsoleH File Manager (easiest)**

1. konsoleH → **File Manager** → open `public_html`
2. Delete the existing xneelo placeholder (the "Reserved for" page — usually
   `index.html` or `default.html`)
3. Upload `theroach-upload.zip`
4. Use **Extract** on it, then delete the zip

**Option B — FTP/SFTP** (FileZilla, host `ftp.theroach.co.za`, credentials from
konsoleH → *FTP Manager*)

Drag the **contents of `out/`** into `public_html`.

> ⚠️ **`.htaccess` is a dotfile and most FTP clients hide it by default.** In
> FileZilla: *Server → Force showing hidden files*. If it doesn't arrive, none of
> the redirects work and the whole point of this deploy is lost — see step 3.

---

## 3. Verify — do not skip this

```bash
curl -sI https://www.theroach.co.za/            # expect 200
curl -sI https://theroach.co.za/                # expect 301 -> https://www.
curl -sI https://www.theroach.co.za/shop/       # expect 410  <-- the important one
curl -sI https://www.theroach.co.za/contact-us-the-roach/   # expect 301 -> /
```

**If `/shop/` returns 404 instead of 410, `.htaccess` did not upload.** Go back
and check hidden files. If it returns 200, the placeholder is still there.

Then open the site and confirm the video plays and the loop is seamless.

---

## 4. Search Console — the same day

This is what actually converts the deploy into recovered rankings.

1. [search.google.com/search-console](https://search.google.com/search-console) →
   add **Domain property** `theroach.co.za` (verify by DNS TXT — add the record in
   konsoleH → *DNS Manager*). A domain property covers www, non-www, http and
   https in one go.
2. **Sitemaps** → submit `sitemap.xml`
3. **URL Inspection** on `https://www.theroach.co.za/` → **Request indexing**
4. **Removals → Temporary removals** → *Remove all URLs with this prefix* for
   `/shop/` and `/product-category/`. This suppresses them within a day while the
   410s propagate properly over the following weeks.

Also add the site to **Bing Webmaster Tools** — it takes two minutes and feeds
ChatGPT and Copilot search results.

---

## 5. Then, in priority order

1. **Claim the CannaStaySA listing.** `cannastaysa.co.za/directory/the-roach/` is
   a 404 that still ranks. Probably the single highest-value hour available.
2. **Fix the entity split.** "The Roach" and "High Tide" exist as separate
   listings and social identities for one premises, which splits every ranking
   signal. Pick The Roach and make everything match.
3. **Google Business Profile reclaim** — the biggest asset here, and the one with
   the most ways to go wrong. Sequence it: ownership → verify → *wait 3–4 weeks* →
   rename only → *wait 3–4 weeks* → move the pin. Doing all three at once in this
   vertical reliably triggers suspension, and the existing reviews cannot be
   recovered.

---

## Redeploying later

```bash
npm run build
```

Then re-zip `out/` and repeat step 2. `npm run seo` prints an on-page audit.

**Vercel stays as the client demo** (`theroach.vercel.app`) and remains
`noindex` on purpose — an indexed copy would compete with the real domain for the
brand term. Production carries `index, follow`; verified in this build.
