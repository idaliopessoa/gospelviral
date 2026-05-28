# TASK_008: Runtime Detection
timestamp: 2026-05-27T00:00:00Z
version: 1.0
status: Ready
owner: unassigned
confidence: HIGH
phase: 2

## Black Box Interface

### INPUT
- **Required Context**:
  - `claude-code-bootstrap.md` §"Capacidade nova: dual-mode CLI ↔ API" (CLI preferred when present, API fallback)
  - `01-Systems-Architecture-Expert-viral-cristao.md` §"Project-Specific Black Box Boundaries" — row for `apps/server/src/runtime/detect.js`
  - TASK_005 OUTPUT (`env.apiKey`, `logger`)
- **Prerequisites**: TASK_005 (Complete)
- **Parameters**:
  - `binCandidates`: ordered array of candidate binary names, default `['claude', 'openclaude']` (the `openclaude` fork is mentioned in bootstrap as a drop-in fallback)

### OUTPUT
- **Deliverables**:
  - `apps/server/src/runtime/detect.js` — exports:
    - `detectRuntime(opts?): Promise<RuntimeStatus>` where `RuntimeStatus = { cli: { available, binPath, name } | { available: false }, apiKey: boolean, recommended: 'cli' | 'api' | 'none' }`
    - `clearDetectionCache()` — used by tests and by the eventual `/api/runtime/detect?refresh=true` query
  - Vitest specs covering: only API key present, only CLI present, both present (recommended = `'cli'`), neither (recommended = `'none'`), `openclaude` fallback, PATH lookup mocked per OS variant
- **Artifacts**:
  - Coverage ≥ 95% on `detect.js`
  - SonarCloud Quality Gate = PASS; `javascript:S3776 = 0`
- **Decisions Generated**:
  - DEC: detection is memoized with a TTL of 60s; `clearDetectionCache()` busts it (`DEC_XXX_detect_cache.md`)
  - DEC: precedence — when both available, recommendation is `cli` because billing rides on the user's existing Pro/Max subscription (no marginal API cost)

### INVARIANTS
- **Must Maintain**:
  - `viral-cristao-artifact.jsx` at the repository root remains **byte-identical** until TASK_012
  - Detection never executes the binary; only checks for its presence on PATH (running the binary is the capability probe in TASK_007, a separate concern)
  - Detection is **cross-platform**: handles `claude.cmd`/`claude.exe` on Windows, `claude` on POSIX
  - `apiKey: boolean` only reports presence (truthy), never the value
  - Function is idempotent and side-effect-free beyond the in-memory cache and one info-level log line per detection
- **Quality Gates**:
  - One spec per recommendation outcome (`cli`, `api`, `none`)
  - One spec asserts memoization (second call within TTL does not re-probe)
  - One spec asserts `clearDetectionCache` forces a re-probe
  - SonarCloud Quality Gate = PASS; `javascript:S3776 = 0`

## Task Definition
Provide a single function `detectRuntime()` that reports which execution modes are available on this machine — the `claude` CLI on PATH, an `ANTHROPIC_API_KEY` in env, both, or neither — and which mode to prefer. Cross-platform, memoized, side-effect-free, and the sole source of truth for the mode-selection logic in TASK_009 and the badge in TASK_010.

## Success Criteria
1. `detectRuntime()` with both CLI on PATH and API key returns `{ cli: { available: true, binPath, name: 'claude' }, apiKey: true, recommended: 'cli' }`
2. With only API key: `recommended: 'api'`
3. With only CLI: `recommended: 'cli'`
4. With neither: `recommended: 'none'`
5. `openclaude` fallback selected when `claude` is absent but `openclaude` is present
6. Second call within 60s returns the memoized result without touching PATH
7. SonarCloud Quality Gate = PASS; `javascript:S3776 = 0`
8. `.jsx` at root is byte-identical to pre-task state

## Risk Assessment
| Risk | Level | Mitigation | Detection |
|---|---|---|---|
| Cross-platform PATH lookup quirks (Windows extension resolution, POSIX `command -v`) | MEDIUM | Use `which` npm package (already cross-platform); avoid hand-rolling `process.env.PATH` parsing | Specs run logic with mocked filesystem |
| TTL too short → constant PATH walks; too long → stale state if user installs CLI mid-session | LOW | 60s is a sweet spot; `clearDetectionCache()` + `/api/runtime/detect?refresh=true` for explicit refresh | UX: badge can be "re-detected" by toggling the settings panel |
| User has `claude` on PATH that resolves to a different binary (reachingforthejack/rtk style collision) | MEDIUM | Capability probe in TASK_007 distinguishes by `--version` output; if probe fails, detection downgrades to `api` and logs a warning | TASK_007 probe spec |
| `ANTHROPIC_API_KEY` empty string ≠ unset | LOW | `env.apiKey` already normalizes empty to `undefined` (TASK_005 invariant); detection uses `Boolean(env.apiKey)` | Spec covers empty-string case |

## Implementation Strategy
1. Add `which` as a runtime dependency to `apps/server`
2. Implement `detectRuntime` with cache (Map keyed by `binCandidates.join('|')`, value `{ result, expiresAt }`)
3. Implement `clearDetectionCache`
4. Write specs first per AAA, then the implementation green; cover the OS-variant cases via mocked `which`
5. Lint, sonar (`@sonar/scan`), finalize

## Prerequisite Subtasks (MANDATORY)

### SUBTASK_008.P1: GitFlow Workflow
**Status**: ⏱️ Not Started
- Branch: `feature/task-008-runtime-detection` from `develop`
- Commits: `feat(server): runtime detect with TTL cache`, `test(server): cover detect outcomes`
- PR targeting `develop`, reviewed, source branch deleted after merge

### SUBTASK_008.P2: Tests Workflow
**Status**: ⏱️ Not Started
- TDD: failing spec per outcome → implementation → green
- AAA in every spec
- Coverage ≥ 95%
- Zero regressions
- Cognitive Complexity ≤ 15

### SUBTASK_008.P3: Task Finalization
**Status**: ⏱️ Not Started
- `pnpm lint`, `pnpm -F server test --coverage`, build green
- `sonar` runs locally; Quality Gate = PASS; `javascript:S3776 = 0`
- Browser smoke (Chrome DevTools MCP): skipped (server-only task)
- Git finalize with conventional commits + `Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>` trailer
- PR description includes the SonarCloud block
- On-screen execution summary at task close

## Subtasks
> Pass 2 — to be expanded on approval. Expected ~2 subtasks (core detection + cache, OS variant coverage).
