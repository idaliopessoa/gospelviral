# TASK_011: localStorage Persistence (visual configs only)
timestamp: 2026-05-27T00:00:00Z
version: 1.0
status: Ready
owner: unassigned
confidence: HIGH
phase: 2

## Black Box Interface

### INPUT
- **Required Context**:
  - TASK_004 OUTPUT (default config shapes for `subtitleConfig`, `videoConfig`, `overlayConfig`, `isConfigCollapsed`)
  - `01-Systems-Architecture-Expert-viral-cristao.md` §"Single Source of Truth" — `localStorage` is the SSOT for visual presets only; analysis state stays session-only
  - `claude-code-bootstrap.md` step 6 of the migration plan
- **Prerequisites**: TASK_004 (Complete)
- **Parameters**: none

### OUTPUT
- **Deliverables**:
  - `apps/web/src/lib/persistence.js` — exports:
    - `loadVisualPresets(): VisualPresets` — returns persisted presets merged over defaults; **returns defaults unchanged if the stored payload's `schemaVersion` differs from current**
    - `saveVisualPresets(presets: VisualPresets): void` — debounced internally (300ms); writes `{ schemaVersion: 1, presets }`
    - `clearVisualPresets(): void` — used by a "Reset" button in the UI and by tests
    - `STORAGE_KEY = 'viral-cristao:config:v1'` exported as a constant
  - `apps/web/src/hooks/useVisualPresetsPersistence.js` — `useEffect` that rehydrates on mount and writes on change (debounced)
  - `App.jsx` updated: visual config state is initialized from `loadVisualPresets()` instead of inline defaults; calls `saveVisualPresets({ subtitleConfig, videoConfig, overlayConfig, isConfigCollapsed })` on relevant state changes
  - Vitest specs covering: cold load (no key), warm load (matching schema), schema mismatch (drops + falls back), corrupted JSON (drops + falls back), debounced write coalescing, `clearVisualPresets()` behavior
- **Artifacts**:
  - Coverage 100% on `persistence.js` (pure module with browser storage stubbed)
  - SonarCloud Quality Gate = PASS; `javascript:S3776 = 0`
- **Decisions Generated**:
  - DEC: `overlayConfig.dataURL` (a PNG data URL) is **excluded** from persistence — can be multi-megabytes and `localStorage` ceiling is ~5MB per origin; document this in the module header and surface in UI ("overlay não é salvo entre sessões")
  - DEC: `transcript`, `url`, `results` are deliberately **never** persisted — session-only by design (`DEC_XXX_persistence_scope.md`)

### INVARIANTS
- **Must Maintain**:
  - `viral-cristao-artifact.jsx` at the repository root remains **byte-identical** until TASK_012
  - **Storage key is versioned: `viral-cristao:config:v1`**. Bumping the schema (a future task that adds/removes preset fields) creates a new key like `viral-cristao:config:v2`; the old key is **read once for migration**, then deleted, never written to again
  - **Migration safety: any read whose `schemaVersion` differs from the current code's expectation is treated as a cache miss → defaults are returned, and the bad value is removed.** No partial merges, no field-by-field guessing — schema mismatch is total invalidation
  - `loadVisualPresets()` never throws; corruption, quota errors, `localStorage` unavailable → returns defaults silently and logs once at warn level
  - `saveVisualPresets()` never throws; quota exceeded → drops the write and logs once at warn level
  - `overlayConfig.dataURL` is stripped before write; on load, the field is initialized to `null` (the user uploads a fresh PNG each session)
  - The shape of `VisualPresets` saved is `{ schemaVersion: 1, presets: { subtitleConfig, videoConfig, overlayConfig (without dataURL), isConfigCollapsed } }`
- **Quality Gates**:
  - One spec asserts that a v1 payload loads correctly
  - One spec asserts that a `{ schemaVersion: 0, ... }` payload is dropped and defaults returned
  - One spec asserts that corrupted JSON yields defaults
  - One spec asserts that 10 rapid `saveVisualPresets` calls within 300ms result in exactly one `localStorage.setItem` call
  - One spec asserts that `dataURL` is stripped before write
  - SonarCloud Quality Gate = PASS; `javascript:S3776 = 0`

## Task Definition
Make visual presets (subtitle, video, overlay-without-PNG, panel collapsed state) survive reloads via `localStorage`, owned by a single module that is also the SSOT for the storage key, the schema version, and the safe-load / safe-save semantics. Schema is versioned so future preset additions can migrate cleanly. Analysis state and the overlay PNG itself stay session-only by design.

## Success Criteria
1. Reload after changing `subtitleConfig.font` retains the new font
2. Reload after toggling `isConfigCollapsed` retains the state
3. Reload after uploading a PNG via `OverlayControls` does **not** retain the PNG (intentional)
4. Manually corrupting the `localStorage` value via DevTools and reloading does not crash the app; defaults are restored
5. Bumping the in-code expectation from `schemaVersion: 1` to `2` (simulated via a test) causes the old value to be dropped and defaults returned
6. SonarCloud Quality Gate = PASS; `javascript:S3776 = 0`
7. `.jsx` at root is byte-identical to pre-task state

## Risk Assessment
| Risk | Level | Mitigation | Detection |
|---|---|---|---|
| `localStorage` unavailable (Safari private mode, embedded contexts) | LOW | `loadVisualPresets` returns defaults; `saveVisualPresets` no-ops; logger emits once at warn | Spec stubs `localStorage` throwing |
| `overlayConfig.dataURL` persisted by accident → quota exceeded | MEDIUM | Strip explicitly in `saveVisualPresets`; spec asserts the field is `null` in any payload written | Spec covers the strip |
| Multi-tab race (two tabs save back-and-forth) | LOW | Last write wins; no cross-tab sync in scope; document the behavior | UI notes |
| Debounce window swallows the final write if the user closes the tab quickly | LOW | Use `requestIdleCallback` or `beforeunload` flush as a follow-up if it ever bites; not in scope here | User report (not a current risk) |
| Schema migration creep: adding a field bumps version too eagerly | LOW | Convention: bump version **only** when removing a field or changing field types; adding optional fields can stay at v1 with defaults filled at load time | Code review |

## Implementation Strategy
1. Implement `persistence.js` as a pure module with `localStorage` stubbed via Vitest
2. Define `STORAGE_KEY = 'viral-cristao:config:v1'` and `CURRENT_SCHEMA_VERSION = 1`
3. Implement `loadVisualPresets`, `saveVisualPresets`, `clearVisualPresets` with the strip-dataURL invariant
4. Implement debounce inline (300ms `setTimeout` + clear on re-entry); avoid `lodash.debounce` for one usage
5. Implement `useVisualPresetsPersistence` hook
6. Update `App.jsx` to use the hook
7. Manually test in dev: change → reload → change overlay PNG → reload → corrupt → reload
8. Lint, sonar (`@sonar/scan`), finalize

## Prerequisite Subtasks (MANDATORY)

### SUBTASK_011.P1: GitFlow Workflow
**Status**: ⏱️ Not Started
- Branch: `feature/task-011-localstorage-persistence` from `develop`
- Commits: `feat(web): persistence module + schema v1`, `feat(web): useVisualPresetsPersistence hook`, `refactor(web): App reads presets from persistence`
- PR targeting `develop`, reviewed, source branch deleted after merge

### SUBTASK_011.P2: Tests Workflow
**Status**: ⏱️ Not Started
- TDD per acceptance: failing spec → implementation → green
- AAA in every spec
- Coverage 100% on `persistence.js`
- Zero regressions on TASK_001..TASK_010
- Cognitive Complexity ≤ 15

### SUBTASK_011.P3: Task Finalization
**Status**: ⏱️ Not Started
- `pnpm lint`, `pnpm test --coverage`, `pnpm build` all green
- `sonar` runs locally; Quality Gate = PASS; `javascript:S3776 = 0`
- Browser smoke via Chrome DevTools MCP: `navigate` to running web URL → use `fill`/`click` on a `ConfigPanel` control to change a preset → run `evaluate` to read the current value from `localStorage` and assert the key `viral-cristao:config:v1` is populated → reload via `navigate` again → `evaluate` to read the React state (or DOM) and assert the changed preset persisted → `list_console_messages` (assert empty). Then corrupt `localStorage` via `evaluate` (`localStorage.setItem('viral-cristao:config:v1', 'not-json')`), reload, assert defaults restored without crash
- Git finalize with conventional commits + `Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>` trailer
- PR description includes the SonarCloud block
- On-screen execution summary at task close

## Subtasks
> Pass 2 — to be expanded on approval. Expected ~3 subtasks (persistence module, hook, App wiring).
