# DEC_024: Vite dev proxy target = `http://localhost:8787`

Date: 2026-05-28
Status: Accepted

## Decision
`apps/web/vite.config.js` hard-codes `server.proxy['/api']` to
`http://localhost:8787` (the server's `env.port` default). No
`VITE_API_PROXY_TARGET` env var: the proxy is dev-only and the port is
the same defaulted constant the server reads at boot.

## Why
- Production deployment will sit both apps behind a reverse proxy and the
  same-origin assumption holds without any proxy layer.
- Exposing a `VITE_*` env var to the bundle for a dev-only convenience
  pollutes the production build.
- Changing the port for dev is a one-line edit in two places (`PORT=` in
  `.env.local` for the server + the proxy entry); not worth a config
  abstraction.

## Consequences
- If a future dev needs to point at a remote backend, they edit
  `vite.config.js` for their session and don't commit the change.
