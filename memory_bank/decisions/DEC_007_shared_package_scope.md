# DEC_007: Scope of `@gospelviral/shared`

Date: 2026-05-28
Status: Accepted

## Decision
`@gospelviral/shared` owns the primitives that cross the HTTP and persistence
boundaries: type definitions (JSDoc typedefs + frozen constants), the LLM I/O
contract (`OPTIMIZED_PROMPT` + `parseAnalysisResponse` + `AnalysisResponseError`),
and example fixtures (`EXAMPLE_URL`, `EXAMPLE_TRANSCRIPT`, `EXAMPLE_RESPONSE`).

Excluded from `@gospelviral/shared`:
- Any React, react-dom, or DOM globals
- The Anthropic SDK or any other wire-transport client
- UI-only helpers (subtitle chunking, scripture highlighting, video-id parsing,
  timestamp parsing) — these are render-coupled and live in `apps/web/src/lib/`

## Why
- The package must import cleanly in both Node (server adapters) and the
  browser bundle (web). React/DOM types would either break Node or bloat the
  web bundle.
- Wire transport belongs in `apps/server/src/runtime/` so the client never sees
  the Anthropic API; centralizing it in `shared` would push transport into
  the browser.

## Consequences
- ESLint flat config from TASK_001 enforces both boundaries with `no-restricted-imports`.
- TASK_006/007 will import `OPTIMIZED_PROMPT` and `parseAnalysisResponse` from
  `@gospelviral/shared` and never re-implement either.
