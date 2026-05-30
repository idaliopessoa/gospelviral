# TASK_021: Standardize file upload (click + drag-n-drop) across overlay + video
timestamp: 2026-05-30T00:00:00Z
version: 1.0
status: Planning
owner: unassigned
confidence: HIGH (root cause reproduced; fix is a small shared primitive)

> Trigger: the overlay PNG upload "stopped working" — clicking does NOT open the file picker (the click falls through to text selection) and dragging a file onto the zone opens the image in a new browser tab. Root cause reproduced in-browser (Chrome DevTools MCP).

## Black Box Interface

### INPUT
- **Required Context**:
  - `apps/web/src/components/OverlayControls.jsx` — overlay PNG upload. Currently a `<label>` wrapping a `display:none` `<input type=file>`; NO drag handlers. The `<label>` + `display:none` input is unreliable: a real click selects the label text instead of activating the input → picker never opens. No `onDrop` → dropping a file navigates the browser to the image.
  - `apps/web/src/components/VideoUploadButton.jsx` — video upload. Already supports click (label) + drag (`onDragOver`/`onDrop` on `EmptyZone`). The standard to converge on, but its click rides the same fragile label pattern.
  - Tests: `OverlayControls.test.jsx`, `VideoUploadButton.test.jsx` (drop-equals-pick already covered for video).
  - Lens: `01-Systems-Architecture-Expert-viral-cristao.md` (SSOT, replaceable, single responsibility).
- **Prerequisites**: TASK_019 (overlay/video preview) — Complete; TASK_020 — Complete.
- **Parameters**: none.

### OUTPUT
- **Deliverables**:
  - NEW shared primitive `apps/web/src/hooks/useFileSelect.js` — `useFileSelect({ accept, onFile }) → { isDragging, open, inputProps, zoneProps }`. SSOT for "select a file via click OR drag": explicit `open()` = `inputRef.current.click()` (reliable picker, not label+`display:none`); `zoneProps` carries `onClick=open` + `onDragOver`/`onDragLeave`/`onDrop` (all `preventDefault` → no browser navigation, sets `isDragging`); `inputProps` carries the `<input>` wiring + resets `value` after a pick (re-select the same file); `onFile(file)` once per selection from either path.
  - `OverlayControls` consumes the hook: real picker on click, drag-n-drop added, drag-over highlight, `select-none` (no text selection), inline MIME error (replaces blocking `alert`).
  - `VideoUploadButton` `EmptyZone` consumes the same hook (click + drag standardized; keeps its EMPTY/PENDING/FILLED states + `data-upload-state` markers + size formatting).
- **Artifacts**: Vitest — `useFileSelect.test.js` (open→input.click; change→onFile + value reset; drop→onFile + preventDefault; dragover/leave→isDragging); updated `OverlayControls.test.jsx` (click opens via ref, drop applies overlay, MIME reject inline, drag highlight) + `VideoUploadButton.test.jsx` (existing drop/pick still green). Optional DEC (shared upload primitive).

### INVARIANTS
- **Must Maintain**:
  - Both affordances: **click opens the OS picker** AND **drag-n-drop applies the file** — identical outcome (`onFile`) from either path, both components.
  - Overlay config SSOT: `setOverlayConfig({ dataURL, opacity, filename })` shape unchanged; opacity slider + Remover untouched. Video `onChange(videoSource|null)` + async upload + states unchanged.
  - The `@gospelviral/shared` boundary irrelevant (web-only); `reference/viral-cristao-artifact.jsx` untouched; CC ≤ 15.
- **Quality Gates**: `pnpm lint` 0; Vitest green + ≥80% on the new hook; `pnpm sonar` PASS + S3776=0; Chrome DevTools MCP smoke (overlay click opens picker + drag applies; video parity); auditor AUDITORIA LIMPA. smoke:heap N/A (no upload-route/video-storage/multipart file touched — only web components/hook).

## Task Definition
Standardize file selection across the overlay and video uploads so both accept a click (reliably opening the OS file picker) and drag-n-drop (applying the dropped file without the browser navigating away), by extracting one shared `useFileSelect` hook that owns the click+drag+reset+drag-state plumbing, and fixing the overlay upload that currently neither opens the picker on click (text-selection fall-through) nor handles a drop.

## Success Criteria
1. Overlay: clicking the zone opens the OS file picker (no text selection); choosing a PNG applies the overlay.
2. Overlay: dragging a PNG onto the zone highlights it and, on drop, applies the overlay (no new-tab navigation).
3. Video: click + drag both still work (parity), states/markers preserved.
4. Re-selecting the same file fires `onFile` again (input value reset).
5. Sonar QG PASS, S3776=0, auditor AUDITORIA LIMPA, MCP smoke confirms.

## Risk Assessment
| Risk | Level | Mitigation | Detection |
|---|---|---|---|
| Refactoring the working VideoUploadButton regresses its states | MEDIUM | Keep `data-upload-state`/size/markers; run its full test file unchanged-green | VideoUploadButton tests |
| `<input>` value-reset breaks the change handler timing | LOW | Read the file BEFORE resetting `value` | useFileSelect test |
| Native picker can't be asserted in jsdom | LOW | Unit-test `open()` calls `input.click()`; confirm the real picker in the MCP smoke | hook test + MCP |

## TASK_COMPLEXITY_ASSESSMENT
COMPONENTS: MEDIUM (new hook + 2 components). INTERFACES: LOW (one small hook API; component props unchanged). DOMAINS: LOW (web UI only). COGNITIVE_LOAD: LOW (single session). → One MEDIUM only → **decomposition NOT required**; single task with P1/P2/P3.

## Prerequisite Subtasks (MANDATORY)
### SUBTASK_021.P1: GitFlow
**Status**: ⏱️ Not Started — branch `feature/task-021-standardize-file-upload` from `develop`; conventional commits `(web)`; PR → develop; Co-Authored-By.
### SUBTASK_021.P2: Tests
**Status**: ⏱️ Not Started — TDD/AAA; ≥80% on `useFileSelect`; existing Overlay/Video suites green (updated where the markup changed); CC ≤ 15.
### SUBTASK_021.P3: Finalization
**Status**: ⏱️ Not Started — lint 0; per-workspace coverage; `pnpm sonar` PASS + S3776=0; **smoke:heap N/A** (no hot-path file); Chrome DevTools MCP smoke (overlay click-picker + drag; video parity) + screenshots; black-box-auditor → AUDITORIA LIMPA; PR with SonarCloud block. Human gate at PR (NOT auto-merge).
