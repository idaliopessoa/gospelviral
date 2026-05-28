# TASK_010: Frontend↔Backend Wire-Up + Mode Badge
timestamp: 2026-05-27T00:00:00Z
version: 1.0
status: Ready
owner: unassigned
confidence: MEDIUM
phase: 2

## Black Box Interface

### INPUT
- **Required Context**:
  - TASK_004 OUTPUT (`apps/web/src/lib/api.js` exists as placeholder with the eventual function surface; UI is rendering the artifact's three views)
  - TASK_009 OUTPUT (`POST /api/analyze`, `GET /api/runtime/detect` live on the server)
  - `viral-cristao-artifact.jsx` `analyze()` function semantics (validation, transitions between views, error display) — kept as the behavioral target
- **Prerequisites**: TASK_004, TASK_009 (both Complete)
- **Parameters**: none

### OUTPUT
- **Deliverables**:
  - `apps/web/src/lib/api.js` — replaces placeholder with real `analyze({ url, transcript, mode?, model? }, { signal? }): Promise<AnalysisResponse>` calling `POST /api/analyze`
  - `apps/web/src/lib/runtime.js` — exports `fetchRuntime({ refresh? } = {}): Promise<RuntimeStatus>` calling `GET /api/runtime/detect`
  - `apps/web/vite.config.js` updated with `server.proxy` for `/api/*` → backend port (dev only; production deployment topology is out of scope for this task)
  - `apps/web/src/components/ModeBadge.jsx` — small badge component reading runtime status; displays "via Claude Code CLI" or "via API key" or "sem runtime"; clickable to open a small settings popover that lets the user force a mode for the current session
  - `App.jsx` updated: `analyze()` now calls `lib/api.js`; loading messages still rotate locally (no SSE); error mapping covers the new envelope shape
  - `useRuntime()` hook (under `apps/web/src/hooks/`) — fetches runtime on mount, exposes `{ status, refresh, forceMode, currentMode }`
  - Vitest specs for `lib/api.js` (with `fetch` mocked) and the new `useRuntime` hook; `@testing-library/react` specs for `ModeBadge` and `App` happy-path integration
- **Artifacts**:
  - `pnpm dev` (root) runs both apps; UI shows the badge; clicking "Analisar" hits the backend and renders results
  - Coverage ≥ 85% on `lib/api.js` and `useRuntime`
  - SonarCloud Quality Gate = PASS; `javascript:S3776 = 0` on new code
- **Decisions Generated**:
  - DEC: `forceMode` is **session-only** (not persisted); persistence is TASK_011's territory, and visual presets are the only thing that survive reload (`DEC_XXX_force_mode_session_only.md`)
  - DEC: Vite proxy target read from `VITE_API_PROXY_TARGET` env var with default `http://localhost:${SERVER_PORT}`; this env var **is** safe to expose to the bundle (it points to localhost dev only)

### INVARIANTS
- **Must Maintain**:
  - `viral-cristao-artifact.jsx` at the repository root remains **byte-identical** until TASK_012
  - User-visible behavior is identical to the artifact for: input validation messages, three-view transitions, error display, "Ver exemplo pronto" still bypasses the backend
  - `analyze()` request body is `{ url, transcript, mode?, model? }`; `mode` and `model` are sent only when the user has explicitly forced them via the badge popover
  - `AnalysisResponse` shape arriving from the backend matches `EXAMPLE_RESPONSE` exactly; `App` does no shape adaptation
  - `lib/api.js` is the **only** module in `apps/web` that touches `fetch` or knows about HTTP — components and hooks call into it, never around it
  - No Anthropic-specific header or API key constant exists anywhere in `apps/web`
- **Quality Gates**:
  - One spec for `lib/api.js` per backend response (200, 400, 502, 504)
  - One integration spec rendering `App`, clicking "Analisar" with mocked `fetch`, asserting the `results` view renders
  - One spec on `ModeBadge` asserting the displayed label per `recommended` value
  - SonarCloud Quality Gate = PASS; `javascript:S3776 = 0`

## Task Definition
Replace the placeholder `lib/api.js` with a real client of the TASK_009 backend, surface a small "active mode" badge that reads `GET /api/runtime/detect`, and let the user force CLI or API for the current session via a popover from the badge. Wire Vite's dev proxy so the same-origin assumption holds during development. Behavior visible to the end user remains the artifact's behavior; the change is the transport, not the UX.

## Success Criteria
1. `pnpm dev` runs both apps; clicking "Analisar" with valid input on the running web app triggers a `POST /api/analyze` to the running server and renders the result
2. Badge in the header (or near `ConfigPanel`) shows the correct label per detection outcome; clicking it opens a popover with `[Auto | CLI | API]` radios, selection persists for the session only
3. `lib/api.js` rejected response (400/502/504) renders an error in the existing red panel with the artifact's tone
4. `lib/api.js` `AbortSignal` cancels the request when the user clicks "Nova análise" mid-request
5. "Ver exemplo pronto" still works without hitting the backend
6. No console error during a full happy path
7. SonarCloud Quality Gate = PASS; `javascript:S3776 = 0`
8. `.jsx` at root is byte-identical to pre-task state

## Risk Assessment
| Risk | Level | Mitigation | Detection |
|---|---|---|---|
| CORS misconfiguration during dev | LOW | Vite proxy means the browser sees same-origin `/api/*`; no CORS headers needed | First dev session smoke |
| Mode badge UI eats real estate / clashes with artifact's stone-* palette | MEDIUM | Minimal pill in header next to the page title, mono font, neutral border; popover is the same paper background `#F5F1EA` | Visual spot-check vs `.jsx` (parity standard from TASK_004 still applies) |
| `useRuntime` re-fetches on every render | MEDIUM | Hook uses `useEffect` with `[]` deps + manual `refresh` action; cached server-side at 60s anyway (TASK_008 TTL) | Spec asserts single fetch on mount |
| Error envelope changes between server and client expectation | LOW | Both `apps/server` and `apps/web` import a shared JSDoc typedef block; if the envelope changes it's a server task | Cross-app contract spec (lives in `apps/web` as the consumer) |
| `lib/api.js` swallows the backend error message verbatim, including sensitive context | LOW | Server already strips sensitive content (TASK_006/007 invariants); client just relays whatever arrives | Server-side invariants are the gate |
| Network failure (server down) yields a useless "Failed to fetch" | MEDIUM | `lib/api.js` maps `TypeError` from `fetch` to `{ code: 'network', message: 'Servidor backend inacessível — verifique se está rodando' }` (PT-BR to match UI) | Spec covers the case |

## Implementation Strategy
1. Implement `lib/runtime.js` and `useRuntime` first — small, testable, lets the badge work even before `lib/api.js` is final
2. Implement `ModeBadge` against the hook
3. Replace `lib/api.js` placeholder with the real implementation; pin via specs against mocked `fetch`
4. Update `vite.config.js` proxy entry
5. Update `App.jsx` so `analyze()` calls `lib/api.js` and the abort-on-reset path works
6. Run both apps; walk the happy path; iterate
7. Lint, sonar (`@sonar/scan`), finalize

## Prerequisite Subtasks (MANDATORY)

### SUBTASK_010.P1: GitFlow Workflow
**Status**: ⏱️ Not Started
- Branch: `feature/task-010-frontend-backend-wire` from `develop`
- Commits: `feat(web): runtime client + useRuntime`, `feat(web): mode badge`, `feat(web): lib/api real impl`, `chore(web): vite proxy`, `refactor(web): App calls lib/api`
- PR targeting `develop`, reviewed, source branch deleted after merge

### SUBTASK_010.P2: Tests Workflow
**Status**: ⏱️ Not Started
- TDD: `lib/api.js` and `useRuntime` with mocked `fetch`
- AAA in every spec
- Integration: rendered `App` exercising the happy path with mocked transport
- Zero regressions on TASK_001..TASK_009
- Cognitive Complexity ≤ 15 (`useRuntime` is the candidate to watch)

### SUBTASK_010.P3: Task Finalization
**Status**: ⏱️ Not Started
- `pnpm lint`, `pnpm test --coverage`, `pnpm build` all green
- `sonar` runs locally; Quality Gate = PASS; `javascript:S3776 = 0` on new code
- Browser smoke via Chrome DevTools MCP: `navigate` to the running web URL → `take_screenshot` (input view) → use `click` to hit "Ver exemplo pronto" → `wait_for` results view → `take_screenshot` (results view) → `list_console_messages` (assert empty) → `list_network_requests` (assert no 5xx). If backend is running, send a real request via the UI and capture the `/api/analyze` request entry from `list_network_requests`. Transcript + screenshots attached to PR
- Git finalize with conventional commits + `Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>` trailer
- PR description includes the SonarCloud block
- On-screen execution summary at task close

## Subtasks
> Pass 2 — to be expanded on approval. Expected ~5 subtasks (runtime client, mode badge, api real impl, vite proxy, App wiring).
