# The Roach — build the static export, then serve it with nginx.
#
# The site is `output: 'export'` (see next.config.mjs), so there is no Node
# server at runtime: `next build` emits plain HTML/CSS/JS/assets and nginx serves
# them. That keeps the runtime image tiny (~25MB) and means the container has no
# application surface to attack.

# ── Stage 1: build ────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app

# Install deps first so this layer caches across content-only changes.
COPY package.json package-lock.json ./
# `npm ci` needs devDependencies here — next, typescript and tailwind all live
# there or are needed to build, so do NOT pass --omit=dev.
RUN npm ci

COPY . .

# The prebuild/postbuild hooks run scripts/guard-pricing.mjs, which fails the
# build if the client's pricelist ever reaches a publish path. Keep them.
RUN npm run build

# ── Stage 2: serve ────────────────────────────────────────────────────────────
FROM nginx:1.27-alpine AS runner

# Static export only — no node_modules, no source, no logoassets in the image.
COPY --from=builder /app/out /usr/share/nginx/html
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

# Fail the container if nginx stops serving, so the platform can restart it.
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
  CMD wget -qO- http://127.0.0.1/ >/dev/null 2>&1 || exit 1

CMD ["nginx", "-g", "daemon off;"]
