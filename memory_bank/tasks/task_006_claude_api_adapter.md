# TASK_006: Claude API Adapter
timestamp: 2026-05-27T00:00:00Z
version: 1.1
status: Ready
owner: unassigned
confidence: HIGH
phase: 2

## Black Box Interface

### INPUT
- **Required Context**:
  - `viral-cristao-artifact.jsx` lines ~1308-1362 — current direct-from-browser `analyze()`; same request body shape, but moved server-side with a real `x-api-key` header
  - `claude-code-bootstrap.md` §"Modo API (fallback BYOK)"
  - `01-Systems-Architecture-Expert-viral-cristao.md` §"Project-Specific Black Box Boundaries" — row for `runtime/claude-api.js`
  - Anthropic Messages API reference (`POST /v1/messages`, headers, response shape, error envelope)
  - TASK_002 OUTPUT — `@gospelviral/shared` exposes `parseAnalysisResponse`, `OPTIMIZED_PROMPT`, types, and example fixtures. **This task imports the parser; it does NOT create a server-side copy.**
  - TASK_005 OUTPUT — `env.apiKey`, `resolveModel`, `logger`
- **Prerequisites**: TASK_005 (Complete), TASK_002 (Complete)
- **Parameters**:
  - `systemPrompt`: string (typically `OPTIMIZED_PROMPT` from `@gospelviral/shared`)
  - `userMessage`: string (transcript wrapped in `<transcript>` tags — composed by TASK_009's `build-user-message.js`)
  - `modelId`: wire-format slug from `resolveModel` (TASK_005)
  - `maxTokens`: number, default 8000 (artifact's value; arch doc allows up to 16k)

### OUTPUT
- **Deliverables**:
  - `apps/server/src/runtime/claude-api.js` — exports `runViaApi({ systemPrompt, userMessage, modelId, maxTokens, signal? }): Promise<AnalysisResponse>`. Internally:
    1. Reads `env.apiKey`; throws typed `AdapterConfigError` if absent
    2. POSTs to `api.anthropic.com/v1/messages` with `x-api-key`, `anthropic-version`, JSON body
    3. Concatenates `data.content[].text` segments
    4. Calls `parseAnalysisResponse(text)` from `@gospelviral/shared` — this is the **only** parsing path
    5. Returns the validated `AnalysisResponse`
  - `apps/server/src/runtime/errors.js` — typed error classes shared by API and CLI adapters: `AdapterConfigError`, `AdapterTransportError`, `AdapterTimeoutError`. `AnalysisResponseError` is imported from `@gospelviral/shared` and re-thrown unchanged
  - Vitest specs with global `fetch` mocked: happy path, HTTP 4xx, HTTP 5xx, network error, malformed JSON envelope, payload missing `top_moments` (re-thrown from shared parser)
- **Artifacts**:
  - Coverage ≥ 90% on `claude-api.js`; 100% on `errors.js`
  - SonarCloud Quality Gate = PASS; `javascript:S3776 = 0` on new code
- **Decisions Generated**:
  - `DEC_XXX_adapter_contract.md` — Both `runViaApi` and `runViaCli` (TASK_007) share the same `({ systemPrompt, userMessage, modelId, maxTokens?, signal? }) → Promise<AnalysisResponse>` signature. Callers in TASK_009 cannot tell them apart. Sources: TASK_006, TASK_007
  - `DEC_XXX_api_error_mapping.md` — Anthropic 4xx → re-thrown as `AdapterTransportError` with sanitized message (no key bytes, no body excerpt that could contain the prompt); 5xx → same class, distinct `code`; network → also `AdapterTransportError` with `code: 'network'`. The HTTP-status mapping client-facing happens in TASK_009 (route handler), not here

### INVARIANTS
- **Must Maintain**:
  - `viral-cristao-artifact.jsx` at the repository root remains **byte-identical** until TASK_012
  - `ANTHROPIC_API_KEY` is read **only** via `env.apiKey` from TASK_005; never logged, never included in error messages, never returned in responses
  - **`runViaApi` does not implement its own JSON parsing — it MUST call `parseAnalysisResponse` from `@gospelviral/shared`.** Any server-side copy of the parser would be a violation; the shared module is the SSOT
  - Output `AnalysisResponse` matches the shape defined by the JSDoc typedef in `@gospelviral/shared/types.js`; `top_moments` length is normalized inside the shared parser (sliced to 5)
  - `AbortSignal` support — caller (TASK_009) can cancel mid-flight; on abort the promise rejects with a node-native `AbortError`
  - The function signature is the contract for both API and CLI adapters (DEC above)
- **Quality Gates**:
  - Spec stubs `fetch` returning text that, when parsed by shared, equals `EXAMPLE_RESPONSE` → assert the function returns it intact
  - Spec stubs HTTP 401 → assert error class is `AdapterTransportError` and the message contains no part of the API key
  - Spec stubs a payload missing `top_moments` → assert `AnalysisResponseError` (from shared) propagates with `code: 'missing_top_moments'`
  - Spec stubs an aborted signal mid-call → assert rejection with `name === 'AbortError'`
  - SonarCloud Quality Gate = PASS; `javascript:S3776 = 0`

## Task Definition
Build the Anthropic Messages REST adapter as a single server-side function that takes a system prompt, user message, and model slug, calls the REST API, and converts the raw response into the canonical `AnalysisResponse` shape by delegating to `parseAnalysisResponse` from `@gospelviral/shared`. This is the simpler of the two adapters (no process management, no streaming parser) and validates the HTTP→Anthropic→shared-parser→response pipeline end-to-end before the CLI adapter layers in additional concerns. Parser ownership lives in `packages/shared` (authored in TASK_002); this task is purely a transport + adaptation layer.

## Success Criteria
1. `runViaApi(...)` with a mocked `fetch` returning the artifact's response text resolves to `EXAMPLE_RESPONSE` (proving the shared parser is wired)
2. `runViaApi(...)` with a mocked HTTP 401 rejects with an `AdapterTransportError` whose stringified message contains no byte of `process.env.ANTHROPIC_API_KEY`
3. `runViaApi(...)` with a mocked payload missing `top_moments` rejects with `AnalysisResponseError` (imported from shared) — this proves the parser is doing the validation, not the adapter
4. Cancellation: `AbortSignal` aborted mid-call → rejection with `name === 'AbortError'`
5. No file under `apps/server/src/` re-implements `parseAnalysisResponse` semantics (verified by a small lint spec that asserts the file count is what we expect)
6. SonarCloud Quality Gate = PASS; `javascript:S3776 = 0`
7. `.jsx` at root is byte-identical to pre-task state

## Risk Assessment
| Risk | Level | Mitigation | Detection |
|---|---|---|---|
| API key leak via error message, exception, or log | HIGH | Centralize error mapping in `errors.js`; logger redacts `apiKey` field by default; spec asserts no key bytes in error.message or captured logger output | Spec |
| Anthropic header version drift (`anthropic-version` value) | LOW | Pin a known-good version in a constant; update via a focused task when needed | Manual smoke run against real API |
| `max_tokens` ceiling — artifact used 8000, real API allows 16k+ | LOW | Default 8000 (parity), parameter override available | Param spec |
| Drift between `@gospelviral/shared` parser and adapter expectations | MEDIUM | Shared parser owns validation; adapter passes raw text in and gets typed object out; no parsing logic in adapter to drift | Cross-package spec asserts adapter never parses |
| Anthropic's response shape changes (new envelope, deprecated `content[].text`) | MEDIUM | Adapter only touches `data.content[].text`; if Anthropic adds new content block types, ignore them (the prompt asks for text only). Updates are a focused task | Smoke run flag |
| `fetch` mocking inconsistencies between Node versions | LOW | Use `vi.stubGlobal('fetch', vi.fn())`; pin Node 20.10+ from TASK_001 | CI/local run |

## Implementation Strategy
1. Author `errors.js` with the typed error classes
2. Author `claude-api.js` against a mocked `fetch`; import `parseAnalysisResponse` from `@gospelviral/shared` and call it on the concatenated text
3. Wire `env.apiKey` read; fail fast if absent
4. Add a hand-driven smoke script `pnpm -F server smoke:api` that calls the real API once with `EXAMPLE_TRANSCRIPT` from shared and prints the response — gated behind `--yes` to avoid accidental billing
5. Lint, sonar (`@sonar/scan`), finalize

## Prerequisite Subtasks (MANDATORY)

### SUBTASK_006.P1: GitFlow Workflow
**Status**: ⏱️ Not Started
- Branch: `feature/task-006-claude-api-adapter` from `develop`
- Commits: `feat(server): adapter error classes`, `feat(server): claude-api adapter`, `test(server): cover claude-api error paths`, `chore(server): smoke:api script`
- PR targeting `develop`, reviewed, source branch deleted after merge

### SUBTASK_006.P2: Tests Workflow
**Status**: ⏱️ Not Started
- TDD: failing spec on each error path → implement → green
- AAA in every spec
- Coverage ≥ 90% on the adapter; 100% on errors module
- Zero regressions on TASK_001..TASK_005 and on TASK_002 shared specs
- Cognitive Complexity ≤ 15

### SUBTASK_006.P3: Task Finalization
**Status**: ⏱️ Not Started
- `pnpm lint`, `pnpm -F server test --coverage`, build green
- `sonar` runs locally; Quality Gate = PASS; `javascript:S3776 = 0`
- Browser smoke (Chrome DevTools MCP): skipped (server-only task)
- Git finalize with conventional commits + `Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>` trailer
- PR description includes the SonarCloud block
- On-screen execution summary at task close

## Subtasks
> Pass 2 — to be expanded on approval. Expected ~2 subtasks (errors + adapter, smoke script). Note: the parser is no longer a subtask of this task — it lives in `@gospelviral/shared` and is authored in TASK_002.
