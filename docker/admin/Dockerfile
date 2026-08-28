# Journal desk — one file, no npm dependencies. `git` is the only addition,
# and it is what commits and pushes the client's posts.
FROM node:22-alpine
RUN apk add --no-cache git
WORKDIR /app
COPY server.js .
# Runs as `node`, not root: this container has the site repo mounted writable.
USER node
EXPOSE 3000
CMD ["node", "server.js"]
