# TASK_004: App Composition + Visual Parity
timestamp: 2026-05-27T00:00:00Z
version: 1.0
status: Ready
owner: unassigned
confidence: MEDIUM
phase: 1

## Black Box Interface

### INPUT
- **Required Context**:
  - `viral-cristao-artifact.jsx` lines ~1263-1593 (`App` state machine, inline `<style>` block with `.canvas-9-16` / `.video-16-9` / `.canvas-width-only`, Google Fonts `@import`, header/footer markup, three views)
  - TASK_002 OUTPUT (lib modules ready to import)
  - TASK_003 OUTPUT (components ready to compose)
- **Prerequisites**: TASK_002, TASK_003 (both Complete)
- **Parameters**: none

### OUTPUT
- **Deliverables**:
  - `apps/web/src/App.jsx` — root component with the three-view state machine (`input → analyzing → results`), holding `subtitleConfig`, `videoConfig`, `overlayConfig`, `url`, `transcript`, `results`, `error`, `loadingStep`, `exampleVideoId`, `activeTab`, `isConfigCollapsed`
  - `apps/web/src/main.jsx` — React 18 root entry
  - `apps/web/src/styles/globals.css` — Google Fonts `@import` + the canvas-dimension CSS classes (preserved verbatim) + Tailwind base/components/utilities directives
  - `apps/web/index.html` — mount point + viewport meta + `lang="pt-BR"`
  - `apps/web/tailwind.config.js` — content globs covering `src/**/*.{js,jsx}`, no theme extensions yet
  - `apps/web/src/lib/api.js` — **placeholder**: returns `EXAMPLE_RESPONSE` after a 1.2s delay when input is the example; otherwise throws `"backend not wired yet — TASK_010"`. Same module surface as the eventual fetch wrapper, so TASK_010 swaps internals only
  - Parity evidence: side-by-side screenshots (artifact host vs `pnpm -F web dev`) saved to `memory_bank/tasks/evidence/task_004/` for record, OR a documented note that visual parity was confirmed by hand-eye review against the running artifact
- **Artifacts**:
  - `pnpm -F web dev` boots and reproduces the artifact's three views without console errors
  - SonarCloud Quality Gate = PASS; `javascript:S3776 = 0` on new code
- **Decisions Generated**:
  - DEC: parity evidence format — textual checklist + Chrome DevTools MCP screenshots (`take_screenshot` of each of the three views, attached to PR description). Snapshot-based pixel-diff regression is a ROADMAP item (Playwright is the obvious tool but is not in scaffold per TASK_001 DEC)
  - DEC: where to mount the global `<style>` block — `styles/globals.css` (extracted) vs inline `<style>` in App (kept as-is). Proposed: extracted to CSS file, but the inline canvas CSS comment from the artifact explaining "dodge Tailwind arbitrary-value issues" is carried into the CSS file as a comment

### INVARIANTS
- **Must Maintain**:
  - `viral-cristao-artifact.jsx` at the repository root remains **byte-identical** until TASK_012
  - View state machine identical: `view` ∈ {`input`, `analyzing`, `results`}, transitions exactly as in `.jsx`
  - Default config values match `.jsx` (`charsPerScreen: 30`, `lines: 2`, `position: 'bottom'`, `size: 'M'`, `highlightScripture: true`, `highlightKeywords: true`, `font: 'IBM Plex Sans'`, `textColor: '#FFFFFF'`, `background: 'shadow'`, `bgColor: '#000000'`, `x: 0`, `y: 0`; `videoConfig: { x: 0, y: 0, scale: 1.0 }`; `overlayConfig: { dataURL: null, opacity: 1.0, filename: null }`)
  - Background color of the page = `#F5F1EA` (paper)
  - Typography load order from Google Fonts identical to `.jsx`
  - Loading message rotation cadence = 3500ms (preserved)
  - `analyze()` for now still constructs `fullPrompt` from `OPTIMIZED_PROMPT + transcript`, but routes the request through `lib/api.js` rather than direct `fetch` — actual transport is the placeholder
  - "Ver exemplo pronto" still bypasses the API entirely
- **Quality Gates**:
  - No regression on TASK_002 / TASK_003 specs
  - `App.jsx` itself stays under Cognitive Complexity 15 — if `analyze()` or the JSX tree pushes over, extract `useAnalyze` hook or break the three views into sub-components
  - SonarCloud Quality Gate = PASS; `javascript:S3776 = 0` on new code

## Task Definition
Compose the previously-extracted lib and components into a working Vite app whose rendered UI is visually and behaviorally indistinguishable from the artifact, including the three-view state machine, default configs, font/CSS loading, and the example-data path. Wire the eventual API call through a placeholder `lib/api.js` so the transport swap in TASK_010 touches only that file. Use the `.jsx` running in the artifact host as the parity reference.

## Success Criteria
1. `pnpm -F web dev` starts and renders the `input` view that matches the artifact (typography, palette, spacing, copy)
2. Clicking "Ver exemplo pronto" populates URL + transcript, sets `results` to `EXAMPLE_RESPONSE`, and transitions to `results` view
3. Clicking "Analisar momentos virais" with valid input transitions to `analyzing` view, loading messages rotate every 3.5s, then transitions to `results` showing the placeholder data (or surfaces the placeholder error in `error` panel — both acceptable for this task)
4. Drag handlers on `SubtitlePreview` move the video and subtitle inside any of the 5 `MomentCard`s; updates apply globally to all 5 (the "aplica aos 5" guarantee from the artifact)
5. Sticky `ConfigPanel` collapses/expands; tab switches between Legenda / Vídeo / Overlay
6. PNG upload via `OverlayControls` renders the overlay with adjustable opacity
7. "Nova análise" returns to `input` view, clears `results` and `exampleVideoId`
8. No console errors during the full happy-path session
9. SonarCloud Quality Gate = PASS; `javascript:S3776 = 0` on new code
10. `.jsx` at root is byte-identical to pre-task state

## Risk Assessment
| Risk | Level | Mitigation | Detection |
|---|---|---|---|
| Visual parity is subjective — "looks the same" is not a binary | HIGH | **Side-by-side human review is the gate for THIS task; snapshot-based regression (Playwright or equivalent) is deferred to ROADMAP, not part of TASK_004's acceptance.** Document the parity check as a textual checklist (typography, palette, spacing, copy, layout breakpoints) signed by the reviewer; attach Chrome DevTools MCP screenshots (`take_screenshot` per view) + `list_console_messages` (expect empty) + `list_network_requests` (expect 2xx everywhere) as PR evidence | Reviewer signs off on the checklist in the PR description; MCP transcript pinned in PR |
| Tailwind JIT in Vite may compile arbitrary classes that the artifact host could not (`w-[280px]`), tempting "cleanup" that breaks parity | MEDIUM | Per arch doc: keep the CSS-puro fallback in `globals.css` as defense-in-depth; do not rewrite `.canvas-9-16` to inline Tailwind | Diff against `.jsx` inline `<style>` block |
| Google Fonts `@import` in CSS blocks first paint — artifact-host caching may have masked this | LOW | Acceptable as-is for Pass 1; if it bites, swap to `<link rel="stylesheet">` in `index.html` in a follow-up | Network panel during dev |
| `analyze()` async flow + state machine drift — easy to mis-handle error → `view` reset | MEDIUM | Lift `analyze` into a `useAnalyze(deps)` hook with explicit returned state; unit-test the hook with mocked `lib/api.js` | Hook spec + manual smoke |
| `App.jsx` JSX tree is long (~250 lines) — Cognitive Complexity may exceed 15 | MEDIUM | If it does, split each view (`InputView`, `AnalyzingView`, `ResultsView`) into its own component file under `src/views/` | `sonar` reports the violation |
| `localStorage` is **not** wired in this task (deferred to TASK_011) — every reload resets configs, which can confuse the parity reviewer | LOW | Document in PR: "configs reset on reload — wired in TASK_011" | Parity checklist mentions it |

## Implementation Strategy
1. Create `index.html`, `main.jsx`, `App.jsx` skeletons; wire the React 18 root
2. Move the inline `<style>` block from `.jsx` to `styles/globals.css` byte-identical; add Tailwind `@tailwind base/components/utilities` above it
3. Move `App` state and the three-view JSX from `.jsx` to `App.jsx`, replacing inline component definitions with imports from `components/`
4. Implement `lib/api.js` placeholder: same exported function name as the eventual `analyze()`; internally returns `EXAMPLE_RESPONSE` only when input matches the example URL+transcript, else throws the placeholder error
5. Boot the dev server; walk the three views; compare to `.jsx` running in the artifact host (open both side by side)
6. Iterate on differences; tighten the parity checklist; capture screenshots (optional, save to evidence folder)
7. Lint, test, sonar (`@sonar/scan`), finalize

## Prerequisite Subtasks (MANDATORY)

### SUBTASK_004.P1: GitFlow Workflow
**Status**: ⏱️ Not Started
- Branch: `feature/task-004-app-composition` from `develop`
- Commits: `feat(web): wire React 18 root`, `feat(web): port App state machine`, `feat(web): port global styles + fonts`, `feat(lib): api placeholder`, `chore(web): parity evidence`
- PR targeting `develop`, reviewed, source branch deleted after merge

### SUBTASK_004.P2: Tests Workflow
**Status**: ⏱️ Not Started
- TDD where applicable: `useAnalyze` hook spec (mocked `lib/api.js`) before extraction; default-config snapshot spec to pin invariants
- AAA in every spec
- Component specs from TASK_003 continue to pass (zero regressions)
- Cognitive Complexity ≤ 15 across all new code

### SUBTASK_004.P3: Task Finalization
**Status**: ⏱️ Not Started
- `pnpm lint`, `pnpm -F web test --coverage`, `pnpm -F web build` all green
- `sonar` runs locally; Quality Gate = PASS; `javascript:S3776 = 0` on new code
- Visual parity checklist signed off by reviewer in PR description (textual is acceptable; screenshots optional)
- Git finalize with conventional commits + `Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>` trailer
- PR description includes the SonarCloud block
- On-screen execution summary at task close

## Subtasks
> Pass 2 — to be expanded on approval. Expected ~5 subtasks (HTML+entry, global styles, App state + JSX, api placeholder, parity sweep).
