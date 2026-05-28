# TASK_002: Library Extraction (shared package + web UI lib)
timestamp: 2026-05-27T00:00:00Z
version: 1.1
status: Ready
owner: unassigned
confidence: HIGH
phase: 1

## Black Box Interface

### INPUT
- **Required Context**:
  - `viral-cristao-artifact.jsx` lines ~7-525 (OPTIMIZED_PROMPT, EXAMPLE_URL, EXAMPLE_TRANSCRIPT, EXAMPLE_RESPONSE, helpers)
  - `01-Systems-Architecture-Expert-viral-cristao.md` §"Project primitives" (canonical shapes for `Moment`, configs, `AnalysisResponse`)
  - TASK_001 OUTPUT — workable `apps/web` (Vitest configured) AND `packages/shared/` empty package with `@gospelviral/shared` name, `workspace:*` already wired into both apps
- **Prerequisites**: TASK_001 (Complete)
- **Parameters**: none

### OUTPUT

**Shared package (bilateral — consumed by `apps/web` AND `apps/server`):**
- `packages/shared/src/types.js` — JSDoc typedefs for every primitive that flows across the HTTP boundary or persistence boundary: `Moment`, `AnalysisResponse`, `AnalysisRequest`, `SubtitleConfig`, `VideoConfig`, `OverlayConfig`, `RuntimeStatus`, `CanvasReference` constants
- `packages/shared/src/prompts.js` — exports `OPTIMIZED_PROMPT` verbatim. **Lives in shared because the prompt defines the `AnalysisResponse` schema** that the parser validates. Consumer is the server adapters (TASK_006/007/009); web never imports it
- `packages/shared/src/parse-analysis-response.js` — exports `parseAnalysisResponse(text: string): AnalysisResponse`. Strips ```json fences, slices from first `{` to last `}`, parses JSON, validates required keys (`metadata`, `analysis_summary`, `top_moments`), slices `top_moments` to exactly 5 elements, throws typed `AnalysisResponseError` with `code` field on any failure
- `packages/shared/src/example-data.js` — exports `EXAMPLE_URL`, `EXAMPLE_TRANSCRIPT`, `EXAMPLE_RESPONSE` (fixture also used by server smoke scripts in TASK_006/007 and by web's "Ver exemplo pronto" path in TASK_004)
- `packages/shared/src/index.js` — barrel export
- Co-located or `__tests__/` Vitest specs (DEC the layout once for both packages and both apps)

**Web UI lib (DOM-coupled, web-only):**
- `apps/web/src/lib/helpers.js` — exports `extractVideoId`, `timestampToSeconds`, `chunkText` (UI-only helpers — used for YouTube link construction and subtitle pagination)
- `apps/web/src/lib/text-highlight.js` — exports `highlightText`, `splitByRegex` (subtitle render path)
- `apps/web/src/lib/scripture-books.js` — exports the Portuguese book-name regex source as a constant

**Explicitly NOT carried into `apps/web`:**
- `parseJsonFromResponse` from the artifact. It existed because the artifact called Anthropic directly; after TASK_010 the web calls `/api/analyze` which returns a clean envelope. The parser lives only in `@gospelviral/shared` and is consumed exclusively by server adapters

**Artifacts:**
- `pnpm -F shared test` and `pnpm -F web test` both green with ≥ 95% line coverage on shared modules and 100% on pure helpers
- SonarCloud Quality Gate = PASS; `javascript:S3776 = 0` on new code

**Decisions Generated** (DEC files under `memory_bank/decisions/`):
- `DEC_XXX_shared_package_scope.md` — scope of `@gospelviral/shared`: types + LLM I/O contract (`OPTIMIZED_PROMPT` + `parseAnalysisResponse`) + example fixtures. Excluded: any DOM/React/Anthropic-SDK code. Rationale: the package must load cleanly in both Node (server) and browser (web bundle)
- `DEC_XXX_parser_not_in_web.md` — `parseJsonFromResponse` is **not** migrated to `apps/web`. After TASK_010 the web receives clean JSON from the backend; the artifact-era parser is vestigial and dropping it now prevents drift between two parser copies
- `DEC_XXX_test_layout.md` — Vitest spec location convention (co-located `*.test.js` next to source, OR `__tests__/` subdir); resolved once and applied across web, server, shared

### INVARIANTS
- **Must Maintain**:
  - `viral-cristao-artifact.jsx` at the repository root remains **byte-identical** until TASK_012 — this task reads it as source material but never writes to it
  - `OPTIMIZED_PROMPT` content is preserved **character-for-character** in `packages/shared/src/prompts.js`. Any whitespace or punctuation change is a semantic regression (it is a tuned LLM input)
  - Helper signatures unchanged: `extractVideoId(url) → string|null`, `timestampToSeconds("MM:SS"|"HH:MM:SS") → number`, `chunkText(text, charsPerScreen, lines) → string[]`
  - `highlightText` return shape `Array<{ text, highlighted, type }>` is unchanged — downstream consumers in TASK_003 rely on it
  - `parseAnalysisResponse` semantics: accepts fenced (` ```json ... ``` `) and unfenced JSON, slices from first `{` to last `}` before parsing, slices `top_moments` to exactly 5
  - `packages/shared/` has **zero** React/DOM imports — verified by ESLint rule from TASK_001
  - `packages/shared/` has **zero** `@anthropic-ai/*` imports — wire transport stays in server adapters
  - `EXAMPLE_RESPONSE` deep-equals the artifact constant (no silent field drift)
- **Quality Gates**:
  - Snapshot test pins `OPTIMIZED_PROMPT` by total length + first 80 chars + last 80 chars matching the artifact substring
  - Round-trip test deep-equals `EXAMPLE_RESPONSE` against an inline fixture
  - AAA pattern in every test
  - Cognitive Complexity ≤ 15 per function — `splitByRegex` is the hottest candidate; verify locally before merge

## Task Definition
Split the artifact's HELPERS and constants into two homes by audience. Cross-cutting primitives, the LLM I/O contract (system prompt, response parser, type definitions), and example fixtures move to `packages/shared` (the SSOT both apps depend on). UI-only helpers (subtitle chunking, scripture highlighting, video-id extraction, timestamp parsing) stay in `apps/web/src/lib` because they are DOM and render-coupled. After this task, everything that flows across the HTTP boundary between web and server has exactly one definition, owned by `@gospelviral/shared`.

## Success Criteria
1. `import { OPTIMIZED_PROMPT, parseAnalysisResponse, EXAMPLE_RESPONSE } from '@gospelviral/shared'` works from both `apps/web` and `apps/server`
2. `import { extractVideoId, chunkText, highlightText } from '<web-path>/lib/...'` works from `apps/web`; the same import attempted from `apps/server` is flagged by the ESLint cross-package rule from TASK_001
3. `parseAnalysisResponse` returns the canonical object for both fenced and unfenced inputs
4. `parseAnalysisResponse` with a payload missing `top_moments` throws `AnalysisResponseError` with `code: 'missing_top_moments'` — sensitive payload content not echoed in the message
5. `OPTIMIZED_PROMPT` total length + first/last 80 chars match the artifact (snapshot)
6. `EXAMPLE_RESPONSE` deep-equals the artifact constant (snapshot)
7. `pnpm -F shared test --coverage` and `pnpm -F web test --coverage` are green; ≥ 95% on shared parser, 100% on pure helpers
8. SonarCloud Quality Gate = PASS; `javascript:S3776 = 0` on new code
9. `.jsx` at root is byte-identical to pre-task state

## Risk Assessment
| Risk | Level | Mitigation | Detection |
|---|---|---|---|
| Template-literal escaping breaks `OPTIMIZED_PROMPT` during copy | MEDIUM | Single raw paste, no manual edits; snapshot test on length + first/last 80 chars asserts before/after match | Snapshot spec |
| `EXAMPLE_RESPONSE` field drift during copy (large nested literal) | MEDIUM | Verbatim paste then deep-equal against an inline fixture in the same spec | Spec fail on field mismatch |
| Workspace dependency resolution flakes (`workspace:*` protocol) | LOW | TASK_001 wired the dependencies; `pnpm install` validates the graph | `pnpm install` exit code |
| `packages/shared` accidentally pulls a React/DOM type that bloats the server bundle | MEDIUM | ESLint rule from TASK_001 blocks the import; spec asserts no React-style globals exported | `pnpm lint` |
| Web build accidentally bundles `OPTIMIZED_PROMPT` (huge string, no web consumer) | LOW | Vite tree-shakes ESM; verify via `pnpm -F web build` bundle-report; if it survives, move prompt to a `server-only/` subfolder in a follow-up | Build size delta |
| `parseAnalysisResponse` semantics drift from the artifact's `parseJsonFromResponse` | MEDIUM | Spec covers the same fenced/unfenced cases the artifact handled, plus the new `top_moments` validation | Two-case + missing-key tests |
| `chunkText` boundary off-by-one (charsPerChunk straddle) | MEDIUM | Boundary spec with words that straddle the chunk size exactly | Boundary test |
| `scriptureRegex` locale: Portuguese book names with diacritics | LOW | Spec enumerates every book name through `highlightText` | Test sweep |

## Implementation Strategy
1. Confirm TASK_001 left `packages/shared` with the empty barrel and the `workspace:*` deps wired in both apps; resolve the test-layout DEC first
2. TDD per shared module in order: `types.js` (typedefs, no logic) → `parse-analysis-response.js` → `prompts.js` → `example-data.js` → `index.js` barrel
3. Re-run from `apps/web` and `apps/server` (server is the TASK_001 stub) that imports from `@gospelviral/shared` resolve
4. TDD per web-only module: `scripture-books.js` → `text-highlight.js` → `helpers.js`
5. Coverage + sonar (`@sonar/scan`); finalize

## Prerequisite Subtasks (MANDATORY)

### SUBTASK_002.P1: GitFlow Workflow
**Status**: ⏱️ Not Started
- Branch: `feature/task-002-lib-extraction` from `develop`
- Commits per module across packages/shared and apps/web: `refactor(shared): types`, `refactor(shared): parser + tests`, `refactor(shared): prompts`, `refactor(shared): example-data`, `refactor(web): helpers + tests`, `refactor(web): text-highlight + tests`
- PR targeting `develop`, reviewed, source branch deleted after merge

### SUBTASK_002.P2: Tests Workflow
**Status**: ⏱️ Not Started
- TDD per module: failing spec → implementation → green
- AAA pattern in every spec
- Coverage ≥ 95% on shared parser, 100% on pure helpers
- Zero regressions on TASK_001 smoke tests
- Cognitive Complexity ≤ 15

### SUBTASK_002.P3: Task Finalization
**Status**: ⏱️ Not Started
- `pnpm lint`, `pnpm test --coverage`, `pnpm build` all green
- `sonar` runs locally; Quality Gate = PASS; `javascript:S3776 = 0` on new code
- Browser smoke (Chrome DevTools MCP): skipped (lib-only task; no UI delta yet)
- Git finalize with conventional commits + `Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>` trailer
- PR description includes the SonarCloud block
- On-screen execution summary at task close

## Subtasks
> Pass 2 — to be expanded on approval. Expected ~7 subtasks (shared types, shared parser, shared prompts, shared example-data, shared barrel + cross-import smoke, web helpers, web text-highlight + scripture-books).
