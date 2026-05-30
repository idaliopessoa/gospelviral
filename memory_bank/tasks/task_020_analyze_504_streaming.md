# TASK_020: Analyze long-run resilience — kill the spurious 504
timestamp: 2026-05-29T00:00:00Z
version: 1.0
status: Complete (merged via PR #9 on 2026-05-30)
owner: unassigned
confidence: HIGH (root cause pinned by spike + fix verified with a real run)
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

## Deep Analysis (Pass 1 — root cause, timeout chain, approach)

### Confirmed root cause
The spurious 504 is `withTimeout` (`analyze.js:59-67`) aborting on **`c.req.raw.signal`** — the *incoming-request* abort that fires when the client/proxy **disconnects mid-analysis** — NOT the app timeout. The abort kills the adapter (CLI process group, `claude-cli.js:36-58`) → `AbortError` (`claude-cli.js:158-162`) → `mapAdapterError` → **HTTP 504 `{code:'timeout'}`** (`analyze.js:47`). AUTO and forced-CLI share this path (`pickAdapter` 34-35 vs 21-25) — not a mode bug.

The 10-min app timeout is NOT the usual trigger: `.env.local` sets `ANALYZE_TIMEOUT_MS=600000` and the observed 504s are *fast/sequential*, not 10-min waits. That timeout is the **legit** path and must stay.

### Why the connection drops — the silent long-pole
`/api/analyze` is request→response with **JSON-only, zero bytes until the very end** (DEC_021). During the multi-minute CLI run the server emits **no response bytes**, so every intermediary treats the socket as idle and eventually closes it:
- **Dev:** Vite `http-proxy` (`vite.config.js` — no `proxyTimeout`) sits between browser :5173 and server :8787.
- **Prod:** no Vite proxy, but a real reverse proxy / CDN (nginx, Cloudflare…) with a default idle/gateway timeout (commonly 60–100 s) plus the browser's own limits.
- Node `@hono/node-server` `serve()` uses Node v24 defaults (`headersTimeout` 60 s, `requestTimeout` 300 s) — these govern **receiving the request**, not a slow *response*, so not the direct cause, but worth setting explicitly.

Whatever fires first → socket closes → `c.req.raw.signal` aborts → 504. **This is BOTH a dev and a prod problem** — a fix that only tunes the Vite proxy (option C) does NOT cover prod.

### Approach options (lens-evaluated)
- **(A) SSE / event stream** — flush `200`+headers immediately, periodic `heartbeat` events, terminal `result`|`error` event. Amends DEC_021. **Contract-preserving insight:** the `lib/api.js` black box keeps its PUBLIC surface `analyzeMoments(request) → Promise<AnalysisResponse>` — the SSE wire is an *implementation detail inside api.js*; `useAnalyze`/`ResultsView`/`SubtitlePreview` are untouched. Carries a terminal error event (no "200 already committed" trap). Bonus: real progress for `AnalyzingView` (today fakes a rotation).
- **(B) Keep-alive heartbeat on the JSON path** — periodic whitespace byte before the final JSON (JSON.parse tolerates leading whitespace). Smaller, preserves "one JSON response." **Weakness:** `200`+headers commit at first byte → a late failure can't change the HTTP status (errors must hide in-body — a contract smell). No progress UI.
- **(C) Timeout tuning** (Vite `proxyTimeout`, Node `requestTimeout`/`headersTimeout`) — smallest, **dev-only**, ignores prod gateways + the browser. A complement, not the cure.

**Lens recommendation: (A) SSE** — intermediary-agnostic (bytes flow → no idle close, dev+prod), keeps the api.js public contract stable, carries typed terminal errors, unblocks real progress. Cost: formally amends **DEC_021**, largest change. **Confirm with the spike + human before Pass 2 commits.**

### Diagnosis spike (run FIRST in Pass 2 — converts confidence LOW→HIGH)
1. Instrument the route (log start/end + elapsed); reproduce a real long CLI analyze; record **elapsed-time-to-504** and whether `c.req.raw.signal` fired (disconnect) vs the 10-min timer.
2. Isolate **which intermediary** closes first: `curl` direct to `:8787` held N minutes vs via-proxy `:5173`.
3. Confirm **prod relevance** (`pnpm build` + static serve hitting `:8787` directly — still drops?).
4. Output: a DEC fixing the approach (A/B/C) on measured evidence.

### Spike result (020.1) — ROOT CAUSE CORRECTED ✅
The deterministic test + a real repro **disproved the disconnect hypothesis.** The `[analyze-diag]` instrument on a real "Analisar" logged:
```
[analyze-diag] abort=app_timeout elapsedMs=120001 timeoutMs=120000
```
- The abort was the **app's own timer at 120 s**, NOT a client/proxy disconnect.
- `timeoutMs=120000` = the **default** (`DEFAULT_ANALYZE_TIMEOUT_MS` in `env.js`), NOT the `600000` in `.env.local`.
- Cause: **`.env.local` is never loaded** by `pnpm dev` (`node --watch` with no dotenv / `--env-file`; nothing in `apps/server/src` reads it). So `ANALYZE_TIMEOUT_MS=600000` is dead in dev → the route runs with the 2-min default → a real multi-minute CLI analysis is killed at 120 001 ms → 504. Deterministic, not flaky.
- Confirmed `node --env-file-if-exists=../../.env.local` loads `ANALYZE_TIMEOUT_MS=600000` (`.env.local` is plain `KEY=VALUE`).

**Approach pivot (evidence-based):** the 504 is a **config-loading + timeout-policy** bug, NOT a transport/disconnect problem. SSE/heartbeat (options A/B) are **descoped** from the critical fix (kept as a ROADMAP UX/robustness item — no-feedback wait + genuinely-long runs). DEC_021 is **NOT** reversed.

**Fix (020.2), in order of evidence:**
1. **Load `.env.local` in the server** — `dev`/`start` scripts use `node --env-file-if-exists=../../.env.local …` so the configured `ANALYZE_TIMEOUT_MS` (and PORT/LOG_LEVEL) actually apply. (Applied; pending user re-test.)
2. **Raise the too-low default** `DEFAULT_ANALYZE_TIMEOUT_MS` (120 s → a value ≥ a real analysis, e.g. 600 s) so prod / no-`.env.local` is sane too.
3. Keep the `[analyze-diag]` reason/elapsed log as a structured server log (or remove) — decide in 020.2.
4. Re-test: if a >timeout run now shows `abort=client_disconnect` before the timer, THEN (and only then) revisit the transport keep-alive.

**Complexity now LOWER** (config + a constant; single domain) → decomposition likely unnecessary; 020.1 (spike, done) + 020.2 (fix + tests) suffice, 020.3 (web consumer) only if the transport actually changes (it won't, under this fix).

## TASK_COMPLEXITY_ASSESSMENT
COMPONENTS: MEDIUM (analyze route · api.js · server bootstrap/timeouts · `AnalyzingView` if progress · vite/prod proxy). INTERFACES: MEDIUM–HIGH (the analyze transport wire; SSE amends DEC_021 but keeps api.js's public surface). DOMAINS: LOW–MEDIUM (backend transport + thin web consumer). COGNITIVE_LOAD: MEDIUM (single context). → **Two+ MEDIUM → DECOMPOSITION RECOMMENDED (light, Pass 2):** `020.1` diagnosis spike (+DEC) → `020.2` server transport (heartbeat + terminal result/error; abort/timeout still typed) → `020.3` web consumer (api.js consumes the stream, still resolves `AnalysisResponse`; optional real `AnalyzingView` progress). Hard edge: 020.1 → 020.2 → 020.3. **Confidence stays LOW until 020.1; expected MEDIUM/HIGH after, approach locked by DEC.**

## Subtasks (Pass 2 — decomposed)

> Dependency: **020.1 → 020.2 → 020.3** (hard chain — the spike's DEC picks the approach the next two implement). One branch `feature/task-020-analyze-504`.

### SUBTASK_020.1: Diagnosis spike + approach DEC
**Status**: ✅ Complete — root cause = app-timeout at the 120 s default because `.env.local` (600 s) is never loaded by `pnpm dev`; disconnect hypothesis disproved. Deterministic disconnect→504 test added; pivot recorded (see Spike result).
#### Black Box Interface
**INPUT**: `routes/analyze.js` (`withTimeout`), `vite.config.js`, `server.js`; the 504 evidence; a **slow/aborting stub adapter via DI** (`createAnalyzeRouter({ runViaCli })`) — no real LLM. A throwaway slow route for live proxy/direct/prod-build measurement.
**OUTPUT**: (1) deterministic server tests proving **disconnect (`c.req.raw.signal`) → 504** vs **app-timeout → 504** vs **success-before-either → 200** (locks the legit path apart from the bug); (2) measured evidence of WHERE/WHEN the connection drops (dev proxy `:5173` vs direct `:8787` vs `pnpm build` static + direct); (3) a **DEC** fixing the approach (A SSE / B heartbeat / C tune) on that evidence. Evidence dir: `memory_bank/tasks/evidence/task_020/`.
**INVARIANTS**: zero LLM cost (stub/slow route only); legit timeout path preserved; no change to the public analyze contract yet.
#### Acceptance
- [ ] Test: stub adapter + fired `c.req.raw.signal` → 504 `{code:'timeout'}`; stub slower than `timeoutMs` → 504; stub resolves first → 200.
- [ ] Empirical: a long hold drops via the proxy (repro) and the direct/prod behavior recorded.
- [ ] DEC written choosing A/B/C with the evidence.
#### Dependencies — Depends on: none · Blocks: 020.2. Effort: Medium.

### SUBTASK_020.2: Fix — load `.env.local` + sane default timeout (pivoted from "transport")
**Status**: ✅ Implemented (user-verified 200) — `dev`/`start` use `node --env-file-if-exists=../../.env.local`; `DEFAULT_ANALYZE_TIMEOUT_MS` 120 s → 600 s; temp `[analyze-diag]` removed; disconnect→504 test retained. NOTE: scope pivoted from SSE/heartbeat (the spike disproved the disconnect cause). Original transport text below kept for history.
#### Black Box Interface
**INPUT**: 020.1 DEC (chosen approach); `routes/analyze.js`; `server.js` (explicit Node timeouts if needed).
**OUTPUT**: the chosen transport — (A) flush `200`+headers early + periodic `heartbeat` + terminal `result`|`error` event (SSE), or (B) heartbeat-padded JSON — so no intermediary idle-closes the socket; a genuine over-`ANALYZE_TIMEOUT_MS` run still returns a **typed** timeout; AUTO==CLI path preserved. Tests: heartbeat emitted, terminal result, terminal error, disconnect, timeout. CC ≤ 15 (extract the heartbeat/stream writer).
**INVARIANTS**: `/api/analyze` stays mode-agnostic (consumer never branches on CLI/API); DEC_021 amended via a DEC if SSE; zero regressions on analyze/adapter tests.
#### Acceptance
- [ ] Long stub run no longer drops (heartbeat keeps it alive); real timeout still typed.
- [ ] Server tests for heartbeat + terminal result/error + disconnect + timeout green.
#### Dependencies — Depends on: 020.1 · Blocks: 020.3. Effort: Medium–High.

### SUBTASK_020.3: Web consumer — stream-aware api.js (contract stable)
**Status**: ❌ Not needed — the fix did NOT change the transport wire (still JSON-only), so `api.js` is untouched. Would only apply if the SSE/progress ROADMAP item is later picked up.
#### Black Box Interface
**INPUT**: 020.2 wire format; `apps/web/src/lib/api.js`; `useAnalyze`; `AnalyzingView` (optional real progress).
**OUTPUT**: `lib/api.js` consumes the new wire but keeps its PUBLIC surface `analyzeMoments(request) → Promise<AnalysisResponse>`; the terminal error event maps to `AnalyzeClientError`; (optional) real progress fed to `AnalyzingView` (replaces the faked rotation). Tests: stream → resolves `AnalysisResponse`; terminal error → throws `AnalyzeClientError`; abort honored; example short-circuit untouched.
**INVARIANTS**: api.js public surface stable → `useAnalyze`/`ResultsView`/`SubtitlePreview` untouched; example fixture path unchanged.
#### Acceptance
- [ ] api.js stream consumer resolves `AnalysisResponse`; terminal error throws typed; abort works.
- [ ] No change to `useAnalyze`/`SubtitlePreview` contracts.
#### Dependencies — Depends on: 020.2 · Blocks: none. Effort: Medium.

## Prerequisite Subtasks (MANDATORY)
### SUBTASK_020.P1: GitFlow
**Status**: ⏱️ Not Started — branch `feature/task-020-analyze-504` from `develop`; conventional commits `(server)`/`(web)`; PR → develop; Co-Authored-By.
### SUBTASK_020.P2: Tests
**Status**: ⏱️ Not Started — TDD/AAA; disconnect-vs-timeout status tests; ≥80% new code; zero regressions on analyze/adapters; CC ≤ 15.
### SUBTASK_020.P3: Finalization
**Status**: ⏱️ Not Started — lint 0; coverage; `pnpm sonar` PASS + S3776=0; real long-analyze smoke (no spurious 504); smoke:heap N/A (confirm — no hot-path file); auditor; PR with SonarCloud block.
