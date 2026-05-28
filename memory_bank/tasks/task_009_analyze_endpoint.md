# TASK_009: Analyze + Detect Endpoints
timestamp: 2026-05-27T00:00:00Z
version: 1.0
status: Ready
owner: unassigned
confidence: MEDIUM
phase: 2

## Black Box Interface

### INPUT
- **Required Context**:
  - `claude-code-bootstrap.md` §"Endpoint principal do backend"
  - `01-Systems-Architecture-Expert-viral-cristao.md` §"Project-Specific Black Box Boundaries" — row for `/api/analyze`
  - TASK_006 OUTPUT (`runViaApi`)
  - TASK_007 OUTPUT (`runViaCli`)
  - TASK_008 OUTPUT (`detectRuntime`, `clearDetectionCache`)
  - `viral-cristao-artifact.jsx` line ~1325 (the `fullPrompt` composition that wraps the transcript in `<transcript>` tags) — keep this composition server-side
- **Prerequisites**: TASK_006, TASK_007, TASK_008 (all Complete)
- **Parameters**: none beyond HTTP request bodies

### OUTPUT
- **Deliverables**:
  - `apps/server/src/routes/analyze.js` — handler for `POST /api/analyze`
  - `apps/server/src/routes/detect.js` — handler for `GET /api/runtime/detect`
  - `apps/server/src/lib/build-user-message.js` — encapsulates the transcript-wrapping logic (`OPTIMIZED_PROMPT` stays system-prompt only; transcript wraps into `<transcript>` tags inside user message)
  - `apps/server/src/lib/validation.js` — request-body validation: `{ url: non-empty string, transcript: non-empty string with at least one MM:SS timestamp, mode?: 'cli' | 'api' | 'auto', model?: 'default' | 'fast' | 'debug' }`
  - `apps/server/src/server.js` updated to wire the two routes
  - Vitest specs: full request lifecycle per (mode × validation × adapter outcome) — mocked adapters from TASK_006/007
- **Artifacts**:
  - Coverage ≥ 90% on routes; 100% on `validation.js` and `build-user-message.js`
  - SonarCloud Quality Gate = PASS; `javascript:S3776 = 0` on new code
- **Decisions Generated**:
  - DEC: response shape — JSON `200 { status: 'ok', data: AnalysisResponse }` on success, `4xx { status: 'error', code, message }` on validation, `5xx { status: 'error', code: 'adapter_failed', message }` on adapter failure (`DEC_XXX_response_envelope.md`)
  - DEC: SSE streaming explicitly **deferred to a future task** (recorded in `ROADMAP.md` by TASK_012); the analyzing-view loading messages stay client-side timed (preserves artifact behavior)
  - DEC: timeout — server enforces a **120s `AbortSignal` default** per request, **configurable via the `ANALYZE_TIMEOUT_MS` env var** (read through `env` from TASK_005). 120s gives the CLI mode enough headroom (slower than API) without leaving hung requests. Both adapter calls receive the signal so `AbortSignal` cancellation propagates to `fetch` (TASK_006) and to the child process group (TASK_007). `DEC_XXX_analyze_timeout.md`

### INVARIANTS
- **Must Maintain**:
  - `viral-cristao-artifact.jsx` at the repository root remains **byte-identical** until TASK_012
  - `mode: 'auto'` (or omitted) uses `detectRuntime().recommended` to select; `mode: 'cli'` forces CLI (returns 503 if unavailable); `mode: 'api'` forces API (returns 503 if no key)
  - The response `data` field is the canonical `AnalysisResponse` — **identical shape regardless of which adapter ran**
  - Server never returns the raw Anthropic response without going through `parseAnalysisResponse` (lives in `@gospelviral/shared`, invoked inside the adapters from TASK_006/007)
  - `API_KEY` never appears in any response body or log line that escapes the server
  - `transcript` content never appears in process argv or in error messages returned to the client (only in logs at debug level)
- **Quality Gates**:
  - One spec per mode (`cli`, `api`, `auto`) × per outcome (success, validation fail, adapter fail, timeout)
  - One spec asserts `GET /api/runtime/detect` returns the same shape as `detectRuntime()` returns internally
  - SonarCloud Quality Gate = PASS; `javascript:S3776 = 0`

## Task Definition
Expose the two HTTP routes that the frontend consumes: `POST /api/analyze` for the full viral-moment analysis (with mode routing across CLI and API adapters), and `GET /api/runtime/detect` for the badge UI to know which mode is active. Validation, error mapping, prompt composition, and timeout enforcement live here. SSE streaming is deliberately out of scope and queued for the roadmap; this task ships JSON-only responses to keep the contract tight.

## Success Criteria
1. `POST /api/analyze { url, transcript }` with `mode` omitted and CLI present → returns `200 { status: 'ok', data: AnalysisResponse }` produced by `runViaCli`
2. Same request with `mode: 'api'` → returns the same response shape produced by `runViaApi`
3. `mode: 'cli'` with CLI absent → `503 { status: 'error', code: 'cli_unavailable', message }`
4. Body missing `transcript` → `400 { status: 'error', code: 'invalid_body', message }`
5. Adapter rejects → `502 { status: 'error', code: 'adapter_failed', message }`; sensitive content stripped
6. Request exceeds `ANALYZE_TIMEOUT_MS` (default 120 000ms) → server aborts adapter, returns `504 { status: 'error', code: 'timeout', message }`
7. `GET /api/runtime/detect` returns `{ cli, apiKey, recommended }` matching `detectRuntime()` exactly
8. SonarCloud Quality Gate = PASS; `javascript:S3776 = 0`
9. `.jsx` at root is byte-identical to pre-task state

## Risk Assessment
| Risk | Level | Mitigation | Detection |
|---|---|---|---|
| Mode selection logic forks too many code paths → Cognitive Complexity > 15 | MEDIUM | Extract `selectAdapter(mode, detection)` returning a function reference; the handler stays `await adapter(args)` | sonar (`@sonar/scan`) reports S3776 |
| Validation error messages leak request internals | LOW | Validation returns a fixed-vocabulary `code` plus a generic message; details go to log only | Spec asserts client-facing messages |
| Adapter timeout doesn't actually cancel child process / fetch | HIGH | TASK_006 and TASK_007 both implement `AbortSignal`; this task wires the timeout signal into both | Integration spec with a deliberately slow mocked adapter |
| `validation.js` reinvents Joi / Zod with bugs | LOW | Three rules only (`url`, `transcript`, optional enums) — hand-roll fits; Zod is the swap-in if scope grows | Code review |
| Frontend sends stale `mode` after CLI is uninstalled | LOW | Server re-checks detection on each request when `mode === 'cli'`; if absent, returns 503 with `recommended` populated so frontend can update | Spec covers post-uninstall request |

## Implementation Strategy
1. Implement `validation.js` first with full spec coverage
2. Implement `build-user-message.js` (single pure function); pin via spec against the `.jsx`'s `fullPrompt` construction. **Pass 2 note: do not rely on the line-number reference in this task file — when implementing, copy the exact `fullPrompt = ...` template literal from the artifact (around line ~1325 today, but the line number drifts as the file evolves) and commit it as a frozen fixture under `apps/server/src/lib/__fixtures__/full-prompt.fixture.js`. The spec asserts the live output of `build-user-message.js` equals the fixture for a known input pair. This pins the prompt composition against the artifact behavior even after the `.jsx` is archived in TASK_012.**
3. Implement `routes/detect.js` (thin wrapper over `detectRuntime`)
4. Implement `routes/analyze.js`: validate → resolve mode → select adapter → call with timeout → return envelope
5. Wire routes in `server.js`
6. Lint, sonar (`@sonar/scan`), finalize

## Prerequisite Subtasks (MANDATORY)

### SUBTASK_009.P1: GitFlow Workflow
**Status**: ⏱️ Not Started
- Branch: `feature/task-009-analyze-endpoint` from `develop`
- Commits: `feat(server): request validation`, `feat(server): build-user-message util`, `feat(server): /api/runtime/detect`, `feat(server): /api/analyze with mode routing`
- PR targeting `develop`, reviewed, source branch deleted after merge

### SUBTASK_009.P2: Tests Workflow
**Status**: ⏱️ Not Started
- TDD per route handler with mocked `runViaCli` / `runViaApi` / `detectRuntime`
- AAA in every spec
- Coverage ≥ 90% on routes
- Zero regressions on TASK_001..TASK_008
- Cognitive Complexity ≤ 15

### SUBTASK_009.P3: Task Finalization
**Status**: ⏱️ Not Started
- `pnpm lint`, `pnpm -F server test --coverage`, build green
- `sonar` runs locally; Quality Gate = PASS; `javascript:S3776 = 0`
- Browser smoke (Chrome DevTools MCP): skipped (server-only task)
- Git finalize with conventional commits + `Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>` trailer
- PR description includes the SonarCloud block
- On-screen execution summary at task close

## Subtasks
> Pass 2 — to be expanded on approval. Expected ~4 subtasks (validation, build-user-message, detect route, analyze route).
