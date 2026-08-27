# Launch-day SEO checklist — theroach.co.za

Work top to bottom. The order matters: nothing below step 2 does anything
until Google knows the site exists.

Baseline measured 2026-08-27 with `npm run seo`: **616 indexable words**,
title 49 chars, description 151, Knysna ×7, Garden Route ×7, dagga ×1,
weed ×1, 3 internal links, Organization schema, 410s live on the old
WooCommerce URLs.

---

## 1. Deploy — everything else depends on it

```bash
cd "C:/GitHub/theroach" && git push origin main
```

Then on the server, per RUNBOOK §2. Verify the journal is actually live —
it was 404 before today:

```bash
curl -sI https://www.theroach.co.za/blog/ | head -1
```

---

## 2. Google Search Console — 15 minutes, biggest single unlock

Google currently has no idea this site exists in its present form.

1. [search.google.com/search-console](https://search.google.com/search-console)
   → **Add property** → choose **Domain** (not URL prefix).
2. Enter `theroach.co.za`. Google gives you a TXT record.
3. xneelo control panel → Manage DNS → theroach.co.za → add the TXT record
   on `@`. Domain verification covers www, apex and every future
   subdomain in one go — worth the extra two minutes over the meta-tag method.
4. Back in Search Console → **Verify**.
5. **Sitemaps** → submit `sitemap.xml`.
6. **URL Inspection** → request indexing for, one at a time:
   - `https://www.theroach.co.za/`
   - `https://www.theroach.co.za/blog/`
   - `https://www.theroach.co.za/potcast/`

Then do [Bing Webmaster Tools](https://www.bing.com/webmasters) — it
imports straight from Search Console and feeds DuckDuckGo too. Five minutes.

**In two weeks Search Console will show the real queries people use to find
him.** That data beats any keyword tool, because it is actual Garden Route
search behaviour rather than a guess.

---

## 3. Google Business Profile — where local search is won

For "cannabis club near me" in Knysna, the map pack sits above every
organic result. This is the highest-value item on the page.

### 3a. Fix the description FIRST — today

The live description lists "quality cannabis flower, pre-rolled joints,
edibles, and concentrates". **That is the single largest compliance
exposure this business has anywhere** — an itemised product list on a
public listing is far closer to advertising for sale than anything on the
website, and it contradicts the site's own "nothing is offered for sale"
line. Replace it with this:

> The Roach is a private cannabis collective in Knysna, on South Africa's
> Garden Route. Fifteen years of quiet, organic craft — living soil, small
> batches, slow cures, no shortcuts and no poison. We are a members'
> circle in the old sense of the word: education over hype, craft over
> volume, and conversation over commerce. Strictly 18+. Nothing is offered
> for sale through this listing. Garden Route grown, Western Cape born.

Keeps every local keyword. Names no product. Sells nothing.

### 3b. Then change one thing at a time

Cannabis listings get suspended for rapid edits, and a suspension costs
the fifteen-year review history **permanently**. So:

| when | do |
|---|---|
| today | claim/confirm ownership; fix the description only |
| +3–4 weeks | rename "High tide." → "The Roach" |
| +3–4 weeks | review the category |
| +3–4 weeks | address / service-area, if it still needs changing |

Do **not** add "delivery" as a service. That is a transactional signal on a
public listing, and it is the one attribute most likely to draw attention.

### 3c. Reviews — the factor most people skip

Ten genuine reviews mentioning **Knysna** or **the Garden Route** will move
him up the local pack further than any on-page work. He has fifteen years
of members. Message to send them:

> Hey — we've finally put The Roach online properly: theroach.co.za
> If we've looked after you over the years, a quick honest review on Google
> would genuinely help people in Knysna find us. No pressure at all, and
> thanks for being part of the circle. 🪳

Never offer anything in exchange for a review — Google removes those, and
for this business it is also exactly the wrong optic.

---

## 4. NAP — identical everywhere, character for character

Inconsistent name/address/phone actively suppresses local ranking. Use this
exact block on every directory, profile and listing:

```
The Roach
Knysna, Western Cape, South Africa
https://www.theroach.co.za
high@theroach.co.za
```

⚠️ `high@theroach.co.za` does not receive mail yet — RUNBOOK §9. Do that
before publishing the address anywhere.

Where to list, in rough order of value: Google Business Profile, Bing
Places, Apple Business Connect, Facebook page, Instagram bio link,
Knysna/Garden Route tourism and business directories, and the podcast
directories below.

---

## 5. The PotCast — every platform is a real backlink

Submit the show to Spotify for Podcasters, Apple Podcasts, Pocket Casts,
Overcast and YouTube. Each listing links back and each is an indexable
mention of the brand plus "Knysna".

---

## 6. Publish on a rhythm — the journal is the engine

A brochure does not rank. Every journal entry is a new indexable page, and
**commentary carries none of the "offer for sale" exposure that product
pages would** — that is the whole strategic reason the blog exists.

One post a fortnight, consistently, beats five in a week then silence.
Post ideas that map to things people genuinely search:

- Growing in Garden Route humidity — his actual expertise
- "Knysna, slowly" — the town, the forest, the lagoon
- Why an eight-week cure
- What a private collective actually is, and is not
- Living soil, and why he will not spray

⚠️ **Anything about the law needs checking before it publishes.** A post
explaining the Prince judgment or the club model would rank well, but
getting it wrong under his name is a real risk — that one wants a proper
source or an attorney's eye, not a confident draft.

---

## 7. Deliberately NOT doing

- **Transactional queries** — "buy weed Knysna", "cannabis delivery Garden
  Route". That is where the legal exposure lives, and the traffic it brings
  is the traffic that gets a cannabis business into trouble.
- **`LocalBusiness` schema** — it asserts a commercial premises serving
  customers. `Organization` says who he is without claiming to be a shop.
- **Buying links or directory bundles.** Slow, real citations only.

---

## 8. Measuring it

- **Search Console** weekly: impressions and average position for "cannabis
  club knysna", "cannabis garden route". Position 30 → 15 is progress even
  though nobody has clicked yet.
- **WhatsApp clicks** — RUNBOOK §3a. The number that actually matters.
- Expect **3–6 months**. The 410s are already quietly protecting fifteen
  years of domain authority; the two things that compound from here are
  publishing consistently and collecting reviews.
