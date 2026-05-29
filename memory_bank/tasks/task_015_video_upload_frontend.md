# TASK_015: Video Upload — Frontend UI + Integration
timestamp: 2026-05-28T00:00:00Z
version: 1.1
status: Ready
owner: unassigned
confidence: MEDIUM
phase: 4

## Black Box Interface

### INPUT
- **Required Context**:
  - `bootstrap-features-fases-3-6.md` §"FASE 4 — Ingestão do vídeo-fonte por upload" — product spec, upload affordance, badge surface
  - TASK_014 OUTPUT — `POST /api/upload/video` shape, `VideoSource` typedef in `@gospelviral/shared`
  - `apps/web/src/App.jsx` — owner of session state; `videoSource` lands here
  - `apps/web/src/views/ResultsView.jsx` — pass-through layer
  - `apps/web/src/components/ConfigPanel.jsx` — current 3-tab pattern; the proposed UX placement for the upload affordance (see decision D5 below)
  - `apps/web/src/lib/api.js` + `apps/web/src/lib/runtime.js` — `fetch` patterns to mirror
  - `apps/web/src/lib/persistence.js` — explicitly to confirm `videoSource` is NOT added here
  - `01-Systems-Architecture-Expert-viral-cristao.md` §"SSOT", §"Primitive-First Design"
  - `02 - Task Creation System - Black Box Architecture.md` — protocol
- **Prerequisites**: TASK_014 (Complete) — endpoint + VideoSource typedef exist
- **Parameters**: none

### OUTPUT
- **Deliverables**:
  - `apps/web/src/lib/upload.js` — exports:
    - `uploadVideo(file: File): Promise<VideoSource>` — POSTs `multipart/form-data` with field `video` to `/api/upload/video`, returns the parsed VideoSource or throws a typed `UploadError`
    - `UploadError` class with `{ code: 'invalid_mime_type' | 'file_too_large' | 'network' | 'unknown', message: string }`
  - `apps/web/src/lib/upload.test.js`
  - `apps/web/src/components/VideoUploadButton.jsx` — UI surface with TWO visually distinct states (see D5 INVARIANT below):
    - **EMPTY state** (`videoSource={null}`): generous drag-drop zone (vertical padding ≥ 64 px), prominent CTA "Subir vídeo do trecho", supporting copy ("ou arraste o MP4 / MOV / WebM para esta área · até 2 GB"), `<input type="file" accept="video/mp4,video/quicktime,video/webm">` triggered by clicking the CTA. Visually reads as ACTION, not configuration
    - **FILLED state** (`videoSource` present): a single discrete line "filename.mp4 · 123 MB · remover". No card, no large surface — minimal footprint so the configuration tabs (Legenda / Vídeo / Overlay) stay the visual peers
    - Surfaces upload errors inline (`UploadError.code` → PT-BR message) below the dropzone in EMPTY state
    - Pure controlled: props `{ videoSource: VideoSource | null, onChange: (vs: VideoSource | null) => void }`
    - No internal `useState` for the uploaded value — owned by App (same global pattern as `activeCardTab`, `subtitleConfig`)
    - Pending state ("Enviando...") may be local (`useState`) since it does not survive a remount
  - `apps/web/src/components/VideoUploadButton.test.jsx`
  - `apps/web/src/App.jsx` — adds `const [videoSource, setVideoSource] = useState(null)`; `handleReset()` clears it; passes to `ResultsView`
  - `apps/web/src/views/ResultsView.jsx` — accepts `videoSource`, `setVideoSource`; renders `<VideoUploadButton>` in the UX slot decided in D5 below
  - `apps/web/src/App.test.jsx` — extends with: upload happy path (mocked `fetch`), reset clears the videoSource
  - **Visual UX placement (decision D5 — see below)**: ConfigPanel grows a 4th tab "Vídeo Fonte" hosting the `<VideoUploadButton>`. The badge (filename + size) shows in the ConfigPanel header strip too, so the user sees the active video without opening the tab
- **Artifacts**:
  - SonarCloud Quality Gate = PASS; `javascript:S3776 = 0` on new code; coverage ≥ 90% on `upload.js`
- **Decisions Generated**:
  - **DEC: `videoSource` is session-only, NOT persisted to `localStorage`.** Two reasons: (a) the value is a server-side handle that becomes invalid after server restart (cleanup-on-boot), so persisting it would create stale references; (b) `localStorage` quota (~5 MiB) is irrelevant for the metadata, but the principle (visual presets only) recorded in `persistence.js` stays clean
  - **DEC: `VideoUploadButton` is stateless / controlled.** App owns `videoSource`; the component receives it as a prop and emits changes via `onChange`. Mirrors the `CardTabs` pattern from TASK_013
  - **DEC: UX placement = 4th tab in `ConfigPanel` titled "Vídeo Fonte" (icon: `Film` from lucide).** Reasons: (a) reuses the existing collapse/expand affordance so the dropzone hides when collapsed; (b) the badge "X.mp4 · 123 MB" can live in the ConfigPanel header strip beside "Configuração global · aplica aos 5" so the user always sees the active video. **The "Vídeo Fonte" tab is NOT a configuration tab semantically — see the visual-states INVARIANT below**
  - **DEC: The "Vídeo Fonte" tab has TWO visually distinct states by design.** EMPTY = action-first surface (big CTA + generous drop zone). FILLED = a single discrete line. The visual differentiation is the gate: if the tab reads like a configuration peer (Legenda / Vídeo / Overlay) the conceptual frame ("this is an action, not a setting") breaks. Pinned by component tests and the manual MCP smoke
  - **DEC: Error mapping** — `invalid_mime_type` → "Formato não suportado. Use MP4, MOV ou WebM."; `file_too_large` → "Arquivo grande demais. Limite 2 GB."; `network` → "Falha de conexão com o servidor."; `unknown` → "Erro ao enviar o vídeo."
  - **DEC: No upload-progress UI in Phase 4.** A simple "Enviando..." pending state is enough. Progress bars require XHR (`fetch` does not expose upload progress). Deferred to ROADMAP if user feedback requests it

### INVARIANTS
- **Must Maintain**:
  - `reference/viral-cristao-artifact.jsx` remains frozen
  - `App.jsx` is the **single owner** of `videoSource`. `VideoUploadButton` and any future consumer (Phase 5 `<video>`) read via props, never from globals, never cache
  - `videoSource` MUST NOT enter `loadVisualPresets` / `saveVisualPresets`; `persistence.js` is the SSOT for VISUAL presets only, and a session-only marker comment is added near the existing dataURL strip to remind future maintainers
  - `VideoUploadButton` is stateless for the uploaded value (no internal `useState` storing the resulting VideoSource) — pending/error state may be local
  - **Two visual states INVARIANT (D5 enforcement)**: EMPTY and FILLED states are visually distinct. EMPTY = generous drop area + prominent CTA "Subir vídeo do trecho" (vertical padding ≥ 64 px; CTA font size ≥ the existing tab body labels). FILLED = a single discrete line "filename · size · remover" (height ≤ 32 px, no card surface). The component test asserts the EMPTY-state container is taller than the FILLED-state container, AND that the EMPTY-state contains a visible CTA element whose text matches /Subir vídeo/i. The MCP smoke captures both states for visual review
  - `MomentCard` props are NOT touched in TASK_015. Phase 5 will add `videoSource` to `MomentCard` props; Phase 4 only threads to `ResultsView` and lives next to `ConfigPanel`
  - `VideoSource` typedef is imported (or referenced via JSDoc) from `@gospelviral/shared`; not duplicated on the web side
  - Cognitive Complexity ≤ 15 per function (`javascript:S3776`)
  - Zero regressions across `pnpm test`
- **Quality Gates**:
  - `upload.test.js` covers:
    1. Happy path: `fetch` returns 200 with `{ videoSource }` → resolves to that VideoSource
    2. 400 `invalid_mime_type` → rejects with `UploadError { code: 'invalid_mime_type' }`
    3. 400 `file_too_large` → rejects with `UploadError { code: 'file_too_large' }`
    4. Network failure (mocked `fetch` rejects) → rejects with `UploadError { code: 'network' }`
    5. 500 with no body → rejects with `UploadError { code: 'unknown' }`
    6. The FormData sent has the correct field name `video` and the file is the same File object passed in
  - `VideoUploadButton.test.jsx` covers:
    1. EMPTY state (`videoSource={null}`): renders the dropzone, a visible CTA matching /Subir vídeo/i, and the file picker affordance
    2. FILLED state (`videoSource` set): shows the filename + size + "Remover" button on a single discrete line; the EMPTY-state CTA is NOT in the DOM
    3. EMPTY-state container is taller than FILLED-state container (measure via `getBoundingClientRect().height` stub or compare class-applied min-height tokens). Pins the visual-states INVARIANT
    4. Click "Remover" (FILLED state): calls `onChange(null)`
    5. Picking a file via the input (EMPTY state): calls `uploadVideo` then `onChange(videoSource)` on success; pending text "Enviando..." appears while the promise is pending
    6. Picking a file that the server rejects: shows the PT-BR error message inline, does NOT call `onChange`
    7. Dropping a file onto the dropzone behaves identically to picking via input
  - `App.test.jsx` covers: `handleReset()` clears `videoSource` (and continues to clear the example videoId, transcript, etc.)
  - **Manual browser smoke via Chrome DevTools MCP**: navigate → load example → open the new 4th tab → drag-drop a small synthetic MP4 file → assert the badge appears with filename + size → screenshot before/after → click Remover → screenshot empty state. Console = no errors

## Task Definition
Surface a manual-upload affordance in the UI (4th tab in `ConfigPanel`, drag-drop or file picker), wire it through a typed `uploadVideo` client to the TASK_014 backend, and lift the resulting `VideoSource` into `App.jsx` as session-only state. The active video is visible as a badge alongside the global-config marker; resetting the analysis clears it. The "Vídeo Fonte" tab has two visually distinct states (EMPTY action-first, FILLED discrete line) so the user reads "this is an action" and not "this is one more setting".

## Success Criteria
1. With `pnpm dev` running, loading the example response shows a "Vídeo Fonte" tab in `ConfigPanel`. The tab is empty by default
2. Selecting a small MP4 via the file picker uploads it and shows the badge "filename.mp4 · X MB" both in the header strip and inside the tab
3. Dragging a file onto the dropzone produces the same result
4. Clicking "Remover" clears the badge; the file remains on the server (cleanup is only on server boot, by spec — recorded in [[task_014]])
5. Clicking "Nova análise" returns to the input view AND clears `videoSource`
6. SonarCloud Quality Gate = PASS; `javascript:S3776 = 0` on new code
7. Black-box auditor: AUDITORIA LIMPA

## Risk Assessment
| Risk | Level | Mitigation | Detection |
|---|---|---|---|
| Stale `videoSource` after server restart (cleanup-on-boot deletes the file, but the frontend still has the VideoSource in memory) | MEDIUM | Phase 5 will detect via `GET /info` 404 and prompt re-upload. Phase 4 just documents the limitation in UX copy ("vídeo não persiste entre reinícios do servidor") | UX copy |
| User uploads while example fixture is loaded — what is the videoSource bound to? | LOW | Per bootstrap: VideoSource is "associated with the current analysis". App state has a single `videoSource` slot — switching analyses (Nova análise) clears it. Example fixture analysis allows upload too; the binding is implicit via App state, not via an explicit FK | UI behavior pinned by test |
| `fetch` upload of a large file blocks the main thread / UI freezes | MEDIUM | The browser handles multipart upload off-thread; UI shows "Enviando..." pending state. No worker needed in Phase 4. Smoke covers a ~500 MB file at minimum given the 2 GB server cap | Manual smoke with a ~500 MB file |
| The Vídeo Fonte tab visually reads like a 4th configuration peer (Legenda / Vídeo / Overlay / Vídeo Fonte) and the "action vs setting" conceptual frame collapses | HIGH | Pinned as INVARIANT: EMPTY state has a generous drop area + prominent CTA; FILLED state is a single discrete line. Component test asserts the two-state distinction; manual MCP smoke captures both states. If the smoke shows the tab still reads as "one more setting", the swap to a header-button placement is a 30-line refactor recorded as a follow-up | Manual MCP smoke |
| Drag-drop UX accidentally hijacks page navigation if the user drops outside the zone | LOW | Add `preventDefault` on document-level `dragover` / `drop` only while the component is mounted; clean up on unmount | Component lifecycle test |
| Sonar `javascript:S5852` ReDoS on a mime-validation regex | MEDIUM | Use Set membership check (`ALLOWED_MIMES.has(file.type)`), NOT regex. Recorded in [[sonar_quality_gate_gotchas]] | Local sonar |

## Implementation Strategy
1. **Write tests first** (TDD, AAA) — `upload.test.js`, `VideoUploadButton.test.jsx` (including the EMPTY-vs-FILLED state distinction test), extend `App.test.jsx`
2. Implement `lib/upload.js` (Set-based mime check, typed `UploadError`)
3. Implement `VideoUploadButton.jsx` with the two visual states:
   - EMPTY: generous drop area (min-height ≥ 160 px), CTA "Subir vídeo do trecho" (size + weight that reads as a primary action), supporting copy, file picker on click, dropzone handlers
   - FILLED: a single discrete line "filename · sizeMB · Remover" (height ≤ 32 px)
   - Pending state ("Enviando...") local
   - Error display inline (EMPTY-state only)
4. Add `videoSource` state to `App.jsx`; clear in `handleReset`
5. Add a 4th tab to `ConfigPanel` (icon `Film`, label "Vídeo Fonte"); body renders `<VideoUploadButton>`; header strip shows the badge when FILLED
6. Thread through `ResultsView`
7. Run gates per [[sonar_env_sourcing]] + [[pnpm_workspace_test_coverage_flake]]
8. Manual smoke via Chrome DevTools MCP: load example → open Vídeo Fonte tab → screenshot EMPTY state → drag-drop a synthesized MP4 → screenshot FILLED state → click Remover → screenshot EMPTY state again → check console + network. Visual review confirms the two-state distinction reads correctly
9. Black-box auditor; close gaps in-branch; PR

## Known follow-ups (NOT in scope of TASK_015)
- **Stale-videoSource detection** — Phase 5 wires `GET /info` to revalidate on mount or on `<video>` play; on 404, the badge flips to "vídeo expirou, faça upload novamente" and clears the App state
- **Upload progress bar** — requires XHR; deferred to ROADMAP
- **Persistence (IndexedDB) of the file bytes** — would survive server restarts but requires re-uploading on next session anyway; not worth the complexity for single-user local

## Prerequisite Subtasks (MANDATORY)

### SUBTASK_015.P1: GitFlow Workflow
**Status**: ⏱️ Not Started
- Branch: `feature/task-015-video-upload-frontend` from `develop`
- Conventional commits scoped `(upload)`, `(config-panel)`, `(app)`
- PR targets `develop`; Co-Authored-By trailer

### SUBTASK_015.P2: Tests Workflow
**Status**: ⏱️ Not Started
- TDD, AAA, ≥ 90% coverage on `upload.js`; ≥ 80% on `VideoUploadButton.jsx`
- Cognitive Complexity ≤ 15

### SUBTASK_015.P3: Task Finalization
**Status**: ⏱️ Not Started
- `pnpm lint` = 0; per-workspace coverage (see [[pnpm_workspace_test_coverage_flake]] + [[sonar_quality_gate_gotchas]])
- `set -a; source .env.local; set +a; pnpm sonar` PASS; `javascript:S3776 = 0` on new code (see [[sonar_env_sourcing]])
- Chrome DevTools MCP smoke: open Vídeo Fonte tab → screenshot EMPTY → drag-drop a synthesized MP4 → screenshot FILLED → click Remover → screenshot EMPTY again → console + network checks. The three screenshots prove the two-state visual distinction
- Evidence dir: `memory_bank/tasks/evidence/task_015/` with sonar PASS JSON / S3776=0 JSON / scan log .txt / 3 MCP screenshots
- Black-box auditor; close gaps in-branch; PR description with SonarCloud block

## Subtasks
*(Pass 2 will decompose. Expected shape:*
- *SUBTASK_015.1 — `upload.js` client + 6-case suite*
- *SUBTASK_015.2 — `VideoUploadButton.jsx` (stateless controlled) + 6-case suite*
- *SUBTASK_015.3 — `ConfigPanel` 4th tab + header badge + tests*
- *SUBTASK_015.4 — `App.jsx` state + reset + threading + integration test*
- *SUBTASK_015.5 — Sonar + Chrome DevTools MCP smoke + PR composition.)*
