# Making a site analytics-ready

Hand this to whoever (or whatever) is working on a site hosted on the WeBuild Xneelo
server. It explains what the site must do so DevDash can report real, useful numbers
to the client.

**There is no tracking script to add.** Analytics comes from Caddy's access log, which
already sees every request. Nothing is installed on the site, no cookies are set, and
no consent banner is required. This document is about making what Caddy already sees
*meaningful*.

---

## 1. Non-negotiable: the Caddy log block

In `/srv/docker/proxy/caddy/Caddyfile`, every site block needs:

```
yoursite.co.za, www.yoursite.co.za {
    reverse_proxy yoursite:80

    log {
        format json
    }
}
```

Without this the site reports **zero traffic**. Everything else here is optional
polish; this is the one thing that must exist.

Validate before reloading — a broken Caddyfile takes down every site:

```bash
docker exec caddy caddy validate --config /etc/caddy/Caddyfile
docker exec caddy caddy reload  --config /etc/caddy/Caddyfile
```

---

## 2. What Caddy can and cannot see

| Measured automatically | Needs the site to cooperate |
|---|---|
| Page views, unique visitors | Conversions (enquiry sent, booking made) |
| Which pages are popular | Time on page, bounce rate |
| Referrers — Google vs Facebook vs direct | Clicks that don't load a page |
| Device, browser, OS | Scroll depth |
| Response times, errors, bandwidth | Visitor journeys across pages |
| Bot vs human traffic | |

The right-hand column is the gap. Section 3 closes most of it **without JavaScript**.

---

## 3. Conversions: give every meaningful action its own URL

This is the single highest-value change. Caddy logs URLs, so anything with a
distinct URL becomes measurable.

### Forms

**Do this** — after a successful submit, redirect to a real page:

```
/enquiry        →  POST  →  redirect to  /enquiry/thank-you
/booking        →  POST  →  redirect to  /booking/confirmed
/contact        →  POST  →  redirect to  /contact/sent
```

"14 hits on `/booking/confirmed` this month" is a conversion count you can put in
front of a client.

**Not this** — a JavaScript modal or an inline "Thanks!" message with no navigation.
Caddy sees nothing, so the conversion is invisible.

If the form POSTs to an endpoint that Caddy routes, the POST itself is already logged
and countable — but the redirect is better, because it confirms *success* rather than
merely *attempted*.

### Downloads and menus

Serve them as real paths — `/menu.pdf`, `/brochure.pdf`. Each request is logged.

> Note: DevDash treats `.pdf` as content, not as a static asset, so PDF views are
> counted as page views. Images, CSS and JS are excluded.

### Outbound and tel: links

These never reach the server and cannot be measured without JavaScript. If a client
genuinely needs "how many people tapped the phone number", say so and a small
beacon can be added — but don't add one speculatively.

---

## 4. Use real URLs for real pages

Caddy counts a page view when a request arrives. So:

- **Multi-page or static-export sites** (Astro, Next static export, plain HTML) —
  work perfectly with no changes. Each page is a request.
- **Single-page apps** (React Router, Vue Router) — only the *first* load is seen.
  Client-side navigation between routes is invisible to the server.

For an SPA, the practical fix is to make the pages that matter to the client real
server-rendered routes, or accept that only entry pages are counted. Don't add
client-side view tracking unless the client specifically needs per-route numbers.

Also:
- Avoid `#hash` routing — fragments are never sent to the server, so every page
  looks like `/`.
- Keep URLs human-readable. `/menu` and `/book-a-table` read well in a client
  report; `/p?id=47` does not.

---

## 5. Do not create fake traffic

Anything the site or server does to itself pollutes the client's numbers. DevDash
already excludes the obvious cases automatically, but the site should avoid creating
them in the first place.

**Already excluded automatically** — you don't need to do anything about these:

- Requests from the server's own public IP
- Docker internal networks (`172.16/12`, `10/8`, `192.168/16`, loopback)
- Known bots, crawlers and uptime monitors (Googlebot, UptimeRobot, Ahrefs, curl, …)
- Requests arriving under a domain this server doesn't serve

**Avoid creating these:**

- **Don't poll your own site from a cron job on the same server.** If you need a
  health check, use Docker's `HEALTHCHECK` — it runs inside the container against
  `localhost` and never reaches Caddy, so it cannot pollute anything.
- **Don't put an uptime monitor on a path that looks like a page.** Point it at
  `/healthz` and it will still be recorded, but it's obvious what it is.
- **Don't prefetch or preload whole pages** speculatively. `<link rel="prefetch">`
  on every link inflates page views with pages nobody looked at.
- **Don't let a service worker re-request pages in the background.** Cache-first
  for assets is fine; background revalidation of HTML is not.

**Excluding your own browsing:** add your office or home IP to the agent's
`ANALYTICS_EXCLUDE_IPS` so your own visits don't count as client traffic:

```bash
# /opt/devdash-agent/ecosystem.config.js
ANALYTICS_EXCLUDE_IPS: '41.20.9.0/24,105.4.200.11',
```

Accepts single IPs or CIDR ranges, comma-separated. Then:

```bash
cd /opt/devdash-agent && pm2 delete devdash-agent && pm2 start ecosystem.config.js && pm2 save
```

DevDash shows exactly how much was filtered and why, under
**Analytics → Filtered out of these numbers**. Nothing is dropped silently.

---

## 6. Caching that doesn't lie

Aggressive caching makes traffic *look* lower than it is, because repeat visits never
reach the server.

```nginx
# Hashed asset filenames — safe to cache forever, and excluded from page views anyway
location /assets/ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}

# HTML must revalidate, or repeat visits are invisible AND deploys don't take effect
location = /index.html { add_header Cache-Control "no-cache"; }
```

`no-cache` does not mean "don't cache" — it means "check with the server first".
The response is usually a small `304`, so the cost is negligible and the visit is
still counted.

---

## 7. Checklist

- [ ] `log { format json }` in the site's Caddy block
- [ ] `caddy validate` passes, config reloaded (not restarted)
- [ ] Every form redirects to a distinct success URL
- [ ] Key pages have real, readable server-side URLs
- [ ] No `#hash` routing for primary navigation
- [ ] Health checks use Docker `HEALTHCHECK`, not an external poll of the public URL
- [ ] No blanket prefetching of pages
- [ ] HTML served `no-cache`; hashed assets `immutable`
- [ ] Your own IP added to `ANALYTICS_EXCLUDE_IPS`
- [ ] Site appears in DevDash → Analytics with non-zero traffic after real visits

---

## 8. What the client actually sees

DevDash's **Overview** tab is written for clients: visitors, page views, views per
visitor, share of real (non-bot) traffic, most-visited pages, and where visitors came
from — with month-over-month comparison.

The **Technical** tab is for whoever runs the server: requests, error rate, response
times, bandwidth, bot share.

Both exclude bots and internal traffic. Visitors are counted once per day, so someone
returning on three days counts as three — the same convention Plausible and GA4 use.
