# TASK_012: Docs Rewrite — CLAUDE.md (monorepo) + ROADMAP.md
timestamp: 2026-05-27T00:00:00Z
version: 1.0
status: Ready
owner: unassigned
confidence: HIGH
phase: 2

## Black Box Interface

### INPUT
- **Required Context**:
  - Finalized state of the monorepo after TASK_010 and TASK_011
  - Current `CLAUDE.md` at repo root (artifact-era; will be rewritten)
  - `claude-code-bootstrap.md` §"Plano de migração" step 9 ("Documentar roadmap de features futuras")
  - Deferred items accumulated across earlier tasks (recorded in their respective files):
    - SSE streaming for `/api/analyze` (deferred from TASK_009)
    - **Playwright (or equivalent) for snapshot-based visual regression** — deferred from TASK_004; Playwright was explicitly NOT included in the TASK_001 scaffold (DEC), and browser-driven smoke runs through Chrome DevTools MCP today. Promoting Playwright in a future task would add `apps/web/tests-e2e/` plus a CI run; only worth it when there is a pixel-diff regression suite to feed
    - Apify integration (transcript auto-pull from YouTube)
    - Multi-vídeo (analyze several pregações in sequence)
    - Export ZIP (text assets + thumbnail per moment)
    - Cross-tab sync for `localStorage` (deferred from TASK_011)
    - **IndexedDB persistence for `overlayConfig.dataURL` (PNG overlays)** — `localStorage` ceiling (~5MB) forced TASK_011 to strip the PNG; IndexedDB has gigabyte-scale quota and supports binary `Blob` storage natively. Future task would migrate `overlayConfig.dataURL` to an IndexedDB-backed store with the same `loadVisualPresets`/`saveVisualPresets` external interface (`packages/shared` types unchanged). Deferred from TASK_011
    - i18n beyond PT-BR (scripture book names already isolated in TASK_002)
    - Shared package moved to `apps/server/src/shared-server-only/` if Vite tree-shaking ever fails to drop `OPTIMIZED_PROMPT` from the web bundle (noted as a follow-up risk in TASK_002)
- **Prerequisites**: TASK_010, TASK_011 (both Complete)
- **Parameters**: none

### OUTPUT
- **Deliverables**:
  - Rewritten `CLAUDE.md` at repo root covering:
    - Repo shape (monorepo, pnpm workspaces, `apps/web` + `apps/server`)
    - Architecture (frontend three-view state machine, backend dual-mode adapters, runtime detection, `AnalysisResponse` contract)
    - Commands (`pnpm dev`, `pnpm test`, `pnpm build`, `pnpm lint`, `pnpm -F server smoke:api`, `pnpm -F server smoke:cli`, `sonar`)
    - Coordinate system (1080×1920 canvas reference, `scaleFactor`, anchor percentages) — preserved from current `CLAUDE.md`
    - Schema coupling (paths into `Moment`, dual cold-open check, `getScore()` fallback) — preserved
    - Conventions (PT-BR copy, typography stack, palette, font inline-style pattern, Pointer Events drag pattern) — preserved
    - Persona reference: `01-Systems-Architecture-Expert-viral-cristao.md`
    - Task protocol reference: `02 - Task Creation System - Black Box Architecture.md` and `memory_bank/tasks/`
  - `ROADMAP.md` at repo root listing the deferred items above, each with:
    - 1-sentence description
    - Why deferred (with a link back to the originating task file)
    - Rough scope tag (small / medium / large)
    - Open questions (if any)
  - **Decision on `viral-cristao-artifact.jsx`**: move to `reference/viral-cristao-artifact.jsx` as the frozen behavioral SSOT (no longer the active source — `apps/web` is). The byte-identical invariant from earlier tasks is satisfied *up to* this task; here, the file is **moved**, not modified
  - `memory_bank/decisions/` folder populated with one DEC file per architectural decision generated during TASK_001..TASK_011 (collated retroactively; previously each task only *promised* a DEC entry under a label, this task is the gate that materializes them)
- **Artifacts**:
  - No code changes; only documentation and the `.jsx` move
  - SonarCloud Quality Gate = PASS (docs-only commits typically pass automatically)
- **Decisions Generated**:
  - DEC: `reference/` directory convention — frozen artifacts and historical reference material live here; never imported by either app
  - DEC: `ROADMAP.md` lives at repo root, not under `memory_bank/`; it is user-facing roadmap, not task-protocol output

### INVARIANTS
- **Must Maintain**:
  - **`viral-cristao-artifact.jsx` is moved (with `git mv`) to `reference/viral-cristao-artifact.jsx`** — content unchanged, only path; the byte-identical invariant from earlier tasks ends here, replaced by a "never modified" invariant in its new location
  - `01-Systems-Architecture-Expert-viral-cristao.md`, `02 - Task Creation System - Black Box Architecture.md`, `claude-code-bootstrap.md` remain at repo root unchanged (they are user-authored / process docs)
  - The artifact-era `CLAUDE.md` is fully replaced; no archived copy under a different name (keeping two `CLAUDE.md`-like files would be confusing)
  - `ROADMAP.md` does not include any item that was supposed to land in TASK_001..TASK_011 — the roadmap is forward-looking only
  - All DEC files use the convention `memory_bank/decisions/DEC_XXX_<topic>.md` with frontmatter `{ id, date, status: 'accepted' | 'rejected' | 'superseded' }` and a "Sources" section linking back to the originating task file(s)
- **Quality Gates**:
  - `CLAUDE.md` references real paths only (any path that wouldn't pass `test -e` is a bug)
  - `ROADMAP.md` has at least one item, and every item has a back-link to the task file that deferred it
  - `memory_bank/decisions/` contains at minimum one file per DEC promised in TASK_001..TASK_011
  - No code references the old root path `viral-cristao-artifact.jsx` (search the tree; rewrite or document the new path)

## Task Definition
Replace the artifact-era documentation with the monorepo-era documentation. Rewrite `CLAUDE.md` from scratch to describe the new shape (apps, commands, architecture, conventions, references). Create `ROADMAP.md` cataloguing all features deferred during the migration with provenance back to their originating tasks. Materialize the DEC files that earlier tasks promised under `memory_bank/decisions/`. Finally, archive `viral-cristao-artifact.jsx` to a `reference/` directory so it remains accessible as the frozen behavioral SSOT without continuing to look like an active source file at the root.

## Success Criteria
1. `cat CLAUDE.md` reflects the monorepo and contains no references to the single-file artifact running in the artifact host
2. `ROADMAP.md` exists at repo root with at least 6 items (the deferred set listed in INPUT), each with provenance
3. `reference/viral-cristao-artifact.jsx` exists; root no longer has `viral-cristao-artifact.jsx`; `git log --follow` shows the move history intact
4. `memory_bank/decisions/` exists with one DEC file per promised decision; each links back to the originating task
5. `grep -r "viral-cristao-artifact.jsx" apps/` finds zero results (or only commented-out historical references with explanation)
6. SonarCloud Quality Gate = PASS
7. `.jsx` content is byte-identical to its TASK_011 state (only the path changed)

## Risk Assessment
| Risk | Level | Mitigation | Detection |
|---|---|---|---|
| Some earlier task left a path-string reference to the root `.jsx` (e.g., a comment, a doc, a TODO) | MEDIUM | Project-wide grep before opening PR; rewrite or remove every match | `grep -r` clean |
| `git mv` of the `.jsx` loses history in tooling that doesn't follow renames | LOW | `git mv` is the standard; consumers running `--follow` see the chain | `git log --follow reference/viral-cristao-artifact.jsx` shows the original commit |
| `ROADMAP.md` accidentally documents items that are actually already in scope of earlier tasks | LOW | Each item must have a back-link to a *Decisions Generated* line in a task file proving it was explicitly deferred | PR review |
| DEC files turn into low-content stubs ("decided to use X") | MEDIUM | DEC template requires: Context, Options Considered, Decision, Consequences, Sources — match the rigor of the originating task | Self-review against the template |
| `CLAUDE.md` rewrite drops useful guidance from the artifact-era doc | MEDIUM | Diff old vs new; carry forward the still-relevant sections (coordinate system, schema coupling, conventions); only drop what's tied to the single-file artifact-host shape | Diff review |

## Implementation Strategy
1. Audit: list every DEC promised across TASK_001..TASK_011 by grepping the task files; produce a checklist of DEC files to create
2. Create `memory_bank/decisions/` and populate one file per checklist item with the agreed template
3. Move `.jsx` with `git mv viral-cristao-artifact.jsx reference/viral-cristao-artifact.jsx`
4. Rewrite `CLAUDE.md` from scratch using the OUTPUT bullets as the section outline
5. Write `ROADMAP.md` per the OUTPUT bullets
6. Sweep `apps/` for any string reference to the old root path; rewrite to the new path or remove
7. `pnpm lint`, `pnpm test`, `pnpm build`, `sonar` — verify no functional change
8. Open PR with a checklist of the doc-level criteria above

## Prerequisite Subtasks (MANDATORY)

### SUBTASK_012.P1: GitFlow Workflow
**Status**: ⏱️ Not Started
- Branch: `feature/task-012-docs-rewrite` from `develop`
- Commits: `docs: rewrite CLAUDE.md for monorepo`, `docs: add ROADMAP.md`, `docs: materialize DEC files`, `chore(repo): move artifact to reference/`
- PR targeting `develop`, reviewed, source branch deleted after merge

### SUBTASK_012.P2: Tests Workflow
**Status**: ⏱️ Not Started
- No new tests required (docs + file move only). Existing test suite must continue to pass — this is the regression gate
- AAA pattern unchanged in existing specs
- Zero regressions on TASK_001..TASK_011

### SUBTASK_012.P3: Task Finalization
**Status**: ⏱️ Not Started
- `pnpm lint`, `pnpm test --coverage`, `pnpm build` all green
- `sonar` runs locally; Quality Gate = PASS; `javascript:S3776 = 0` (no new code)
- Browser smoke via Chrome DevTools MCP: full happy path one more time (navigate → click "Ver exemplo pronto" → screenshot results view; if real backend reachable, run one full `/api/analyze` cycle and inspect `list_network_requests`); the artifact-era behavior must still work end-to-end against the post-migration code
- Git finalize with conventional commits + `Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>` trailer
- PR description includes the SonarCloud block
- On-screen execution summary at task close

## Subtasks
> Pass 2 — to be expanded on approval. Expected ~4 subtasks (DEC audit + materialization, `.jsx` archive move, CLAUDE.md rewrite, ROADMAP.md authoring).
