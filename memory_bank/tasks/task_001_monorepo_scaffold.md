# TASK_001: Monorepo Scaffold
timestamp: 2026-05-27T00:00:00Z
version: 1.0
status: Ready
owner: unassigned
confidence: HIGH
phase: 1

## Black Box Interface

### INPUT
- **Required Context**:
  - `claude-code-bootstrap.md` §"Stack alvo" + §"Estrutura sugerida"
  - `01-Systems-Architecture-Expert-viral-cristao.md` §"Stack"
- **Prerequisites**: none (root task)
- **Parameters**:
  - `pkg_manager`: literal `pnpm`
  - `node_version`: `>=20.10`

### OUTPUT
- **Deliverables**:
  - Root `package.json` with `pnpm-workspace.yaml` declaring `apps/*` and `packages/*`
  - `apps/web/` Vite + React 18 + Tailwind v3 (JIT) skeleton (`package.json`, `vite.config.js`, `tailwind.config.js`, `postcss.config.js`, empty `src/main.jsx`+`App.jsx` placeholder)
  - `apps/server/` Hono stub (`package.json`, `src/server.js` returning 200 on `/healthz`, dev script via `tsx` or `node --watch`)
  - `packages/shared/` empty package — `package.json` with `"name": "@gospelviral/shared"`, `"type": "module"`, `"exports": { ".": "./src/index.js" }`, version `0.0.0`, `private: true`; `src/index.js` as empty barrel; consumed by both apps via `"@gospelviral/shared": "workspace:*"` in their dependencies. **Contents (parser, types, prompt, fixtures) are populated in TASK_002 — this task only creates the shell.**
  - Shared tooling: ESLint flat config (with a rule blocking React/DOM imports inside `packages/shared/` and blocking `@anthropic-ai/*` imports outside `apps/server/runtime/`), Prettier config, Vitest config (web + server + shared), `.editorconfig`
  - **`.gitignore` — `.env.local` MUST be listed BEFORE the first `git add`** (hard precondition; the file holds `SONAR_TOKEN` and must never enter git history). Also gitignored: `node_modules/`, `dist/`, `coverage/`, `.scannerwork/`, `*.lcov`, `.DS_Store`
  - **`.env.example` at repo root** — non-secret keys with empty values: `ANTHROPIC_API_KEY=`, `SONAR_TOKEN=`, `PORT=`, `LOG_LEVEL=`, `ANALYZE_TIMEOUT_MS=`
  - **`.env.local` at repo root (NOT committed)** — populated with `SONAR_TOKEN=<value>` (per execution plan memory) and `ANTHROPIC_API_KEY=<invalid-by-design-value>`. Whoever runs the scaffold ensures `.env.local` exists locally and the token is sourced into the shell before invoking `sonar`
  - **`sonar-project.properties` at repo root (COMMITTED)** — contains:
    ```
    sonar.projectKey=idaliopessoa_gospelviral
    sonar.organization=idaliopessoa
    sonar.host.url=https://sonarcloud.io
    sonar.sources=apps/web/src,apps/server/src,packages/shared/src
    sonar.tests=apps/web/src,apps/server/src,packages/shared/src
    sonar.test.inclusions=**/*.test.js,**/*.spec.js,**/__tests__/**
    sonar.javascript.lcov.reportPaths=apps/web/coverage/lcov.info,apps/server/coverage/lcov.info,packages/shared/coverage/lcov.info
    sonar.sourceEncoding=UTF-8
    ```
    The token is **never** in this file (read from `SONAR_TOKEN` env var by the scanner)
  - **`@sonar/scan` available** — installed globally (`npm install -g @sonar/scan`) OR added as a workspace devDependency at the root (`pnpm add -Dw @sonar/scan`) OR invoked via `npx @sonar/scan`. The binary it exposes is `sonar`. Add a root script `"sonar": "sonar"` in the root `package.json` so the team types `pnpm sonar` and reads `SONAR_TOKEN` from the active shell
  - **No Playwright in scaffold.** Browser-driven verification for UI tasks (TASK_004 / TASK_010 / TASK_011) goes through the **Chrome DevTools MCP** that the agent invokes at audit time (`navigate` → `take_screenshot` → `list_console_messages` → `list_network_requests` → `evaluate`). Playwright lives only in the ROADMAP, as the future swap-in if/when snapshot-based regression becomes worthwhile
  - Initial `git init` + first commit on `main` + `develop` branched from `main` (per GitFlow: `main` is the production line, `develop` is the integration line, feature branches off `develop`). **Before the first `git add`, verify `.gitignore` contains `.env.local`** and that `.env.local` is the only file holding `SONAR_TOKEN`
- **Artifacts**:
  - `pnpm-lock.yaml` generated
  - `pnpm dev` runs both apps; `pnpm test` runs all suites green (with zero tests as baseline)
- **Decisions Generated** (DEC entries live in `memory_bank/decisions/DEC_XXX_<topic>.md`; the `decisions/` folder is created lazily by the first task that produces a DEC):
  - DEC: choice of Hono over Express
  - DEC: ESLint flat config vs `.eslintrc` (flat)
  - DEC: GitFlow with `main`+`develop` (not trunk-based)
  - DEC: **Playwright removed from scaffold** — `DEC_XXX_no_playwright_in_scaffold.md`. Reason: browser-driven verification for UI tasks runs via the Chrome DevTools MCP the agent connects to (`navigate`, `take_screenshot`, `list_console_messages`, `list_network_requests`, `evaluate`). Avoids Playwright install/dependency cost when there is no snapshot regression suite to feed. Playwright kept in ROADMAP as the swap-in if/when snapshot testing becomes worth it
  - DEC: **SonarCloud scanner = `@sonar/scan` (Node-based `sonar` CLI), not the Java `sonar-scanner`** — `DEC_XXX_sonar_node_scanner.md`. SonarSource now ships this as the official scanner; lighter dependency, ESM-friendly, fits a Node monorepo cleanly. `sonar-project.properties` is committed (project key, org, host URL, source/test globs, lcov paths); `SONAR_TOKEN` lives only in `.env.local` (gitignored) and is read from the shell environment by the scanner
  - DEC: **Expected Quality Gate FAIL on scaffold scan** — `DEC_XXX_scaffold_coverage_gate.md`. The TASK_001 commit introduces zero new logic; Sonar way default Quality Gate requires coverage on new code and will report FAIL on the first scan. This is a **known and expected condition**, not a bug. Three remediations the human picks from (do NOT decide unilaterally): (a) temporarily relax the QG to ignore coverage until TASK_002 lands the first real testable code; (b) accept the FAIL as a documented exception in the PR description, scheduled to clear on TASK_002; (c) wait to scan until TASK_002 is merged. **Reporting the FAIL to the human is mandatory; bypassing the gate or skipping the scan is forbidden**

### INVARIANTS
- **Must Maintain**:
  - `.jsx` SSOT at repo root untouched
  - Existing `CLAUDE.md` untouched (rewritten in TASK_012)
  - No source code from `.jsx` moved yet — that is TASK_002/003/004
  - `packages/shared/` is the **single source of truth for cross-app primitives + LLM I/O contract** (types, parser, prompt, fixtures) once populated in TASK_002. The package MUST have zero React/DOM imports (so it loads cleanly in Node) and zero Anthropic SDK imports (transport stays in `apps/server/runtime/`). ESLint rules enforce both boundaries
- **Quality Gates**:
  - `pnpm lint` exits 0
  - `pnpm test` exits 0 (empty suites OK)
  - `pnpm build` (apps/web) produces `dist/`
  - SonarCloud Quality Gate run executed (PASS *or* the **expected scaffold FAIL on "Coverage on New Code"** per DEC `DEC_XXX_scaffold_coverage_gate.md` — reported to human, never bypassed)
  - `SONAR_TOKEN` is **not** present in any committed file (verify via `git grep -nE '1bc295a98|SONAR_TOKEN=[a-z0-9]'` returning empty before opening the PR)
  - Cognitive Complexity ≤ 15 (`javascript:S3776`) — scaffold won't have functions over the ceiling

## Task Definition
Bootstrap the repository as a `pnpm` workspace monorepo with two app slots (`apps/web` Vite/React/Tailwind, `apps/server` Hono), one shared package (`packages/shared` shell), and JS tooling (ESLint flat with cross-package import rules, Vitest, `sonar` config), without touching the existing `viral-cristao-artifact.jsx`. Browser-driven UI verification rides on the Chrome DevTools MCP (not Playwright). Result: a buildable, lintable, testable skeleton onto which the artifact is then ported in subsequent tasks.

## Success Criteria
1. `pnpm install` succeeds from a clean clone, lockfile committed
2. `pnpm -F web dev` boots Vite on a chosen port serving a blank app
3. `pnpm -F server dev` boots Hono and `curl /healthz` returns 200
4. `pnpm lint`, `pnpm test`, `pnpm build` all exit 0
5. `sonar` runs locally; Quality Gate = PASS
6. `import {} from '@gospelviral/shared'` resolves from both `apps/web` and `apps/server` without runtime error (empty barrel acceptable; populated in TASK_002)
7. `.jsx` at root is byte-identical to pre-task state

## Risk Assessment
| Risk | Level | Mitigation | Detection |
|---|---|---|---|
| Tailwind v3 JIT misconfigured (canvas classes won't compile) | MEDIUM | Add a smoke component using `w-[280px]` and an arbitrary color; if it renders, JIT works | Manual visual check in `pnpm -F web dev` |
| Hono ESM vs CJS friction with Node 20 | LOW | Use `"type": "module"` everywhere; Hono is ESM-native | `pnpm -F server dev` boot |
| ESLint flat config edge cases with React JSX | MEDIUM | Use `@eslint/js` + `eslint-plugin-react` flat presets | `pnpm lint` on placeholder App.jsx |
| Sonar token / project key wrong (zero CI ⇒ local scan is the gate) | MEDIUM | `sonar-project.properties` carries the committed project/org/host config (`idaliopessoa_gospelviral` / `idaliopessoa` / `https://sonarcloud.io`); `SONAR_TOKEN` is sourced from `.env.local` in the active shell before invoking `sonar`; dry-run with the verbose flag of `@sonar/scan` to validate auth | Quality Gate run reaches SonarCloud and displays a verdict; if it doesn't, STOP and report |
| `SONAR_TOKEN` accidentally committed | HIGH | `.env.local` listed in `.gitignore` **before** the first `git add`; `git grep` the token bytes before opening the PR; if found, rotate the token immediately via the SonarCloud UI and force-clean history | `git status` clean of `.env.local`; `git grep` empty for token bytes |
| `@sonar/scan` install variant mismatch (global vs workspace vs npx) | LOW | Pick one install path in TASK_001 and document it in CLAUDE.md; the binary is always `sonar` regardless of install path | `which sonar` resolves OR `npx @sonar/scan --version` works |
| Scaffold scan returns Quality Gate FAIL on "Coverage on New Code" | EXPECTED | Documented in DEC `DEC_XXX_scaffold_coverage_gate.md`; **report to human, do not work around** | Sonar verdict reported in PR description with the DEC link |

## Implementation Strategy
High-level (full subtask breakdown happens in Pass 2):
1. `pnpm init` at root → `private: true`, `workspaces` via `pnpm-workspace.yaml`
2. Scaffold `apps/web` via `pnpm create vite@latest` (React, JS) then layer Tailwind v3 + PostCSS
3. Scaffold `apps/server` manually (Hono is too small for a generator)
3a. Scaffold `packages/shared` with an empty barrel; wire `"@gospelviral/shared": "workspace:*"` into `apps/web/package.json` and `apps/server/package.json`
4. Centralize ESLint, Prettier, Vitest configs at root with per-app extends + cross-package import rules (block React/DOM in `packages/shared/`, block Anthropic SDK outside `apps/server/runtime/`). **No Playwright config — browser smoke goes through Chrome DevTools MCP at audit time**
5. Write `.gitignore` **first** (Node + Vite + macOS noise + `.env.local` + `.scannerwork/` + `coverage/`); write `.editorconfig`
6. Write `.env.example` (empty keys) and `.env.local` (with `SONAR_TOKEN` from memory + invalid-by-design `ANTHROPIC_API_KEY`); confirm `.env.local` is gitignored before any `git add`
7. Write `sonar-project.properties` with the committed values from memory (project key, org, host URL, sources, tests, lcov paths). **No token in this file**
8. Install `@sonar/scan` (chosen variant: global `npm install -g @sonar/scan` OR workspace `pnpm add -Dw @sonar/scan` — pick one and document); verify `sonar --version` works
9. Wire root scripts: `dev` (parallel via `pnpm -r`), `lint`, `test`, `build`, `sonar` (passes through to the `@sonar/scan` CLI; reads `SONAR_TOKEN` from environment)
10. `git init`, initial commit on `main` (`chore(repo): initial scaffold`), then `git checkout -b develop` from `main`, then create `feature/task-001-monorepo-scaffold` off `develop` for the rest of the work. Push remote (`https://github.com/idaliopessoa/gospelviral`)
11. Run the gates: `pnpm lint`, `pnpm test`, `pnpm build`, then `pnpm sonar` (sourcing `.env.local` first if not already loaded). Expect the Quality Gate FAIL on "Coverage on New Code" per DEC; report verdict in PR description

## Prerequisite Subtasks (MANDATORY)

### SUBTASK_001.P1: GitFlow Workflow
**Status**: ⏱️ Not Started
- Special case for TASK_001: there is no repo yet. Order is:
  1. `git init` → initial commit `chore(repo): initial scaffold` lands on `main`
  2. `git checkout -b develop` from `main` (DEC: GitFlow with `main`+`develop`)
  3. `git checkout -b feature/task-001-monorepo-scaffold` from `develop` — all subsequent work lives here
- Commits on the feature branch: `chore(scaffold): init pnpm workspace`, `chore(web): add vite+tailwind skeleton`, `chore(server): add hono stub`, `chore(tooling): eslint+vitest+playwright+sonar`
- PR targeting `develop`, reviewed, source branch deleted after merge
- All later tasks (TASK_002..TASK_012) assume `develop` already exists and branch from it

### SUBTASK_001.P2: Tests Workflow
**Status**: ⏱️ Not Started
- Add one Vitest smoke test per app (`describe('scaffold', ...)` asserting an import works) — TDD applies to logic, not to template scaffolds; this is the AAA baseline
- Browser smoke via Chrome DevTools MCP: agent connects, calls `navigate` against the running `apps/web` dev URL, then `take_screenshot` + `list_console_messages` (expect zero errors) + `list_network_requests` (expect 2xx for HTML/JS bundle). Logged as PR evidence. No Playwright install
- Zero regressions (no prior tests to regress)
- Cognitive Complexity ≤ 15 — scaffold trivially passes

### SUBTASK_001.P3: Task Finalization
**Status**: ⏱️ Not Started
- Run `pnpm lint` (0 issues), `pnpm test --coverage`, `pnpm build`
- Source `.env.local` (or confirm `SONAR_TOKEN` is exported); run local `sonar` (the `@sonar/scan` Node CLI). **PASS or expected scaffold FAIL** ("Coverage on New Code"); never bypass. `javascript:S3776 = 0` violations
- Verify `git grep` for the token bytes returns empty BEFORE pushing
- Chrome DevTools MCP smoke captured (`navigate` → `take_screenshot` → `list_console_messages`); screenshots + console transcript pasted in PR description. Skip with reason if no MCP connection available — never silently pass
- Git finalize with conventional commits + `Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>` trailer
- PR description includes the SonarCloud block (timestamp, SHA, branch, PASS/FAIL, coverage, S3776=0)
- On-screen execution summary at task close

## Subtasks
> Pass 2 — to be expanded on approval. Expected ~8 subtasks (root scaffold, web scaffold, server scaffold, shared package shell, tooling + cross-package ESLint rules, sonar (`@sonar/scan` install + properties + .env.local), scripts, git init + first scan).
