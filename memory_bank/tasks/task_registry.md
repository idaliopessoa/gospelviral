# Task Registry
timestamp: 2026-05-29T00:00:00Z
version: 1.7

## Overview

Migration of `viral-cristao-artifact.jsx` (single-file React artifact, SSOT) to a `pnpm` monorepo with **three workspaces**: `apps/web` (Vite+React+Tailwind), `apps/server` (Hono), and `packages/shared` (`@gospelviral/shared` — the SSOT for cross-app primitives: type definitions, the `OPTIMIZED_PROMPT`, the `parseAnalysisResponse` parser, and example fixtures). Dual-mode Anthropic execution (Claude Code CLI preferred, REST API fallback) lives entirely in `apps/server`. Two phases.

- **Phase 1 — Frontend parity** (TASK_001..TASK_004): scaffold + 1:1 component/lib extraction from `.jsx` to modular tree. Acceptance: rendered UI visually identical to the artifact.
- **Phase 2 — Backend + dual-mode** (TASK_005..TASK_012): Hono server, runtime detection, CLI adapter (with stream-json parser), API adapter, analyze + detect endpoints, frontend wire-up, `localStorage` persistence, final docs rewrite.

All tasks follow `02 - Task Creation System - Black Box Architecture.md` with Flutter→JS translations:
- `flutter analyze` → `pnpm lint` (ESLint flat config)
- `flutter test --coverage` → `pnpm test --coverage` (Vitest)
- `dart:S3776` → `javascript:S3776` (Cognitive Complexity ≤ 15)
- `bloc_test` / `mocktail` → `vi.mock` / `vi.fn`
- Flutter Inspector MCP smoke → Chrome DevTools MCP smoke (browser-driven by the agent via `navigate`/`take_screenshot`/`list_console_messages`/`list_network_requests`/`evaluate`; Playwright NOT in scaffold — ROADMAP item if snapshot regression returns)
- `sonar-scanner` → `sonar` (Node-based `@sonar/scan` CLI, replaces the Java standalone; `npm install -g @sonar/scan` or `npx @sonar/scan`)
- TDD / AAA / GitFlow / conventional commits / P1+P2+P3 — identical

Persona for all tasks: `01-Systems-Architecture-Expert-viral-cristao.md`. SSOT for behavior: `viral-cristao-artifact.jsx` (byte-identical at repo root until TASK_012, which archives it to `reference/`).

Architectural decisions promised by tasks land in `memory_bank/decisions/DEC_XXX_<topic>.md`. The `decisions/` folder is created lazily by the first task that materializes a DEC; TASK_012 audits and backfills any DEC promised but not yet written.

## Active Tasks

### TASK_001: Monorepo Scaffold
- **Status**: Ready
- **Interface**: INPUT[bootstrap.md stack, root files] → OUTPUT[pnpm workspaces declaring `apps/*`+`packages/*`, apps/web Vite skeleton, apps/server Hono stub, `packages/shared` empty package (`@gospelviral/shared`, `workspace:*` wired into both apps), shared tooling (ESLint flat with cross-package import rules, Vitest, sonar config) — NO Playwright (browser smoke goes through Chrome DevTools MCP at audit time)]
- **Confidence**: HIGH
- **Black Box**: Repository becomes a workable JS monorepo with three workspaces (two apps + one shared package shell) without yet moving any source from the `.jsx`.
- **Phase**: 1
- **Prerequisites**: ✅ P1+P2+P3 included
- **File**: task_001_monorepo_scaffold.md

### TASK_002: Library Extraction (shared package + web UI lib)
- **Status**: Ready
- **Interface**: INPUT[`viral-cristao-artifact.jsx` lines ~7-525, TASK_001 empty `@gospelviral/shared`] → OUTPUT[populated `packages/shared/src/{types,prompts,parse-analysis-response,example-data,index}.js` (bilateral, consumed by web + server) + `apps/web/src/lib/{helpers,text-highlight,scripture-books}.js` (UI-only) + Vitest suites]
- **Confidence**: HIGH
- **Black Box**: Cross-cutting primitives + LLM I/O contract land in `@gospelviral/shared`; UI-only helpers stay in `apps/web/src/lib`. The artifact's `parseJsonFromResponse` is NOT carried into web — it becomes vestigial after TASK_010 since the backend returns clean JSON.
- **Phase**: 1
- **Prerequisites**: ✅ P1+P2+P3 included
- **File**: task_002_lib_extraction.md
- **Depends on**: TASK_001

### TASK_003: Components Extraction (1:1)
- **Status**: Ready
- **Interface**: INPUT[`.jsx` lines ~528-1260, black-box table in arch doc §"Project-Specific Black Box Boundaries"] → OUTPUT[`apps/web/src/components/*.jsx` + `@testing-library/react` tests for behavioral contracts]
- **Confidence**: HIGH
- **Black Box**: Each component lives in its own file, props-as-interface preserved verbatim, no inter-component coupling beyond the documented contracts.
- **Phase**: 1
- **Prerequisites**: ✅ P1+P2+P3 included
- **File**: task_003_components_extraction.md
- **Depends on**: TASK_002

### TASK_004: App Composition + Visual Parity
- **Status**: Ready
- **Interface**: INPUT[TASK_002 lib, TASK_003 components, `.jsx` App + inline style block] → OUTPUT[`apps/web/src/{App,main}.jsx`, `styles/globals.css`, Tailwind config, parity validation evidence]
- **Confidence**: MEDIUM
- **Black Box**: Composed app boots, three-view state machine works (`input → analyzing → results`), pixel/behavior parity vs `.jsx` confirmed via side-by-side human review + Chrome DevTools MCP screenshots/console/network evidence (snapshot regression deferred to ROADMAP).
- **Phase**: 1
- **Prerequisites**: ✅ P1+P2+P3 included
- **File**: task_004_app_composition.md
- **Depends on**: TASK_003

### TASK_005: Server Scaffold + Models Config
- **Status**: Ready
- **Interface**: INPUT[bootstrap dual-mode spec, Anthropic model slugs] → OUTPUT[`apps/server/` Hono app skeleton, `src/config/models.js` (`resolveModel(preference)`), `.env.example`]
- **Confidence**: HIGH
- **Black Box**: A Hono server that boots, exposes `/healthz`, and centralizes model-slug resolution behind a stable function. No real routes yet.
- **Phase**: 2
- **Prerequisites**: ✅ P1+P2+P3 included
- **File**: task_005_server_scaffold.md
- **Depends on**: TASK_001

### TASK_006: Claude API Adapter
- **Status**: Ready
- **Interface**: INPUT[`(systemPrompt, userMessage, modelId)`, `ANTHROPIC_API_KEY` env, `parseAnalysisResponse` from `@gospelviral/shared`] → OUTPUT[`apps/server/src/runtime/claude-api.js` + `runtime/errors.js`, returns `Promise<AnalysisResponse>`]
- **Confidence**: HIGH
- **Black Box**: Anthropic REST adapter. Wraps `fetch` to `api.anthropic.com`, **delegates parsing to `parseAnalysisResponse` from `@gospelviral/shared` (no server-side parser duplicate)**, returns the canonical `AnalysisResponse`.
- **Phase**: 2
- **Prerequisites**: ✅ P1+P2+P3 included
- **File**: task_006_claude_api_adapter.md
- **Depends on**: TASK_002 (parser in shared), TASK_005 (env, logger, resolveModel)

### TASK_007: Claude CLI Adapter + Stream-JSON Parser
- **Status**: Ready
- **Interface**: INPUT[`(systemPrompt, userMessage, modelId)`, `claude` binary on PATH] → OUTPUT[`apps/server/src/runtime/claude-cli.js`, `parsers/stream-json.js`, returns `Promise<AnalysisResponse>`]
- **Confidence**: MEDIUM
- **Black Box**: Spawns the `claude` CLI with prompt-via-stdin and `--output-format stream-json`, consumes line-delimited events, extracts the final `result` payload, parses into `AnalysisResponse`. Reference: `nexu-io/open-design` `agents.ts` + `claude-stream.ts`.
- **Phase**: 2
- **Prerequisites**: ✅ P1+P2+P3 included
- **File**: task_007_claude_cli_adapter.md
- **Depends on**: TASK_002 (parser in `@gospelviral/shared`), TASK_005 (env, logger, resolveModel), TASK_006 (adapter contract + typed error classes that CLI mirrors). API adapter goes first to validate the response contract before CLI layers process management on top.

### TASK_008: Runtime Detection
- **Status**: Ready
- **Interface**: INPUT[OS PATH] → OUTPUT[`apps/server/src/runtime/detect.js` exporting `detectRuntime(): { cli, apiKey, recommended }`]
- **Confidence**: HIGH
- **Black Box**: Cross-platform check for `claude` (and `openclaude` fallback) in PATH + presence of `ANTHROPIC_API_KEY`. Memoized.
- **Phase**: 2
- **Prerequisites**: ✅ P1+P2+P3 included
- **File**: task_008_runtime_detection.md
- **Depends on**: TASK_005

### TASK_009: Analyze + Detect Endpoints
- **Status**: Ready
- **Interface**: INPUT[TASK_006 API adapter, TASK_007 CLI adapter, TASK_008 detect] → OUTPUT[`POST /api/analyze` (JSON; SSE deferred to roadmap), `GET /api/runtime/detect`]
- **Confidence**: MEDIUM
- **Black Box**: HTTP surface that routes by mode (`cli` preferred when present, `api` fallback or explicit), validates input, returns canonical `AnalysisResponse` regardless of which adapter ran.
- **Phase**: 2
- **Prerequisites**: ✅ P1+P2+P3 included
- **File**: task_009_analyze_endpoint.md
- **Depends on**: TASK_006, TASK_007, TASK_008

### TASK_010: Frontend↔Backend Wire-Up + Mode Badge
- **Status**: Ready
- **Interface**: INPUT[`apps/web` app, server endpoints from TASK_009] → OUTPUT[`apps/web/src/lib/api.js` calls `/api/analyze`, Vite proxy config, `ConfigPanel` or header badge showing active mode + manual toggle]
- **Confidence**: MEDIUM
- **Black Box**: Replaces the direct-to-Anthropic `fetch` with a backend call. UI shows "via Claude Code CLI" or "via API key" badge; user can force-API in settings.
- **Phase**: 2
- **Prerequisites**: ✅ P1+P2+P3 included
- **File**: task_010_frontend_backend_wire.md
- **Depends on**: TASK_004, TASK_009

### TASK_011: localStorage Persistence (visual configs only)
- **Status**: Ready
- **Interface**: INPUT[`subtitleConfig`, `videoConfig`, `overlayConfig`, `isConfigCollapsed`] → OUTPUT[`apps/web/src/lib/persistence.js`, App rehydrates on mount, writes on change (debounced)]
- **Confidence**: HIGH
- **Black Box**: One module owns the localStorage SSOT for visual presets. Analysis `results`, `url`, `transcript` deliberately session-only.
- **Phase**: 2
- **Prerequisites**: ✅ P1+P2+P3 included
- **File**: task_011_localstorage_persistence.md
- **Depends on**: TASK_004

### TASK_012: Docs Rewrite — CLAUDE.md (monorepo) + ROADMAP.md
- **Status**: Ready
- **Interface**: INPUT[finalized monorepo state] → OUTPUT[rewritten `CLAUDE.md` reflecting `apps/web`+`apps/server`+dual-mode, new `ROADMAP.md` (Apify, multi-vídeo, ZIP export, SSE streaming progress)]
- **Confidence**: HIGH
- **Black Box**: Documentation aligned with the post-migration repo. The artifact-era `CLAUDE.md` is archived or fully replaced.
- **Phase**: 2
- **Prerequisites**: ✅ P1+P2+P3 included
- **File**: task_012_docs_rewrite.md
- **Depends on**: TASK_010, TASK_011

### TASK_013: Card Tabs — Redes Sociais / Legenda do Vídeo
- **Status**: Complete (merged via PR #1 on 2026-05-28)
- **Interface**: INPUT[`bootstrap-features-fases-3-6.md` §Fase 3, current `MomentCard.jsx` right column, `App.jsx` `transcript` state, `timestampToSeconds` from `lib/helpers.js`] → OUTPUT[`apps/web/src/lib/transcript-extract.js` (`extractSegmentLines` + `extractSegmentText` helpers) + `apps/web/src/components/CardTabs.jsx` (generic, **stateless / controlled** array-prop tabs) + `MomentCard.jsx` refactor (fixed-top: hook/scripture; tabs: Redes Sociais default + Legenda do Vídeo line-per-cue; score `<details>` stays below tabs) + prop threading `App → ResultsView → MomentCard` for `transcript`, `activeCardTab`, `setActiveCardTab` + integration spec pinning global lift + Vitest suites]
- **Confidence**: HIGH
- **Black Box**: Right column of `MomentCard` reorganized into fixed metadata top + two tabs. Helper slices transcript by moment range deterministically (no IA, frontend-only). **Tab state (`activeCardTab`) is GLOBAL, owned by `App.jsx`** — one click flips all 5 cards together; same coherence as the existing global visual prefs. Final task file v1.3.
- **Phase**: 3
- **Prerequisites**: ✅ P1+P2+P3 included
- **File**: task_013_card_tabs.md
- **Depends on**: TASK_010 (transcript already flows end-to-end)

### TASK_014: Video Upload — Backend Storage + Endpoint
- **Status**: Complete (merged via PR #2 + follow-ups PR #3 on 2026-05-28)
- **Interface**: INPUT[`bootstrap-features-fases-3-6.md` §Fase 4, `apps/server` Hono app, env seam, logger, route conventions] → OUTPUT[`packages/shared/src/types.js` (`VideoSource` + `VIDEO_MIME_ALLOWLIST_DEFAULT`) + `apps/server/src/lib/multipart-parser.js` (busboy streaming wrapper) + `apps/server/src/storage/video-storage.js` (factory: `init`/`save`/`get`/`stream`, streaming + atomic write + sidecar JSON) + `apps/server/src/routes/upload.js` (`POST /api/upload/video`, `GET /:id/info`) + `config/env.js` (`VIDEO_UPLOAD_DIR`/`MAX_UPLOAD_SIZE_BYTES`/`VIDEO_ALLOWED_MIMES`) + `server.js` wiring + `scripts/smoke-heap.js` + root `.gitignore` + Vitest suites]
- **Confidence**: HIGH
- **Black Box**: Server gains a typed STREAMING multipart upload endpoint (O(KB) RAM, proven by `smoke:heap`) that writes to a gitignored temp dir, returns a `VideoSource` handle, wipes the dir on every boot. Streaming is an architectural INVARIANT.
- **Phase**: 4
- **Prerequisites**: ✅ P1+P2+P3 included
- **File**: task_014_video_upload_backend.md
- **Depends on**: TASK_005 (server scaffold, env, logger, route conventions)

### TASK_015: Video Upload — Frontend UI + Integration
- **Status**: Complete (merged via PR #4 on 2026-05-29)
- **Interface**: INPUT[TASK_014 OUTPUT (endpoint + `VideoSource` typedef), `App.jsx` session state, `ConfigPanel.jsx` 3-tab pattern, `lib/api.js` fetch pattern, `persistence.js` SSOT scope] → OUTPUT[`apps/web/src/lib/upload.js` (`uploadVideo` over XHR with progress/abort + typed `UploadError`) + `apps/web/src/components/VideoUploadButton.jsx` (controlled; EMPTY action-first / FILLED discrete; real progress; filename-aware error) + `ConfigPanel.jsx` 4th tab "Vídeo Fonte" + header badge + `App.jsx` `videoSource` session state + `handleReset` clear + `ResultsView.jsx` pass-through + Vitest suites + Chrome DevTools MCP smoke]
- **Confidence**: MEDIUM (UX placement validated by smoke)
- **Black Box**: Frontend gains a manual-upload affordance. `videoSource` lives in `App.jsx` session-only (NOT persisted). The 4th ConfigPanel tab "Vídeo Fonte" hosts the dropzone (two visual states); the header strip shows the active badge. Resets clear it. Real XHR upload progress.
- **Phase**: 4
- **Prerequisites**: ✅ P1+P2+P3 included
- **File**: task_015_video_upload_frontend.md
- **Depends on**: TASK_014 (endpoint + `VideoSource` typedef)

### TASK_016: Video Stream Route (HTTP Range)
- **Status**: Ready
- **Interface**: INPUT[`bootstrap §Fase 5`, TASK_014 storage (`stream`/`get`) + upload router + `isValidVideoId`] → OUTPUT[`storage.streamRange(id, range?)` (createReadStream, O(KB)) + `lib/range.js` (pure char-scan Range parser) + `GET /api/upload/video/:id/stream` (200 full / 206 partial / 416 / 404 / 400) + storage + route + range Vitest suites]
- **Confidence**: HIGH
- **Black Box**: Server serves the uploaded video to a `<video>` element with HTTP Range support (206 Partial Content), streaming via `createReadStream` — never buffering the file. Size/mime from the sidecar `VideoSource`.
- **Phase**: 5
- **Prerequisites**: ✅ P1+P2+P3 included
- **File**: task_016_video_stream_route.md
- **Depends on**: TASK_014 (storage + upload router)
- **smoke:heap**: TRIGGERED (touches storage/video-storage.js + routes/upload.js) — P3 runs `pnpm smoke:heap`

### TASK_017: SubtitleCue Primitive (shared)
- **Status**: Complete (merged via PR #6 on 2026-05-29)
- **Interface**: INPUT[`bootstrap §Fase 5`, `apps/web/src/lib/transcript-extract.js` parser, TASK_013 promotion clause, `types.js`] → OUTPUT[`packages/shared/src/transcript-lines.js` (consolidated parser) + `packages/shared/src/subtitle-cues.js` (`buildSubtitleCues → SubtitleCue[]`) + `SubtitleCue` typedef + barrel + web `transcript-extract.js` delegates to shared (no dup) + Vitest suites]
- **Confidence**: HIGH
- **Black Box**: `SubtitleCue[]` becomes a bilateral primitive in `@gospelviral/shared` — the single source of truth for subtitle timing shared by the Phase 5 player and the Phase 6 burned-in export. One cue per transcript line (granularity untouched); `end` implied by the next line. Transcript parsing consolidated in shared (honors TASK_013 promotion clause).
- **Phase**: 5
- **Prerequisites**: ✅ P1+P2+P3 included
- **File**: task_017_subtitle_cues.md
- **Depends on**: TASK_013 (transcript-extract exists; gets consolidated)
- **smoke:heap**: NOT triggered (no hot-path file)

### TASK_018: Play + Subtitle Sync (frontend)
- **Status**: Ready
- **Interface**: INPUT[TASK_016 stream route, TASK_017 cues, TASK_015 videoSource, current `SubtitlePreview` + `useChunkRotation` + `MomentCard`/`App`] → OUTPUT[`useVideoPlayback` hook + `cueAt` selector + `SubtitlePreview` refactor (`<video>` + central play button + cue-driven subtitle + drag gated by mode + remove 2.2s rotation/badge) + `App.jsx` `playingIndex` + derived `mode` + pause-on-config-open + ResultsView/MomentCard threading + delete `useChunkRotation` + Vitest suites + Chrome DevTools MCP smoke]
- **Confidence**: MEDIUM (global playback orchestration is the heaviest state)
- **Black Box**: Each card's 9:16 preview plays the uploaded `<video>` with the subtitle synced to transcript timecodes. Panel-collapse doubles as a GLOBAL mode (PLAYER↔EDIÇÃO); single `playingIndex` in App enforces one-plays-at-a-time; opening a config tab pauses everything. The arbitrary 2.2s rotation is removed. No `videoSource` → today's static-thumbnail edit behavior (no regression).
- **Phase**: 5
- **Prerequisites**: ✅ P1+P2+P3 included
- **File**: task_018_play_subtitle_sync.md
- **Depends on**: TASK_015, TASK_016, TASK_017
- **smoke:heap**: NOT triggered (frontend-only)

## Task Creation Log
2026-05-27 TASK_001..TASK_012 created — Pass 1 high-level plan, awaiting human review before Pass 2 decomposition per task.
2026-05-27 Registry refined: DEC folder convention recorded; TASK_007 dependency widened to include TASK_006; TASK_001 GitFlow special-cased for `main`→`develop` bootstrap; TASK_004 visual-parity gate clarified as human-only (Playwright snapshot deferred); TASK_011 schema-versioning + migration-safety invariants tightened; "viral-cristao-artifact.jsx byte-identical until TASK_012" invariant propagated to all tasks that read it.
2026-05-27 Registry refined (round 2): introduced `packages/shared` (`@gospelviral/shared`) as a third workspace owning cross-app primitives + LLM I/O contract. TASK_001 scaffolds the empty shell; TASK_002 populates it (types, prompt, `parseAnalysisResponse`, example fixtures). TASK_006/007 now consume the parser from shared instead of duplicating server-side. TASK_007 deps widened to include TASK_002. TASK_009 timeout default raised 90s→120s with `ANALYZE_TIMEOUT_MS` env override. TASK_012 ROADMAP scope expanded to include IndexedDB persistence for overlay PNG and the shared-package tree-shaking follow-up.
2026-05-28 **Pass 1 reviewed and approved by human.** All 12 task files (TASK_001..TASK_012) moved from `Planning` → `Ready` ("Ready" is a protocol extension meaning "Black Box Interface approved, awaiting Pass 2 decomposition + execution"; standard protocol statuses Active/Blocked/Complete/Archived remain unchanged downstream). Pass 2 will be initiated in a fresh conversation per task — task files are self-contained and do not require the planning-phase chat history. Two Pass 2 implementation notes captured in their respective task files: TASK_007 records `kill(-pid)` as a POSIX-only abort strategy with macOS as the target (Windows support deferred); TASK_009 records that `build-user-message.js` must paste the artifact's `fullPrompt` template literal as a frozen fixture rather than rely on a line-number reference that drifts.
2026-05-28 **Sonar scanner switched to `@sonar/scan` (Node CLI; binary `sonar`).** All references to `sonar-scanner` across task files, registry conventions, and CLAUDE.md replaced with `sonar`. TASK_001 OUTPUT enumerates the `sonar-project.properties` contents (`projectKey=idaliopessoa_gospelviral`, `organization=idaliopessoa`, `host.url=https://sonarcloud.io`, sources/tests/lcov for the three workspaces) and the `.env.local` rule (`SONAR_TOKEN` lives there only, gitignored before first `git add`). TASK_001 ships a `pnpm sonar` script wrapping `@sonar/scan`. New DECs registered: `DEC_XXX_sonar_node_scanner.md` (scanner choice) and `DEC_XXX_scaffold_coverage_gate.md` ("Coverage on New Code" Quality Gate FAIL on the scaffold scan is EXPECTED — report to human, never bypass; three remediation paths the human picks from). Risk Assessment expanded with token-leak + install-variant rows. Token bytes recorded only in execution-plan memory (~/.claude/projects/.../execution_plan_pass_2.md, not in git).
2026-05-28 **Playwright removed from scaffold (TASK_001 DEC).** Browser-driven UI verification routes through the Chrome DevTools MCP that the agent connects to (`navigate`, `take_screenshot`, `list_console_messages`, `list_network_requests`, `evaluate`, `click`, `fill`, `wait_for`). All task P3 sections updated: server-only tasks declare "Browser smoke (Chrome DevTools MCP): skipped"; UI tasks (TASK_004 / TASK_010 / TASK_011 / TASK_012) replace Playwright instructions with explicit MCP sequences (navigate → screenshot → console + network assertions → evaluate for state introspection). TASK_004 risk row and DEC updated to reflect MCP screenshots as parity evidence. TASK_012 ROADMAP item rewritten to position Playwright as the future swap-in if pixel-diff snapshot regression becomes worthwhile. Subagent `.claude/agents/black-box-auditor.md` created — read-only architectural auditor invoked at the end of every Pass 2 task to produce a GAP REPORT before merge. Project memory `~/.claude/projects/.../memory/execution_plan_pass_2.md` pins the autonomous Pass 2 cycle for fresh sessions.
2026-05-28 **Phase 1+2 migration complete (v1.0.0 released).** Bootstrap `bootstrap-features-fases-3-6.md` introduces Phases 3–6 (card tabs, video ingestion, play + subtitle sync, MP4 export with burned subtitles). Sequencing 3 → 4 → 5 → 6 with human gate between phases.
2026-05-28 **TASK_013 created (Phase 3 Pass 1).** Sole task for Phase 3: card tabs (Redes Sociais default + Legenda do Vídeo). Decisions captured in task file: (D1) single task, (D2) score `<details>` stays outside tabs, (D3) "limpar" regex deferred to ROADMAP, (D4) helper in `apps/web/src/lib/` (web-only until 2nd consumer), (D5) per-card local tab state (not lifted).
2026-05-28 **TASK_013 Pass 1 approved by human, D5 reversed.** Tab state (`activeCardTab`) is now **GLOBAL**, owned by `App.jsx` and threaded down via props — same coherence pattern as `subtitleConfig` / `videoConfig` / `overlayConfig` / `isConfigCollapsed`; one click flips all 5 cards. `CardTabs` becomes stateless / fully controlled. D4 reinforced with explicit promotion clause: if FASE 6 needs the same extractor, file MIGRATES to `packages/shared` (no duplication). Persistence of `activeCardTab` deferred (schema bump v1→v2 in a separate follow-up task). Task file bumped to v1.1.
2026-05-28 **TASK_013 merged via PR #1 (squash + delete branch).** Final task file v1.3 includes ratification of `extractSegmentLines` (per-cue render, smoke-driven adjustment) and the `CardTabs` `tabs[]` array prop API. SonarCloud Quality Gate PASS, new-code coverage 95.4%, `javascript:S3776 = 0`, black-box auditor "AUDITORIA LIMPA". Three project memories saved: [[sonar_env_sourcing]], [[sonar_quality_gate_gotchas]], [[pnpm_workspace_test_coverage_flake]].
2026-05-28 **TASK_014 + TASK_015 created (Phase 4 Pass 1).** Two-task split for video upload: TASK_014 = backend (storage module + `POST /api/upload/video` + `GET /info` + cleanup-on-boot + `VideoSource` bilateral primitive in `@gospelviral/shared`); TASK_015 = frontend (`VideoUploadButton` stateless controlled in a new 4th `ConfigPanel` tab "Vídeo Fonte" + `uploadVideo` client + session-only `videoSource` state in `App.jsx`, NOT persisted).
2026-05-28 **TASK_014 + TASK_015 Pass 1 approved by human, with adjustments.** Both task files bumped to v1.1. Adjustments: (D3) `VideoSource` stays a **reference** to the file; if Phase 6 export needs server-side metadata (codec / fps / resolution / duration for FFmpeg) it lands as a separate module `apps/server/src/runtime/video-metadata.js`, NOT retrofitted into the primitive. Recorded in TASK_014 "Known follow-ups". (D5) the "Vídeo Fonte" tab has a hard two-state visual INVARIANT: EMPTY = generous drop area + prominent CTA "Subir vídeo do trecho" (action-first); FILLED = a single discrete line "filename · size · remover". The component test asserts the EMPTY container is taller and has the CTA, the MCP smoke captures both states. Without the distinction, the tab reads as "one more setting" and the conceptual frame breaks. (D6) size cap default raised 500 MiB → 2 GiB (`MAX_UPLOAD_SIZE_BYTES`, default `2147483648`); error copy updated to "Limite 2 GB". Operational notes from TASK_013 memories are referenced in both P2 + P3 sections of TASK_014 and TASK_015: [[sonar_env_sourcing]], [[pnpm_workspace_test_coverage_flake]], [[sonar_quality_gate_gotchas]].
2026-05-28 **TASK_014 Pass 2 reviewed by human, streaming pipeline promoted to architectural INVARIANT.** Task file bumped to v1.2. Key change: the "parseBody buffers in RAM" item is no longer a risk to weigh — it is a hard contract. New DECs: (1) streaming-first pipeline `req.body → Readable.fromWeb → busboy wrapper → storage.save({ stream, ... }) → fs.createWriteStream → atomic rename`, memory residency `O(KB)` during a 2 GiB upload; (2) `busboy` chosen as the streaming multipart parser, wrapped in `apps/server/src/lib/multipart-parser.js` per §"Wrap external dependencies" so the route never imports busboy directly; (3) sidecar JSON `<id>.json` next to `<id>.<ext>` holds the typed `VideoSource` (filename, mime, uploadedAt preserved); (4) factory DI `createVideoStorage({ dir, logger })` mirrors `createAnalyzeRouter` / `createDetectRouter`; (5) test size-cap exercises use `maxBytes: 1024` injected via DI (no 2 GiB Blobs); (6) disk path `${dir}/${uuid}.${ext}`, original filename NEVER on disk (only in sidecar) — path traversal non-applicable by design, mime→ext from a whitelist table, uuid from `crypto.randomUUID()`; (7) heap-invariant smoke `smoke:heap` is **in-process** (Node script, imports storage + parser directly, samples `process.memoryUsage().heapUsed` every 100 ms during a 1.5 GiB upload, asserts `delta < 50 MB`) — NOT an HTTP debug endpoint (zero attack surface, measures JS heap not RSS). Smoke FAIL = PR BLOCKED, no bypass. Subtasks expanded 6 → 7 (multipart-parser wrapper becomes its own black box). The earlier "1.5 GiB curl smoke before merge" wording was replaced by the heap-invariant assertion.

2026-05-29 **Phase 4 complete (PR #2 + #3 + #4 merged).** TASK_014 (backend streaming upload + smoke:heap invariant), TASK_014 follow-ups (smoke Gate B + parseBody invariant test), TASK_015 (frontend upload UI, XHR progress) all on `develop`. Upload validated in real use by human.
2026-05-29 **TASK_016 + TASK_017 + TASK_018 created (Phase 5 Pass 1).** Three-task split for play + subtitle sync: TASK_016 = backend video stream route with HTTP Range (206) over `createReadStream` (smoke:heap TRIGGERED); TASK_017 = `SubtitleCue[]` bilateral primitive in `@gospelviral/shared` + transcript-parser consolidation (honors TASK_013 promotion clause); TASK_018 = frontend `<video>` player (central play button, GLOBAL mode derived from `isConfigCollapsed`, single `playingIndex` for one-plays-at-a-time, config-open-pauses, cue-driven subtitle replacing the removed 2.2s rotation, static-thumbnail fallback without `videoSource`). Pass 1 decisions pending human review: (D1) 3-task split by domain (server/shared/web); (D2) consolidate transcript parser into shared; (D3) storage `streamRange` + pure `lib/range.js`; (D4) `playingIndex` global in App + `mode` derived (not stored); (D5) EDIÇÃO shows static cue[0], PLAYER shows currentTime-driven cue; (D6) player only with `videoSource`; (D7) cue `end` = next cue start / last = segment end, absolute-timeline seconds; (D-end) pause-at-cut-end vs loop — flagged for human.

2026-05-29 **Phase 5 Pass 1 approved by human; time-reference gap closed.** D4 (playingIndex global + derived mode) confirmed as the correct foundation. D-end = pause-at-cut-end CONFIRMED, with the added rule: pressing play after a pause-at-end RESTARTS from `timestamp_start` (not a no-op resume from `endSec`) — wired into `useVideoPlayback.play()` in TASK_018. NEW cross-task INVARIANT added to all three task files (016/017/018): **all time is seconds ABSOLUTE on the full uploaded video file's timeline** — transcript timestamps, `cue.start`/`cue.end`, `<video>.currentTime`, and the seek that drives the 206 Range request all share that one scale; cues are NEVER relative-to-cut (a 47:30 line → cue.start 2850); TASK_018 compares currentTime against cues with no offset math. This forbids the silent mismatch where one task assumes absolute and another relative, which would make the subtitle never sync. D1/D2/D3/D5/D6/D7 all confirmed. Execution order 016 → 017 → 018 (016/017 independent), human gate between each Pass 2.

2026-05-29 **TASK_017 merged via PR #6 (squash + delete branch).** SubtitleCue bilateral primitive + `buildSubtitleCues` in `@gospelviral/shared`; transcript line-parser consolidated (`transcript-lines.js`) + clock parser moved to `time.js` (web `helpers.js`/`transcript-extract.js` delegate — scope addition vs DEC D2, forced by the shared-cannot-import-web rule: canonical moved + re-exported, never duplicated). TIME REFERENCE invariant pinned (47:30→cue.start 2850, not relative-to-cut). SonarCloud QG PASS, new-code coverage 95.6%, `javascript:S3776 = 0`, zero new-code issues; black-box-auditor "AUDITORIA LIMPA" via the correct fix→re-audit cycle (no discretionary skip). Three project memories saved: [[shared-no-import-from-web]], [[ssot-discerning-not-dry-maxing]], [[auditor-gate-no-discretionary-skip]]. smoke:heap NOT triggered (no hot-path file). Phase 5: 016 + 017 done; TASK_018 (consumer) next.

## Task ID Sequence
Last Used: TASK_018
Next Available: TASK_019

## Conventions Snapshot (used by every task)

| Concept | Value |
|---|---|
| Branch naming | `feature/task-XXX-<kebab-description>` targeting `develop` |
| Commit format | `<type>(<scope>): <subject>` + `Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>` trailer |
| Cognitive Complexity ceiling | `javascript:S3776 ≤ 15` per function/component |
| Test stack | Vitest (unit) + `@testing-library/react` (component behavior) + Chrome DevTools MCP for agent-driven browser smoke (Playwright deferred to ROADMAP) |
| Quality Gate | local `sonar` (the `@sonar/scan` Node CLI) reading `sonar-project.properties` + `SONAR_TOKEN` from `.env.local` — PASS required before PR (zero CI). On the TASK_001 scaffold, an "Coverage on New Code" FAIL is **expected** because no code exists yet; report to human, do not work around |
| Coverage | non-decreasing baseline; new code expected ≥ 80% on logic-heavy modules |
| Pattern | AAA in every test (`// Arrange / // Act / // Assert`) |
| TDD | Red → Green → Refactor for helpers, parsers, route handlers, public component APIs |
