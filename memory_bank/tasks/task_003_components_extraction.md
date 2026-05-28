# TASK_003: Components Extraction (1:1)
timestamp: 2026-05-27T00:00:00Z
version: 1.0
status: Ready
owner: unassigned
confidence: HIGH
phase: 1

## Black Box Interface

### INPUT
- **Required Context**:
  - `viral-cristao-artifact.jsx` lines ~528-1260 (COMPONENTES section: `CopyButton`, `CopyAllButton`, `ScoreBar`, `SubtitlePreview`, `MomentCard`, `NumberField`, `SubtitleControls`, `VideoControls`, `OverlayControls`, `ConfigPanel`)
  - `01-Systems-Architecture-Expert-viral-cristao.md` §"Project-Specific Black Box Boundaries" — the contracts table is the authoritative interface spec
  - TASK_002 OUTPUT (`apps/web/src/lib/` is the source of helpers and constants)
- **Prerequisites**: TASK_002 (Complete)
- **Parameters**: none

### OUTPUT
- **Deliverables**:
  - `apps/web/src/components/` with one file per component:
    - `CopyButton.jsx`, `CopyAllButton.jsx`, `ScoreBar.jsx`, `NumberField.jsx`
    - `MomentCard.jsx`, `SubtitlePreview.jsx`
    - `ConfigPanel.jsx`, `SubtitleControls.jsx`, `VideoControls.jsx`, `OverlayControls.jsx`
  - `@testing-library/react` specs per component focused on **behavioral contract**, not styling
  - Internal hooks extracted only when Cognitive Complexity demands it (e.g., `useSubtitleDrag`, `useVideoDrag`, `useChunkRotation` are candidates — decision deferred to Pass 2 measurement)
- **Artifacts**:
  - Coverage ≥ 80% on components with behavior (`SubtitlePreview`, `MomentCard`, drag-bearing controls); lower bar acceptable on pure-render leaves
  - SonarCloud Quality Gate = PASS; `javascript:S3776 = 0` on new code
- **Decisions Generated**:
  - DEC: `useSubtitleDrag` / `useVideoDrag` as shared hook or duplicated logic — driven by Cognitive Complexity readings, not preference
  - DEC: inline `style={{ fontFamily: ... }}` retained vs Tailwind utility — keep inline per arch doc (`Tailwind config isn't available for fontFamily without theme extension`)

### INVARIANTS
- **Must Maintain**:
  - `viral-cristao-artifact.jsx` at the repository root remains **byte-identical** until TASK_012
  - Every prop contract in the black-box table (`01-…` doc §"Project-Specific Black Box Boundaries") is preserved verbatim — same prop names, same callback signatures, same passing-down structure
  - Coordinate system unchanged: 1080×1920 canvas reference, `scaleFactor = canvasSize.width / 1080`, pointer deltas recorded in canvas-px not preview-px
  - Subtitle anchor percentages unchanged: top=12, center=50, bottom=86
  - Pointer Events with `setPointerCapture` and `touchAction: 'none'` — both preserved on every draggable layer
  - Z-index hierarchy unchanged: video < overlay (z-10) < subtitle (z-20) < chunk counter (z-20) < sticky ConfigPanel (z-50)
  - `getScore()` tolerance for both `{score, notes}` object and raw number — kept exactly
  - Cold-open badge dual-check: `moment.cold_open === true` OR `moment.cold_open_analysis?.decision === 'apply_cold_open'`
- **Quality Gates**:
  - Each component's spec asserts at minimum: renders without throwing, props produce the documented effect, callbacks fire on the documented user action
  - Cognitive Complexity ≤ 15 per component/hook
  - No component imports from another component's internals — only from `lib/` and from other components' default export

## Task Definition
Move each React component from the monolithic artifact into its own file under `apps/web/src/components/`, preserving the prop interfaces documented in the architecture doc verbatim, and pinning each component's behavioral contract with `@testing-library/react` tests. After this task, components are independently importable, individually testable, and free of cross-file private dependencies — but the rendered DOM matches the artifact byte-for-byte under the same props.

## Success Criteria
1. Every component listed in `.jsx` COMPONENTES section exists as a separate file with named default export
2. Imports resolve cleanly: each component imports from `react`, `lucide-react`, `apps/web/src/lib/*` — never from another component's internals
3. `pnpm -F web test` runs all component specs green
4. Each draggable component has a test asserting pointer-drag math: synthetic `pointerdown → pointermove → pointerup` updates the relevant config with canvas-px deltas
5. `MomentCard.test.jsx` renders the `EXAMPLE_RESPONSE.top_moments[0]` without errors and exposes `viral_score`, `hook_title`, `caption.text`, `hashtags.all` to the DOM
6. SonarCloud Quality Gate = PASS; `javascript:S3776 = 0`
7. `.jsx` at root is byte-identical to pre-task state

## Risk Assessment
| Risk | Level | Mitigation | Detection |
|---|---|---|---|
| `SubtitlePreview` is the largest component (~210 lines, drag math + chunk rotation + responsive canvas measurement) — Cognitive Complexity will likely exceed 15 | HIGH | Extract `useSubtitleDrag`, `useVideoDrag`, `useChunkRotation`, `useCanvasMeasurement` as hooks under `apps/web/src/hooks/`; main component stays orchestration-only | `sonar` reports S3776 at every commit; refactor on red |
| Pointer Events + `setPointerCapture` are awkward to assert in jsdom (Vitest default) | MEDIUM | Use `@testing-library/user-event` `pointer` API; for cases where jsdom is too thin, mark spec as `.skip` with a TODO pointing to a browser-driven check via Chrome DevTools MCP at TASK_004 audit time (Playwright not in scaffold; it would only enter via ROADMAP if snapshot regression returns) | E2E coverage gap explicitly tracked |
| Inline `style={{ fontFamily: ... }}` ubiquitous — easy to accidentally drop during extraction | LOW | Diff each extracted component against its source slice; preserve all inline styles verbatim | Visual parity in TASK_004 catches drift |
| Drag math uses `scaleFactor` measured at runtime — test must mock `getBoundingClientRect` or layout will be 0×0 | MEDIUM | Provide a shared `renderInSizedContainer(component, { width: 280 })` test helper | Drag tests fail without it |
| `MomentCard` consumes deeply nested `moment.*` fields — partial fixtures may NPE if a future API drops a field | MEDIUM | Tests run against the full `EXAMPLE_RESPONSE.top_moments[0]`; component uses optional chaining everywhere it already does | Spec failures on shape drift |

## Implementation Strategy
1. Inventory components in `.jsx` and map each to its black-box-table row to confirm interface
2. Extract leaf components first (`CopyButton`, `NumberField`, `ScoreBar`) — zero dependencies on other components, easy to verify
3. Extract controls (`SubtitleControls`, `VideoControls`, `OverlayControls`) — they only consume `{ config, setConfig }`
4. Extract `ConfigPanel` — it composes the three controls
5. Extract `SubtitlePreview` last, with hooks pulled out if S3776 demands; this is the gnarliest unit
6. Extract `MomentCard` — composes `SubtitlePreview` + score breakdown + copy buttons
7. After each extraction: run its spec green, then run all prior specs green, then `sonar` before the next

## Prerequisite Subtasks (MANDATORY)

### SUBTASK_003.P1: GitFlow Workflow
**Status**: ⏱️ Not Started
- Branch: `feature/task-003-components-extraction` from `develop`
- Commits (per component, granular): `refactor(components): extract <Component>`, `test(components): cover <Component>`
- PR targeting `develop`, reviewed, source branch deleted after merge

### SUBTASK_003.P2: Tests Workflow
**Status**: ⏱️ Not Started
- TDD per component: failing behavioral spec → extraction → green
- AAA in every spec; Render → Act (fire event) → Assert (DOM or callback)
- Tests exercise the **black-box** through props only; never inspect internal `useState`
- Coverage ≥ 80% on behavior-bearing components; report covered branches in PR
- Zero regressions on TASK_002 specs
- No component or hook exceeds Cognitive Complexity 15

### SUBTASK_003.P3: Task Finalization
**Status**: ⏱️ Not Started
- `pnpm lint`, `pnpm -F web test --coverage`, `pnpm -F web build` all green
- `sonar` runs locally; Quality Gate = PASS; `javascript:S3776 = 0` on new code
- Browser smoke (Chrome DevTools MCP): skipped (component-level renders only; no app shell yet — wired in TASK_004)
- Git finalize with conventional commits + `Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>` trailer
- PR description includes the SonarCloud block
- On-screen execution summary at task close

## Subtasks
> Pass 2 — to be expanded on approval. Expected ~10 subtasks (one per component file, with `SubtitlePreview` likely splitting into hooks-first then main-component).
