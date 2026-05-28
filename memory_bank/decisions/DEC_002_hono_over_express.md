# DEC_002: Hono over Express

Date: 2026-05-28
Status: Accepted

## Decision
`apps/server` uses Hono (with `@hono/node-server`) instead of Express.

## Why
- Native SSE primitives — needed for `POST /api/analyze` streaming.
- Web Fetch API request/response shape — testable without an HTTP server (call `app.fetch(req)` directly).
- ESM-native, no CommonJS bridge for Node 20+.
- Smaller surface; route handlers stay legible without middleware sprawl.

## Consequences
- Server tests bypass a real socket: `app.fetch(new Request(...))` in Vitest.
- Anthropic SDK and CLI spawn isolated in `apps/server/src/runtime/` — Hono handlers stay thin (TASK_009).
