# DEC_015: HTTP-status mapping inside `runViaApi`

Date: 2026-05-28
Status: Accepted

## Decision
`runViaApi` translates Anthropic HTTP responses into typed
`AdapterTransportError` instances with stable codes. The wire-format
mapping to client-facing HTTP status is the route layer's job (TASK_009).

| Anthropic status | code            | retryable |
|---|---|---|
| 401, 403          | `http_auth`     | false     |
| 429               | `http_rate_limit` | true    |
| 5xx               | `http_5xx`      | true      |
| other 4xx         | `http_4xx`      | false     |
| network fault     | `network`       | true      |
| AbortSignal       | re-throw `AbortError` (no wrap) | n/a |
| missing `top_moments` (or other parse failure) | re-throw `AnalysisResponseError` from `@gospelviral/shared` | n/a |

## Why
- API key bytes, request body excerpts, and Anthropic's `error.message`
  contents must never escape the adapter (could leak the prompt, partial
  PII, or token-stub material). Sanitized messages keep the adapter safe to
  log.
- Re-throwing `AnalysisResponseError` unchanged keeps the parser as the
  single validation owner — the adapter does NOT mask shared-parser
  semantics.
- A stable `code` on `AdapterTransportError` lets TASK_009 build a clean
  HTTP envelope without depending on Anthropic's message text.

## Consequences
- TASK_009 owns the `code → HTTP status` table for client responses.
- The smoke script in `apps/server/scripts/smoke-api.js` is the only way to
  exercise the real API; it is hand-driven (`--yes` required) and bills the
  account — never automate it.
