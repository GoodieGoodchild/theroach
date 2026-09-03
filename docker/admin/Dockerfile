# Journal desk. `git` commits the client's posts; `marked` renders the live
# preview using the EXACT same parser and options as the site build, so what he
# sees in the editor is what the page will show. A preview that diverges from
# the real output is worse than no preview.
FROM node:22-alpine
RUN apk add --no-cache git
WORKDIR /app
RUN npm install marked@16 --omit=dev --no-audit --no-fund
COPY server.js .
# Runs as `node`, not root: this container has the site repo mounted writable.
USER node
EXPOSE 3000
CMD ["node", "server.js"]
