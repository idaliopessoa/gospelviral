# TASK_007: Claude CLI Adapter + Stream-JSON Parser
timestamp: 2026-05-27T00:00:00Z
version: 1.0
status: Ready
owner: unassigned
confidence: MEDIUM
phase: 2

## Black Box Interface

### INPUT
- **Required Context**:
  - `claude-code-bootstrap.md` §"Capacidade nova: dual-mode CLI ↔ API", §"Notas sobre o spawn do Claude Code CLI"
  - Reference repository `nexu-io/open-design` — files `apps/daemon/src/agents.ts` (adapter pattern, `buildArgs`, `promptViaStdin`) and `apps/daemon/src/claude-stream.ts` (line-delimited JSON parser, typed events)
  - TASK_002 OUTPUT — `@gospelviral/shared` exposes `parseAnalysisResponse` (authored in TASK_002, first consumed in TASK_006, reused here)
  - TASK_005 OUTPUT (`env`, `logger`, `resolveModel`)
  - TASK_006 OUTPUT (`errors.js` typed adapter errors; the `runViaApi` contract this adapter mirrors)
  - The `claude` binary on a developer machine (and optionally `openclaude` fallback)
- **Prerequisites**: TASK_002 (Complete), TASK_005 (Complete), TASK_006 (Complete) — TASK_002 produced the parser in shared; TASK_006 produced the adapter contract and error classes that this task mirrors
- **Parameters**:
  - same as TASK_006: `{ systemPrompt, userMessage, modelId, maxTokens?, signal? }`
  - additional: `binPath` (optional override; defaults to PATH lookup result)

### OUTPUT
- **Deliverables**:
  - `apps/server/src/parsers/stream-json.js` — line-delimited JSON parser; exposes `parseStreamJson(stream: AsyncIterable<string>): AsyncIterable<StreamEvent>` where `StreamEvent` ∈ {`text`, `thinking`, `tool_use`, `tool_result`, `status`, `result`, `error`, `unknown`}
  - `apps/server/src/runtime/claude-cli.js` — exports `runViaCli({ systemPrompt, userMessage, modelId, maxTokens?, signal?, binPath? }): Promise<AnalysisResponse>` with the same return contract as `runViaApi`
  - `apps/server/src/runtime/claude-cli-capabilities.js` — exports `probeCapabilities(binPath): Promise<{ version, hasIncludePartialMessages, hasAddDir }>`, memoized per `binPath`
  - The final JSON-to-`AnalysisResponse` step calls `parseAnalysisResponse` from `@gospelviral/shared` — this adapter does NOT create a server-side parser copy
  - Vitest specs using `child_process.spawn` mocked: happy path, malformed lines (skipped with logged warn), early process exit, stderr emission, abort signal
  - Optional hand-driven script `pnpm -F server smoke:cli` that runs the adapter against the real `claude` binary
- **Artifacts**:
  - Coverage ≥ 85% on `claude-cli.js`; 100% on `stream-json.js` (pure parser)
  - SonarCloud Quality Gate = PASS; `javascript:S3776 = 0`
- **Decisions Generated**:
  - DEC: spawn args set — `['-p', '--output-format', 'stream-json', '--permission-mode', 'bypassPermissions', '--model', modelId]`; `--include-partial-messages` appended if capability probe says yes (`DEC_XXX_cli_spawn_args.md`)
  - DEC: prompt-via-stdin is **mandatory** (not optional) — avoids ENAMETOOLONG/E2BIG since `OPTIMIZED_PROMPT + transcript` is large; recorded
  - DEC: which event terminates the stream as "result" — defer to capability probe; record the chosen event name once verified against the live binary

### INVARIANTS
- **Must Maintain**:
  - `viral-cristao-artifact.jsx` at the repository root remains **byte-identical** until TASK_012
  - `runViaCli` produces the **same `AnalysisResponse` shape** as `runViaApi` — callers in TASK_009 cannot tell which adapter ran
  - Prompt is **always** delivered via stdin, never via argv (`OPTIMIZED_PROMPT + transcript` easily exceeds the 32KB CreateProcess limit on Windows and E2BIG on Linux)
  - `--permission-mode bypassPermissions` is set so the CLI never tries to prompt interactively (no TTY in server)
  - `AbortSignal` cancellation kills the child process group, not just the parent reference; cleanup of stdio streams on signal
  - Stderr is captured and logged at `warn` level; not silenced
  - Unknown stream-json events do not crash the parser — they are emitted as `{ type: 'unknown', raw }` and logged
- **Quality Gates**:
  - Parser spec covers: well-formed JSON line, malformed line (assert it skips with a warn, does not throw), partial line spanning two chunks, mid-stream `\r\n` vs `\n`
  - Adapter spec stubs `spawn` returning a pre-recorded event sequence and asserts the final `AnalysisResponse`
  - Adapter spec asserts no part of `userMessage` (the transcript) appears in the process argv
  - SonarCloud Quality Gate = PASS; `javascript:S3776 = 0`

## Task Definition
Build the Claude Code CLI adapter as a server-side function with the same `runVia…` contract as the API adapter, internally spawning the `claude` binary with prompt-via-stdin and `--output-format stream-json`, parsing line-delimited JSON events, capturing the final result, and reusing the canonical `AnalysisResponse` parser from TASK_006. Includes a capability probe so the spawn args adapt to the user's installed version. The CLI adapter is more complex than the API adapter due to process management and streaming, which is why it follows TASK_006 in sequence — the API path validates the response contract first.

## Success Criteria
1. `runViaCli(...)` with a mocked `spawn` emitting a pre-recorded happy-path event stream resolves to the canonical `AnalysisResponse`
2. With a mocked process exiting non-zero, the function rejects with an error including the captured stderr (and no part of `userMessage`)
3. With an `AbortSignal` aborted mid-stream, the child process is terminated and the promise rejects with `AbortError`
4. `parseStreamJson` handles malformed lines without throwing
5. `probeCapabilities` correctly detects (mocked) presence/absence of `--include-partial-messages`
6. `runViaCli` and `runViaApi` produce deep-equal results when fed identical fixtures (cross-adapter contract test)
7. SonarCloud Quality Gate = PASS; `javascript:S3776 = 0`
8. `.jsx` at root is byte-identical to pre-task state

## Risk Assessment
| Risk | Level | Mitigation | Detection |
|---|---|---|---|
| `claude` CLI event schema changes between versions | HIGH | Capability probe + tolerant parser (unknown events → `unknown` type, logged but not fatal); record exact CLI version in the smoke script output | Smoke script run before merge; pin version range in `package.json` engines field if necessary |
| Stream-json terminator event name not exactly known without live probe | HIGH | Pass 2 subtask "live probe" runs once on a developer machine, records the actual event sequence, then specs pin to it | Smoke script + recorded event sequence committed as fixture |
| Process group not killed on abort → zombie children | MEDIUM | Spawn with `detached: true` and `process.kill(-pid)` on abort; covered by an integration spec that asserts the child PID is no longer running. **Known limitation: `kill(-pid)` is POSIX-only.** macOS is the development target, so this is acceptable for now; full Windows support would require `tree-kill` or `taskkill /F /T /PID` and is filed as a future task (the cross-platform abort path is documented in the Pass 2 plan, not implemented in TASK_007) | OS-level check in integration test on macOS/Linux |
| Prompt bytes echo into stderr or logs | MEDIUM | Logger redaction on `userMessage` field; spec asserts no transcript content appears in captured stderr after a happy-path run | Spec scrubs both streams |
| `openclaude` fork has subtly different flags | LOW | Capability probe distinguishes the two by parsing `claude --version` output; fallback only when default not found | Probe spec covers both binaries |
| Cross-platform PATH resolution (`claude.cmd` on Windows vs `claude` on POSIX) | LOW | Use `which-pm` style cross-platform resolver in TASK_008; CLI adapter receives the resolved absolute `binPath` | TASK_008 detect spec |

## Implementation Strategy
1. Write `stream-json.js` first against fabricated fixtures; this is pure parsing
2. Write `claude-cli-capabilities.js` with mocked `claude -p --help` output; memoize result
3. Write `claude-cli.js` against mocked `spawn`; iterate through happy path, then each error case
4. Run a live smoke against the real `claude` binary on a developer machine; capture the event stream; commit it as a fixture; re-run all specs against that fixture
5. Cross-adapter contract spec: feed both adapters the same fixture (CLI stream replays `result` event with the full `EXAMPLE_RESPONSE`, API stub returns same) and `expect(viaCli).toEqual(viaApi)`
6. Lint, sonar (`@sonar/scan`), finalize

## Prerequisite Subtasks (MANDATORY)

### SUBTASK_007.P1: GitFlow Workflow
**Status**: ⏱️ Not Started
- Branch: `feature/task-007-claude-cli-adapter` from `develop`
- Commits: `feat(server): stream-json parser`, `feat(server): cli capability probe`, `feat(server): claude-cli adapter`, `test(server): cross-adapter contract`
- PR targeting `develop`, reviewed, source branch deleted after merge

### SUBTASK_007.P2: Tests Workflow
**Status**: ⏱️ Not Started
- TDD: parser fixtures-first
- TDD: adapter mocked-spawn-first
- AAA in every spec
- Cross-adapter contract test mandatory
- Zero regressions on TASK_001..TASK_006
- No method exceeds Cognitive Complexity 15 — `claude-cli.js` is at risk; if it does, split out `consumeStream`, `attachAbortHandler`, `reapChild`

### SUBTASK_007.P3: Task Finalization
**Status**: ⏱️ Not Started
- `pnpm lint`, `pnpm -F server test --coverage`, build green
- `sonar` runs locally; Quality Gate = PASS; `javascript:S3776 = 0`
- Live smoke (`pnpm -F server smoke:cli`) run once on developer machine; output captured in PR description
- Browser smoke (Chrome DevTools MCP): skipped (server-only task)
- Git finalize with conventional commits + `Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>` trailer
- PR description includes the SonarCloud block
- On-screen execution summary at task close

## Subtasks
> Pass 2 — to be expanded on approval. Expected ~4 subtasks (parser, capability probe, adapter, cross-adapter contract test + smoke).
