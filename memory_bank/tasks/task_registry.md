# Task Registry
timestamp: 2026-05-28T00:00:00Z
version: 1.2

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
- **Status**: Ready
- **Interface**: INPUT[`bootstrap-features-fases-3-6.md` §Fase 3, current `MomentCard.jsx` right column, `App.jsx` `transcript` state, `timestampToSeconds` from `lib/helpers.js`] → OUTPUT[`apps/web/src/lib/transcript-extract.js` (`extractSegmentText` pure helper) + `apps/web/src/components/CardTabs.jsx` (generic, **stateless / controlled** slot-based tabs) + `MomentCard.jsx` refactor (fixed-top: hook/scripture; tabs: Redes Sociais default + Legenda do Vídeo; score `<details>` stays below tabs) + prop threading `App → ResultsView → MomentCard` for `transcript`, `activeCardTab`, `setActiveCardTab` + integration spec pinning global lift + Vitest suites]
- **Confidence**: HIGH
- **Black Box**: Right column of `MomentCard` reorganized into fixed metadata top + two tabs. Helper slices transcript by moment range deterministically (no IA, frontend-only). **Tab state (`activeCardTab`) is GLOBAL, owned by `App.jsx`** — one click flips all 5 cards together; same coherence as the existing global visual prefs.
- **Phase**: 3
- **Prerequisites**: ✅ P1+P2+P3 included
- **File**: task_013_card_tabs.md
- **Depends on**: TASK_010 (transcript already flows end-to-end)

## Task Creation Log
2026-05-27 TASK_001..TASK_012 created — Pass 1 high-level plan, awaiting human review before Pass 2 decomposition per task.
2026-05-27 Registry refined: DEC folder convention recorded; TASK_007 dependency widened to include TASK_006; TASK_001 GitFlow special-cased for `main`→`develop` bootstrap; TASK_004 visual-parity gate clarified as human-only (Playwright snapshot deferred); TASK_011 schema-versioning + migration-safety invariants tightened; "viral-cristao-artifact.jsx byte-identical until TASK_012" invariant propagated to all tasks that read it.
2026-05-27 Registry refined (round 2): introduced `packages/shared` (`@gospelviral/shared`) as a third workspace owning cross-app primitives + LLM I/O contract. TASK_001 scaffolds the empty shell; TASK_002 populates it (types, prompt, `parseAnalysisResponse`, example fixtures). TASK_006/007 now consume the parser from shared instead of duplicating server-side. TASK_007 deps widened to include TASK_002. TASK_009 timeout default raised 90s→120s with `ANALYZE_TIMEOUT_MS` env override. TASK_012 ROADMAP scope expanded to include IndexedDB persistence for overlay PNG and the shared-package tree-shaking follow-up.
2026-05-28 **Pass 1 reviewed and approved by human.** All 12 task files (TASK_001..TASK_012) moved from `Planning` → `Ready` ("Ready" is a protocol extension meaning "Black Box Interface approved, awaiting Pass 2 decomposition + execution"; standard protocol statuses Active/Blocked/Complete/Archived remain unchanged downstream). Pass 2 will be initiated in a fresh conversation per task — task files are self-contained and do not require the planning-phase chat history. Two Pass 2 implementation notes captured in their respective task files: TASK_007 records `kill(-pid)` as a POSIX-only abort strategy with macOS as the target (Windows support deferred); TASK_009 records that `build-user-message.js` must paste the artifact's `fullPrompt` template literal as a frozen fixture rather than rely on a line-number reference that drifts.
2026-05-28 **Sonar scanner switched to `@sonar/scan` (Node CLI; binary `sonar`).** All references to `sonar-scanner` across task files, registry conventions, and CLAUDE.md replaced with `sonar`. TASK_001 OUTPUT enumerates the `sonar-project.properties` contents (`projectKey=idaliopessoa_gospelviral`, `organization=idaliopessoa`, `host.url=https://sonarcloud.io`, sources/tests/lcov for the three workspaces) and the `.env.local` rule (`SONAR_TOKEN` lives there only, gitignored before first `git add`). TASK_001 ships a `pnpm sonar` script wrapping `@sonar/scan`. New DECs registered: `DEC_XXX_sonar_node_scanner.md` (scanner choice) and `DEC_XXX_scaffold_coverage_gate.md` ("Coverage on New Code" Quality Gate FAIL on the scaffold scan is EXPECTED — report to human, never bypass; three remediation paths the human picks from). Risk Assessment expanded with token-leak + install-variant rows. Token bytes recorded only in execution-plan memory (~/.claude/projects/.../execution_plan_pass_2.md, not in git).
2026-05-28 **Playwright removed from scaffold (TASK_001 DEC).** Browser-driven UI verification routes through the Chrome DevTools MCP that the agent connects to (`navigate`, `take_screenshot`, `list_console_messages`, `list_network_requests`, `evaluate`, `click`, `fill`, `wait_for`). All task P3 sections updated: server-only tasks declare "Browser smoke (Chrome DevTools MCP): skipped"; UI tasks (TASK_004 / TASK_010 / TASK_011 / TASK_012) replace Playwright instructions with explicit MCP sequences (navigate → screenshot → console + network assertions → evaluate for state introspection). TASK_004 risk row and DEC updated to reflect MCP screenshots as parity evidence. TASK_012 ROADMAP item rewritten to position Playwright as the future swap-in if pixel-diff snapshot regression becomes worthwhile. Subagent `.claude/agents/black-box-auditor.md` created — read-only architectural auditor invoked at the end of every Pass 2 task to produce a GAP REPORT before merge. Project memory `~/.claude/projects/.../memory/execution_plan_pass_2.md` pins the autonomous Pass 2 cycle for fresh sessions.
2026-05-28 **Phase 1+2 migration complete (v1.0.0 released).** Bootstrap `bootstrap-features-fases-3-6.md` introduces Phases 3–6 (card tabs, video ingestion, play + subtitle sync, MP4 export with burned subtitles). Sequencing 3 → 4 → 5 → 6 with human gate between phases.
2026-05-28 **TASK_013 created (Phase 3 Pass 1).** Sole task for Phase 3: card tabs (Redes Sociais default + Legenda do Vídeo). Decisions captured in task file: (D1) single task, (D2) score `<details>` stays outside tabs, (D3) "limpar" regex deferred to ROADMAP, (D4) helper in `apps/web/src/lib/` (web-only until 2nd consumer), (D5) per-card local tab state (not lifted). Inviolable DEC "app nunca baixa do YouTube" removed from bootstrap per human directive.
2026-05-28 **TASK_013 Pass 1 approved by human, D5 reversed.** Tab state (`activeCardTab`) is now **GLOBAL**, owned by `App.jsx` and threaded down via props — same coherence pattern as `subtitleConfig` / `videoConfig` / `overlayConfig` / `isConfigCollapsed`; one click flips all 5 cards. `CardTabs` becomes stateless / fully controlled. D4 reinforced with explicit promotion clause: if FASE 6 needs the same extractor, file MIGRATES to `packages/shared` (no duplication). Persistence of `activeCardTab` deferred (schema bump v1→v2 in a separate follow-up task). Task file bumped to v1.1.

## Task ID Sequence
Last Used: TASK_013
Next Available: TASK_014

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
