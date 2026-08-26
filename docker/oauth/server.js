/**
 * GitHub OAuth helper for Decap CMS — the whole thing, dependency-free.
 *
 * Written in-house DELIBERATELY: the alternative is running some third-party
 * "netlify-cms-oauth-provider" image with root on the same box as the mail
 * stack. This is ~70 lines you can read.
 *
 * The dance (Decap's external-auth protocol, unchanged since Netlify CMS):
 *   1. Decap opens a popup to  /auth        → we bounce it to GitHub authorize
 *   2. GitHub sends the user to /callback   → we swap the code for a token
 *   3. The callback page posts the token to the opener via postMessage after
 *      the "authorizing:github" handshake, and the popup closes itself.
 *
 * The token never touches our disk and is never logged. CSRF is covered by the
 * state parameter, round-tripped through a short-lived HttpOnly cookie.
 */
import { createServer } from 'node:http';
import { randomBytes } from 'node:crypto';

const CLIENT_ID = process.env.OAUTH_CLIENT_ID;
const CLIENT_SECRET = process.env.OAUTH_CLIENT_SECRET;
if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('OAUTH_CLIENT_ID / OAUTH_CLIENT_SECRET not set — refusing to start.');
  process.exit(1);
}

const html = (body) =>
  `<!doctype html><meta charset="utf-8"><title>The Roach</title><body style="background:#000;color:#d3aa6a;font-family:system-ui">${body}</body>`;

createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');

  if (url.pathname === '/auth') {
    const state = randomBytes(16).toString('hex');
    const to = new URL('https://github.com/login/oauth/authorize');
    to.searchParams.set('client_id', CLIENT_ID);
    to.searchParams.set('scope', 'repo');
    to.searchParams.set('state', state);
    res.writeHead(302, {
      'Set-Cookie': `st=${state}; Max-Age=600; Path=/; HttpOnly; Secure; SameSite=Lax`,
      Location: to.href,
    });
    return res.end();
  }

  if (url.pathname === '/callback') {
    const cookieState = /(?:^|;\s*)st=([a-f0-9]+)/.exec(req.headers.cookie ?? '')?.[1];
    const state = url.searchParams.get('state');
    const code = url.searchParams.get('code');
    if (!code || !state || state !== cookieState) {
      res.writeHead(400, { 'Content-Type': 'text/html' });
      return res.end(html('State mismatch. Close this window and try again.'));
    }
    const r = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ client_id: CLIENT_ID, client_secret: CLIENT_SECRET, code }),
    });
    const data = await r.json();
    if (!data.access_token) {
      res.writeHead(502, { 'Content-Type': 'text/html' });
      return res.end(html('GitHub did not issue a token. Close this window and try again.'));
    }
    // Decap's handshake: wait for the opener to say hello, then hand over.
    const payload = JSON.stringify({ token: data.access_token, provider: 'github' });
    res.writeHead(200, { 'Content-Type': 'text/html', 'Set-Cookie': 'st=; Max-Age=0; Path=/' });
    return res.end(
      html(`Signing you in…<script>
        (function(){
          function deliver(e){
            window.opener.postMessage('authorization:github:success:${payload.replace(/[\\'<]/g, '')}', e.origin);
            window.removeEventListener('message', deliver);
          }
          window.addEventListener('message', deliver);
          window.opener.postMessage('authorizing:github', '*');
        })();
      </script>`),
    );
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('not here');
}).listen(3000, () => console.log('decap-oauth listening on :3000'));
