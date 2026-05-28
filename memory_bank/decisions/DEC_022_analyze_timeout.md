# DEC_022: 120 s analyze timeout, configurable via `ANALYZE_TIMEOUT_MS`

Date: 2026-05-28
Status: Accepted

## Decision
`POST /api/analyze` enforces a 120 000 ms timeout per request by default,
overridable via the `ANALYZE_TIMEOUT_MS` env var (parsed by
`apps/server/src/config/env.js`). The AbortController created inside the
route handler:

1. Receives the timer trigger.
2. Receives the request's own `c.req.raw.signal` (for connection close).
3. Propagates to the adapter call via the `signal` option (TASK_006 wires
   it into `fetch`; TASK_007 wires it into the child-process kill).

## Why
- The CLI mode is slower than the API mode (typically 30–60 s on real
  transcripts); 120 s gives both paths headroom without leaving hung
  requests holding sockets.
- A single configurable knob lets ops dial timeout per deploy (longer for
  heavy transcripts, shorter for kiosk mode) without touching code.
- AbortSignal threading was already paid for in TASK_006 and TASK_007; this
  task wires it together.

## Consequences
- On timeout, the response is `504 { status: 'error', code: 'timeout' }`
  per DEC_021.
- Tests use `timeoutMs: 5` to assert the path deterministically.
