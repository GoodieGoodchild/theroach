# The Roach — theroach.co.za

Single-page brand site. Next.js 16 static export · Tailwind 4 · Motion.
**The site is a story with one door: WhatsApp. Nothing is sold on it, by design.**

## The interaction

The landing is the client's **burning-joint film** (`logoassets/theroach.mp4`),
with the wordmark composited beneath it so the two together read as the full
lockup — except the joint is alight. The film loops and holds for **30s**, or
until any deliberate gesture: **click, tap, scroll, swipe, or a key**. That
gesture is also the 18+ confirmation. On entry the film **scales up past the
viewport and dissolves**, so you fly *through* the mark into the site.

**There is deliberately no "already seen it" skip.** An earlier build stored a
`sessionStorage` flag and jumped straight to the deck on every later reload —
which read as the video being broken. The landing is the brand moment; on a
single-page site the gate only appears on a genuine page load anyway.

Two input details worth keeping:
- While the gate is up the deck's listeners are **disabled** (`enabled` prop),
  or a scroll would advance the deck invisibly behind the visible landing.
- The deck arms a **700ms grace period** the moment it goes live, so the tail of
  the gesture that dismissed the landing doesn't also skip the first chapter.

Then it's a **deck, not a scroll**. The wheel, a swipe, or ↑/↓/PgUp/PgDn/Home/End
dissolves the current section and blooms the next out of the centre (scale + blur
crossfade). A dot rail on the right shows position and jumps directly. Six
sections: open → roots → craft → the name → the collective → the line (WhatsApp).
Returning visitors skip the gate in-session (`roach-entered`).

### Three rules the deck depends on

1. **Every section stays mounted.** They cross-fade; they are never unmounted.
   Googlebot renders JS, and this domain exists to recover an old ranking — if
   sections unmounted, a rendering crawler would see one sixth of the copy.
   Inactive sections are `aria-hidden` + `inert` + `pointer-events:none`.
2. **The wheel cooldown is armed synchronously via a ref**, not inside a `setI`
   updater. A burst of wheel events all fire before React runs any updater, so
   the updater-based guard let five flicks jump three sections.
3. **Nothing renders hidden before mount** — see below.

## Progressive enhancement — the rule that cost the most to learn

`initial={false}` does **not** stop Motion writing its animation target into the
server HTML. An earlier build shipped, verbatim, into the static export:

```html
<main style="opacity:0;transform:translateY(90px)">
```

…beneath an opaque `fixed inset-0 z-50` gate whose only exit was an `onClick`. One
404'd JS chunk on shared hosting, a proxy stripping scripts, or a hydration throw,
and every visitor got a black page they could not dismiss, with all content
invisible underneath. An adversarial review caught it byte-for-byte in `out/`.

**The rule now: render plain and visible, then animate after mount.** `useMounted()`
(`src/lib/useMounted.ts`) exists solely for this and uses `useLayoutEffect` so the
swap happens before paint (no flash). The gate itself only renders after mount, so
a JS-less visitor lands directly on readable, scrollable content.

Verified in the export: no `opacity:0`, no `translateY`, no `blur(`, no gate
overlay — and every story string present. **Re-check that after any animation
change**, e.g.

```bash
node -e "const h=require('fs').readFileSync('out/index.html','utf8');console.log('hidden styles:',/opacity:\s*0[^.]|translateY|blur\(/.test(h))"
```

### Pure black is deliberate

`--color-ink` is `#000000`, **not** a warm off-black. The video plate and every
brand PNG are `rgb(0,0,0)` (measured, not assumed). When the page sat at
`#050403` those five values drew a visible rectangle around the hero video and it
read as pasted onto the page. Don't warm it up.

### The seamless loop — one timer, one owner

Native `loop` is "on ended, seek to 0, resume", and that seek is the visible
pause. `SeamlessVideo` instead runs two elements that take turns: one plays while
the other sits paused on frame 0, and just before the end they swap. No seek, no
stall.

**The thing that kept breaking:** driving the handoff from several sources at
once. An earlier version used `requestVideoFrameCallback` + `requestAnimationFrame`
+ `timeupdate` + `ended` together for "redundancy". On the deployed build those
actors fired each other's swaps and the handoff drifted further out of position
every cycle (5.30s → 5.68s → 4.99s on a 5.75s clip). Two of them were unreliable
anyway: rVFC goes dormant when its element pauses, and rAF is throttled to zero
in a non-compositing page.

Now: **exactly one scheduled timer**, computed from the live element's own clock
and re-armed only by the swap it triggers. `ended` is a failsafe that checks
ownership first — an unguarded one let the *outgoing* element's `ended` yank the
visible element out early, which is what caused the drift.

Measured with the page actually rendering: 4/4 handoffs at ~5.62s resuming at
~0.013s, `ended` never fires, longest freeze 0ms.

**When the tab is backgrounded** the browser clamps `setTimeout` to ~1s and stops
rAF entirely, so the scheduled handoff cannot land on time and the clip reaches
its end. The `ended` failsafe then swaps it — one hitch per loop, while nobody is
looking — and `visibilitychange` re-arms the timer the moment the tab is focused
again. That is the intended degradation, not a bug. It also means **any headless
or non-compositing browser will report the loop as drifting**; measure it in a
real, visible window.

### The hero video — `npm run video`

Source: `logoassets/roachjoint.mp4`. Output: `public/video/roach.mp4` + a poster.
**Never ship the source.** It is 1440×1440 H.264 **High profile @ Level 4.0**,
24fps, 4.3MB, with a stereo AAC track. Desktop plays that happily; phones often
will not — 1440² sits right at the Level 4.0 macroblock ceiling and plenty of
mid-range mobile decoders refuse High profile at that size, and 4.3MB with
`preload="auto"` can leave the element blank for a long time on mobile data.

The pipeline re-encodes to **720², Main profile @ Level 3.1, no audio,
`+faststart`** — the combination virtually every mobile decoder handles.

**4.30MB → 117KB (97% smaller).** Poster is 10KB.

**Seamless loop.** Cutting at a round number leaves a visible jump on wrap. The
script takes frame 0 as reference, scores every candidate frame in a ±0.75s
window around the requested 7s cut, and cuts one frame before the closest match.
It landed on **7.417s**, where the spin returns to its start — measured seam
difference **0.94/255**, i.e. invisible. Re-run `npm run video` if the source
changes; it prints the seam score and warns if the source has no clean loop point.

### iOS autoplay

React sets `muted` as a DOM **property**; iOS Safari gates inline autoplay on the
**attribute**. The retry loop asserts both (`v.muted = true` and
`setAttribute('muted','')`) before every `play()` attempt. Verified present in the
live DOM. Autoplay is also retried on `canplay`, on `visibilitychange`, and on an
interval — and if it stays blocked the hint changes to "Tap to begin" rather than
leaving a still frame that reads as a broken video.

### Hero geometry — don't "tidy" these numbers

The source is a **1440×1440 square**. Measured from the actual frames:

| Band (of frame height) | Contents |
|---|---|
| 0–12% | black |
| 13–32% | smoke |
| **33–82%** | **the burning joint + R — must stay clear** |
| 83–100% | black |

So the wordmark sits at **top 85%** — in the dead band, clearing the ember. The
video is `object-contain`, **not** `cover`: cover crops top and bottom on a wide
screen, which would eat both the wordmark band and the smoke. The letterbox is
black on a black page, so it is invisible.

`.stage` and `.wm` in `globals.css` own the sizing. The stage is `78svh`, dropping
to `60svh` under 500px tall — the hint block below needs ~98px, so 78svh only fits
viewports taller than ~445px. Landscape phones are ~390px. The hint is a **flex
sibling** of the stage, not an absolute overlay, so they can never collide (they
overlapped by 30px before this).

## Commands

```
npm install
npm run dev      # localhost:5193 (registered in DevDash)
npm run images   # brand PNGs → transparent WebP (allowlisted files only)
npm run video    # roachjoint.mp4 → trimmed, seamless-looping, mobile-safe mp4
npm run build    # → out/ (static, uploads to xneelo public_html)
```

`images` and `video` only need re-running when the source artwork changes; their
output is committed under `public/`.

## Brand assets — read this before touching logoassets/

`logoassets/` holds the client's ORIGINAL artwork. It is never redrawn, never
reinterpreted. The client explicitly rejected AI reinterpretations of his mark.

**Transparency:** the source PNGs are gold art on a solid black plate. Dropped in
as-is they read as pasted rectangles (the plate's `#000` never matches the page's
`#050403`, and the circular badge shows a hard square edge). `npm run images` keys
the black out by deriving alpha from the brightest channel, then **un-premultiplies**
the colour (`rgb / alpha`) so the art over black is identical to the source while
the plate disappears and the glow falls off softly.

Two constants in that script are load-bearing — don't remove them:
`FLOOR` discards near-black plate noise, because un-premultiplying `rgb(2,0,1)`
yields `rgb(255,0,127)` at alpha 2/255: invisible, but high-frequency saturated
noise WebP cannot compress. Skipping it ballooned the wordmark from 16KB to
**677KB**. `KNEE` caps the amplification for the same reason.

**`TheRoachPricing.png` is the client's private pricelist for WhatsApp. It must
NEVER be published.** `scripts/optimise-images.mjs` uses an explicit allowlist and
fails the run if the pricelist is found in `public/img`. Publishing prices publicly
is the "advertise for sale" fact pattern under the CfPPA's definition of "deal in"
(up to 10 years on proclamation — see the market research in the High Tide repo,
`docs/market-research.md` §6). This is a legal guardrail, not a style choice.

## Copy rules (same law, same reasons)

- Never add: price, R__/gram, buy, order, menu, delivery, stock, shop.
- The site may say: private collective, adults, 18+, craft, story, conversation.
- The WhatsApp prefill stays neutral ("Hey — I found The Roach."). What happens
  inside a private 1:1 chat is the client's own business — that separation is the
  entire compliance architecture of this site.

## SEO — what to target, and what not to

Researched and adversarially verified July 2026. The short version: **the
defensible queries and the winnable queries are almost the same set.** The
conflict is narrower than it looks.

> **This section is the strategy — the reasoning behind the choices.**
> For the do-it-now checklist (Search Console, Google Business Profile
> copy, NAP block, review request, publishing cadence) see
> [SEO-TODAY.md](SEO-TODAY.md). Keep the two in step: if the strategy here
> changes, the checklist is what someone will actually be following.

### Three tiers. The middle one is the trap.

**✅ TARGET — describes what the entity IS**
`the roach knysna` · `high tide knysna` (legacy brand — the domain's history is
built on it) · `cannabis club knysna` · `cannabis social club knysna` ·
`private cannabis collective` · `cannabis club plettenberg bay / george /
sedgefield / mossel bay` · `how to join a cannabis club south africa` ·
`is weed legal in south africa` · `420 friendly garden route`

**🚫 DO NOT TARGET — describes a transaction**
`buy weed knysna` · `weed delivery knysna` · `dagga for sale` · `weed near me` ·
and especially `dispensary knysna`.

**Why, since the site has no prices?** Because the offence attaches to the
*conduct*, not the page. CfPPA s1 folds "advertise for sale" into "deal in"
(s4(1), up to 10 years); the Act is not yet in force, so operative law is DDTA
140/1992 as read down by *Prince*, where dealing is proved **by inference from
conduct**. Keyword targeting is self-authored, timestamped, discoverable evidence
of intent to reach purchasers — title tags, H1s, schema, sitemaps, Search Console
query data and any SEO brief are all written records. A page engineered to
intercept "buy weed Knysna" and funnel it to WhatsApp is not rescued by the
absence of a price list; the sale simply happens one tap later, in a channel that
documents individual transactions rather than a general offer. Enforcement in
this district is not hypothetical.

The middle tier is winnable *precisely because* the field is thin. That is the
temptation, and it is the whole risk surface.

### Vernacular

"Dagga" is culturally dominant in SA but skews **informational** ("is dagga
legal"), not source-seeking. "Zol", "skyf", "boom", "entjie" denote a joint, not
a supplier — near-zero commercial intent. People looking for a source search
English commercial terms, because that is how the businesses name themselves.
**"cannabis club" is the money term.** (Re-verify with a ZA-geolocated keyword
tool before committing more copy.)

### What was fixed here

- **The page never said "cannabis."** Not once in the body — it said "the plant"
  throughout, so on-page relevance for the target phrase was nil while Google's
  index still described the domain as "Cannabis Club in Knysna". Now named
  naturally in the opening and the collective section. Naming the category is not
  an offer to sell; it is what makes the page both findable and defensible.
- **Title** now `The Roach — Cannabis Club in Knysna, Garden Route` (49 chars),
  echoing the legacy title so the entity reconciles rather than competes.
- **Schema** gained `description`, `email`, `areaServed`, and `alternateName`
  including the legacy brand.

### Still thin — 325 words

Below the floor for competitive queries, though the floor here is low (the
nearest real competitor, thc710.co.za, is ~350 words on one page). **Three pages
would close it**, and they are exactly the defensible-tier pages:
`/collective/` (membership, the closed-circle principle), `/cannabis-law-south-africa/`
(the only page in this niche that reliably earns links), and
`/garden-route/` (visitor intent — nobody serves cannabis-tourism on this
corridor). Needs client sign-off on copy, so not built.

### Two open decisions for the client — not for us

1. **Street address + geo in schema, and LocalBusiness instead of Organization.**
   This is what feeds the map pack and it would help rankings. It is also a
   public, machine-readable declaration of exactly where the premises are.
   Currently locality-only, deliberately.
2. **The Google Business Profile reclaim.** The single most valuable asset in the
   engagement — real reviews, and the map pack is the larger channel for a local
   club. Also a verified, address-confirmed public record. If he proceeds:
   **sequence the changes.** Request ownership → verify → wait 3–4 weeks →
   rename only → wait 3–4 weeks → move the pin. Doing ownership, rename and
   address together in a cannabis vertical is a reliable route to suspension, and
   the existing reviews are not recoverable.

## SEO — recovering the old ranking

The domain ranked before it went dark; Google still remembers the WooCommerce URLs.

- `public/.htaccess` 301s every old path (`/shop/*`, `/product-category/*`,
  `/product/*`, `/brand/*`, `/contact-us-the-roach/`, cart/checkout/wp-*) to the
  new home, and canonicalises to **https://www.theroach.co.za** (www — matching
  the old index, so history transfers).
- JSON-LD `Organization` (no offers, no prices — deliberately), OG image, canonical,
  robots.txt + sitemap.xml on the www host.
- **After DNS cutover:** verify the domain in Google Search Console, submit the
  sitemap, and use "Validate Fix" on the old 404s. The old Google Business Profile
  with its reviews should be reclaimed/updated — the reviews live on the GBP, not
  the website; the site just has to be the consistent canonical home.

## Deploying to xneelo

1. `npm run build`
2. Upload the **contents** of `out/` (including the dot-file `.htaccess`) to
   `public_html/`.
3. Point DNS/docroot at it. Confirm `https://theroach.co.za/shop/` 301s to
   `https://www.theroach.co.za/`.

## Before launch — blockers

- [ ] **⚠️ VERIFY THE WHATSAPP NUMBER** in `src/lib/config.ts`. The current value
      (064 928 8682) came from an old directory listing, NOT from the client. Every
      order conversation routes through it — this is the single highest-stakes
      value on the site.
- [ ] **Look at it in a real browser.** The build environment's preview pane never
      composited (`document.hidden`, 0 rAF frames), so no animation was ever
      observed running and no screenshot exists. Geometry, state and payload were
      verified by measurement; **visual quality was not**.
- [ ] **Check the video on a real phone.** It was 4.3MB at 1440² High L4.0 and
      reportedly did not play on mobile at all; it is now 117KB at 720² Main
      L3.1 with the `muted` attribute asserted for iOS. That should fix it, but
      the fix has not been confirmed on an actual handset.
- [ ] Client sign-off on the story copy (it makes factual claims: fifteen years,
      organic, no pesticides).
- [ ] The legal footer line has not been attorney-reviewed.
- [ ] Search Console verification + sitemap submission after DNS cutover.

## Verified

- **Build** clean. TypeScript pinned to 5.9 — **do not move to 7.x**, it crashes
  the Next 16 build worker (`The "id" argument must be of type string`).
- **Pricing guard red-teamed**: planting `TheRoachPricing.png` in `public/` fails
  the build with exit 1. Removing it restores a clean build.
- **Static export audited**: no hidden inline styles; all six sections' copy
  present; zero price/order/buy/menu language; `.htaccess` and the video both
  survive the export (Next does copy dotfiles from `public/`).
- **Deck**: burst of 5 wheel events advances exactly 1; cooldown then allows the
  next; trackpad micro-deltas (<8) ignored; ↑/↓/Home/End and the dot rail all
  work; clamps at both ends; page never scrolls; no horizontal overflow.
- **Hero geometry** measured live: stage exactly square, wordmark renders at
  84.5–99% of it (clears the ember band), visible at opacity 1.
- **Responsive**: 11 viewports from 280×500 to 2560×1080 — wordmark never
  overflows the stage, column always fits, no collision with the hint.
- **Contrast**: measured by compositing each computed colour on canvas (Tailwind 4
  emits `oklab()`, which naive regex parsing gets wrong — an earlier audit gave a
  false pass this way). The 18+ and legal lines were failing at 1.89–2.68:1 and
  were raised to clear AA 4.5:1.

### Not verified — please check

**Visual appearance.** The build environment's preview pane never composited
(`document.hidden === true`, **0 rAF frames in 1200ms**), so Motion could not
advance a single animation and no screenshot was ever possible. Everything above
is measurement, not looking. Run `npm run dev` and see it with your own eyes.
