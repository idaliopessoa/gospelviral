# TASK_005: Server Scaffold + Models Config
timestamp: 2026-05-27T00:00:00Z
version: 1.0
status: Ready
owner: unassigned
confidence: HIGH
phase: 2

## Black Box Interface

### INPUT
- **Required Context**:
  - `claude-code-bootstrap.md` §"Capacidade nova: dual-mode CLI ↔ API" and §"Endpoint principal do backend"
  - `01-Systems-Architecture-Expert-viral-cristao.md` §"Project-Specific Black Box Boundaries" rows for `apps/server` route and runtime adapters
  - TASK_001 OUTPUT (`apps/server` Hono stub already exists, but only `/healthz`)
  - Verified Anthropic model slugs from official Anthropic documentation:
    - default: `claude-opus-4-7`
    - fast: `claude-sonnet-4-6`
    - debug: `claude-haiku-4-5-20251001`
    (slugs MUST be re-confirmed against the Anthropic docs at implementation time — they have changed historically and the `.jsx` carries a stale one)
- **Prerequisites**: TASK_001 (Complete)
- **Parameters**:
  - `default_model_label`: literal `"default"` resolves to opus
  - `fast_model_label`: literal `"fast"` resolves to sonnet
  - `debug_model_label`: literal `"debug"` resolves to haiku

### OUTPUT
- **Deliverables**:
  - `apps/server/src/server.js` (or `index.js`) — Hono app with `/healthz` retained and the route table prepared to receive `/api/analyze` + `/api/runtime/detect` in TASK_009 (but those routes are not yet implemented)
  - `apps/server/src/config/models.js` — exports `resolveModel(preference: 'default'|'fast'|'debug'|string): string` returning the wire-format slug; unknown preferences fall back to default with a logged warning; never throws
  - `apps/server/src/config/env.js` — typed (JSDoc) accessor for `ANTHROPIC_API_KEY`, `PORT`, `LOG_LEVEL` with defaults; never reads `process.env` outside this module
  - `apps/server/src/lib/logger.js` — minimal structured logger (`info`, `warn`, `error`) writing JSON lines to stdout; no external dependency
  - `.env.example` updated at repo root: `ANTHROPIC_API_KEY=`, `PORT=5173`, `LOG_LEVEL=info`, `SONAR_TOKEN=`
  - Vitest specs for `resolveModel` and `env` (mocked `process.env`)
- **Artifacts**:
  - `pnpm -F server dev` boots, `curl /healthz` returns 200 with JSON `{ status: "ok", version: <pkg.version> }`
  - Coverage ≥ 95% on `models.js` and `env.js` (pure)
  - SonarCloud Quality Gate = PASS; `javascript:S3776 = 0`
- **Decisions Generated**:
  - DEC: model resolution is server-only — frontend sends preferences (`'default'`/`'fast'`), never wire slugs (`DEC_XXX_model_resolution.md`)
  - DEC: minimal structured logger vs `pino` (proposed: minimal in-house; `pino` if we ever need rotation)

### INVARIANTS
- **Must Maintain**:
  - `viral-cristao-artifact.jsx` at the repository root remains **byte-identical** until TASK_012
  - `ANTHROPIC_API_KEY` is **never** read outside `apps/server/src/config/env.js` and **never** exposed in any response body or error message
  - Variable `VITE_ANTHROPIC_API_KEY` is explicitly **not used** anywhere (the `VITE_` prefix would leak the key to the client bundle)
  - `resolveModel` always returns a non-empty string — unknown preferences fall back, never throw
  - Frontend never imports anything from `apps/server` — boundary is HTTP only
- **Quality Gates**:
  - One spec asserts that calling `resolveModel('unknown-string')` returns the default slug and emits a warning (via mocked logger)
  - One spec asserts that `env.apiKey` is `undefined` when `ANTHROPIC_API_KEY` is absent (not empty string, not crash)
  - SonarCloud Quality Gate = PASS; `javascript:S3776 = 0`

## Task Definition
Take the Hono stub from TASK_001 and turn it into a real server boot with structured logging, environment-config encapsulation, and a single authoritative `resolveModel(preference)` function that maps user-facing labels to Anthropic wire-format model slugs. No business routes yet; the goal is to lay down the supporting modules that TASK_006/007/008/009 will plug into.

## Success Criteria
1. `pnpm -F server dev` boots without errors; `/healthz` returns `200 OK` with `{ status: "ok", version }`
2. `resolveModel('default')` returns the opus slug; `resolveModel('fast')` returns sonnet; `resolveModel('debug')` returns haiku; `resolveModel('garbage')` returns default + warn-logs
3. `env.apiKey` reflects `ANTHROPIC_API_KEY` when set; `undefined` when unset
4. Logger writes JSON lines to stdout matching `{ ts, level, msg, ...ctx }`
5. `apps/server` has no runtime dependency on `apps/web`
6. SonarCloud Quality Gate = PASS; `javascript:S3776 = 0`
7. `.jsx` at root is byte-identical to pre-task state

## Risk Assessment
| Risk | Level | Mitigation | Detection |
|---|---|---|---|
| Anthropic model slugs may have changed between this plan and implementation | MEDIUM | Re-confirm against Anthropic docs at implementation time; do not trust the `.jsx`'s `claude-sonnet-4-20250514`; store the verified slugs in `models.js` with a comment citing the source | A WebFetch / docs check before merge |
| `process.env` reads scattered across modules (anti-pattern) | LOW | Hard rule in PR review: only `config/env.js` may touch `process.env`; ESLint rule `no-process-env` enabled with allowlist | `pnpm lint` |
| Logger reinvents the wheel | LOW | Minimal: ~30 lines, no rotation, no levels beyond info/warn/error; if it ever needs more, swap for `pino` in a focused task | Code review |
| `.env.example` accidentally checks in real values | LOW | `.env.example` only carries empty keys with comments; `.env` and `.env.local` are gitignored from TASK_001 | `git status` clean of `.env` |

## Implementation Strategy
1. Replace the TASK_001 placeholder server with a proper Hono app under `apps/server/src/`
2. Implement `config/env.js` first — single seam to `process.env`
3. Implement `lib/logger.js` — accepts a child-context-merge call (`logger.child({ scope: 'server' })`)
4. Implement `config/models.js` — verified slugs as constants, `resolveModel(preference)` as exported function; both with specs
5. Wire `server.js` to import `env`, `logger`, expose `/healthz`, listen on `env.port`
6. Add `.env.example`; update `.gitignore` if missing the `.env*` entries

## Prerequisite Subtasks (MANDATORY)

### SUBTASK_005.P1: GitFlow Workflow
**Status**: ⏱️ Not Started
- Branch: `feature/task-005-server-scaffold` from `develop`
- Commits: `feat(server): env+logger modules`, `feat(server): resolveModel + verified slugs`, `feat(server): boot hono with /healthz`
- PR targeting `develop`, reviewed, source branch deleted after merge

### SUBTASK_005.P2: Tests Workflow
**Status**: ⏱️ Not Started
- TDD: failing spec for `resolveModel('default'|'fast'|'debug'|'unknown')` → implement → green
- TDD: failing spec for `env.apiKey` with and without `ANTHROPIC_API_KEY` set (use `vi.stubEnv`)
- AAA in every spec
- Zero regressions on TASK_001..TASK_004
- No method exceeds Cognitive Complexity 15

### SUBTASK_005.P3: Task Finalization
**Status**: ⏱️ Not Started
- `pnpm lint`, `pnpm -F server test --coverage`, `pnpm build` (web) all green
- `sonar` runs locally; Quality Gate = PASS; `javascript:S3776 = 0`
- Browser smoke (Chrome DevTools MCP): skipped (server-only task; no web delta)
- Git finalize with conventional commits + `Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>` trailer
- PR description includes the SonarCloud block
- On-screen execution summary at task close

## Subtasks
> Pass 2 — to be expanded on approval. Expected ~4 subtasks (env, logger, models, server boot).
