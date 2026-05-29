# TASK_020: Analyze long-run resilience — kill the spurious 504
timestamp: 2026-05-29T00:00:00Z
version: 1.0
status: Planning
owner: unassigned
confidence: LOW
phase: 5 (spun out of TASK_019 / O1)

> Spun out of the TASK_018 follow-up (defect O1) per human decision — it is architectural (touches the `/api/analyze` transport contract, may reverse DEC_021 "JSON-only"). Investigated context in `memory_bank/tasks/evidence/local-smoke/task_018_playback_bug.md` (§504 root) + `task_018_followup_INSUMOS.md` (O1).

## Black Box Interface
### INPUT
- **Required Context**:
  - `apps/server/src/routes/analyze.js` — `withTimeout(adapter.fn, c.req.raw.signal, timeoutMs=600000, abortController)`; aborts on (1) 10-min app timeout OR (2) `c.req.raw.signal` (client/proxy disconnect) → `AbortError` → HTTP 504 "Analysis exceeded the timeout."
  - `apps/web/src/lib/api.js` — `fetch('/api/analyze')` (JSON-only consumer; DEC_021)
  - `apps/web/vite.config.js` — dev proxy `/api` → :8787 (no `proxyTimeout` set)
  - `apps/server/src/server.js` — `@hono/node-server` `serve()` (Node defaults: requestTimeout 300s, headersTimeout 60s)
  - `apps/server/src/runtime/{claude-cli,claude-api}.js` — adapters (signal-aware)
  - DEC_021 (JSON-only, no SSE) — this task may revisit it
  - Evidence: a real ~5–8 min CLI analysis 504s repeatedly via the dev proxy; reqid 57/58/59 = 504, reqid 60 = 200 (completed before disconnect). AUTO and forced-CLI are the SAME code path (`pickAdapter` lines 25 & 35) — not a mode bug.
- **Prerequisites**: TASK_009/010 (analyze route + transport) — Complete.
- **Parameters**: none.

### OUTPUT
- **Deliverables** (approach chosen during this task's own Pass 1/2):
  - A `/api/analyze` transport that **holds the long connection alive** so neither the dev proxy nor the browser drops it before the (possibly multi-minute) analysis completes → no spurious 504. Candidate approaches (decide with evidence):
    - (A) **SSE / streaming** progress events (flush headers early, heartbeat) — reverses DEC_021; biggest change; also unblocks a real progress UI.
    - (B) **Keep-alive heartbeat** on the JSON response path (periodic whitespace/chunk) to defeat idle-socket timeouts — smaller, preserves JSON-only.
    - (C) **Timeout tuning** (dev proxy `proxyTimeout`, server `requestTimeout`/`headersTimeout`) — smallest, dev-only, may not fix the browser side.
  - Distinguish the genuine 10-min app-timeout 504 (legit) from the premature disconnect 504 (the bug) so the legit timeout still returns a clean error.
- **Artifacts**: server route tests (disconnect vs timeout → correct status), api.js consumer tests, real long-run smoke (no 504). Possible DEC (DEC_021 reversal or amendment).

### INVARIANTS
- **Must Maintain**: the `/api/analyze` contract stays stable across CLI and API modes (consumer never branches on mode); a real >timeout run still returns a clean `timeout` error; `ANALYZE_TIMEOUT_MS` honored; zero regressions on analyze route + adapter tests.
- **Quality Gates**: lint 0; Vitest green + ≥80% new code; `pnpm sonar` PASS + S3776=0; real long-analyze smoke (no spurious 504); auditor AUDITORIA LIMPA. smoke:heap N/A (no upload/video-storage/multipart touched) — confirm.

## Task Definition
Make a long real analysis (CLI spawning Claude over a large transcript, multiple minutes) complete without a spurious 504: hold the request connection alive end-to-end through the dev proxy and browser, while still returning a clean timeout error when the genuine `ANALYZE_TIMEOUT_MS` ceiling is hit. Decide between SSE (DEC_021 reversal), a keep-alive heartbeat, and timeout tuning.

## Success Criteria
1. A real CLI analysis that takes several minutes returns `200` with the moments (no 504 from disconnect).
2. A genuine over-`ANALYZE_TIMEOUT_MS` run still returns a clean `504 {code:'timeout'}` (legit path preserved).
3. AUTO and forced-CLI behave identically (already same code path — keep it).
4. Sonar QG PASS, S3776=0, auditor clean.

## Risk Assessment
| Risk | Level | Mitigation | Detection |
|---|---|---|---|
| SSE reverses DEC_021 + touches the public transport contract | HIGH | Evaluate (A)/(B)/(C) with evidence in this task's Pass 1; prefer the smallest that holds both proxy + browser | Real long-run smoke |
| Hard to reproduce deterministically (timing) | MEDIUM | Repro harness: a slow stub adapter that exceeds the disconnect window | Server test w/ fake-timer/slow adapter |
| Dev-only vs prod-relevant (proxy is dev) | MEDIUM | Confirm whether prod (no Vite proxy) also drops; design for prod too | Build/serve test |

## TASK_COMPLEXITY_ASSESSMENT
COMPONENTS: MEDIUM (analyze route, api.js, server bootstrap, vite proxy). INTERFACES: MEDIUM–HIGH (the analyze transport contract; SSE would change it). DOMAINS: LOW–MEDIUM (backend transport + thin web consumer). COGNITIVE_LOAD: MEDIUM. → Decomposition likely NOT required (single domain); decide at this task's own Pass 1.

## Prerequisite Subtasks (MANDATORY)
### SUBTASK_020.P1: GitFlow
**Status**: ⏱️ Not Started — branch `feature/task-020-analyze-504` from `develop`; conventional commits `(server)`/`(web)`; PR → develop; Co-Authored-By.
### SUBTASK_020.P2: Tests
**Status**: ⏱️ Not Started — TDD/AAA; disconnect-vs-timeout status tests; ≥80% new code; zero regressions on analyze/adapters; CC ≤ 15.
### SUBTASK_020.P3: Finalization
**Status**: ⏱️ Not Started — lint 0; coverage; `pnpm sonar` PASS + S3776=0; real long-analyze smoke (no spurious 504); smoke:heap N/A (confirm — no hot-path file); auditor; PR with SonarCloud block.
