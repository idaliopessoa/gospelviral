# DEC_008: Artifact `parseJsonFromResponse` is NOT migrated to `apps/web`

Date: 2026-05-28
Status: Accepted

## Decision
The artifact's `parseJsonFromResponse` (lines ~459-468 of
`viral-cristao-artifact.jsx`) is intentionally **not** carried into
`apps/web/src/lib/`. The hardened replacement `parseAnalysisResponse` lives
exclusively in `packages/shared/src/parse-analysis-response.js` and is
consumed only by server-side adapters (TASK_006/007/009).

## Why
- After TASK_010, the web client calls `POST /api/analyze` and receives a
  clean envelope from the server. There is no raw LLM text to parse on the
  browser side.
- Keeping two parser copies in sync is a recipe for silent semantic drift.

## Consequences
- The "Ver exemplo pronto" path in `apps/web` uses `EXAMPLE_RESPONSE` directly
  (no parser round-trip).
- TASK_003/004 must wire `EXAMPLE_RESPONSE` through state without invoking any
  client-side parser.
