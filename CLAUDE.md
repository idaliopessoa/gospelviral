# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Active migration — Pass 2 execution plan

A migration to a `pnpm` monorepo (`apps/web` + `apps/server` + `packages/shared`) is in flight. **Twelve task files** live under `memory_bank/tasks/` (status `Ready`); the task registry is `memory_bank/tasks/task_registry.md`. **Architectural lens:** `01-Systems-Architecture-Expert-viral-cristao.md`. **Task protocol:** `02 - Task Creation System - Black Box Architecture.md`. **Autonomous execution plan** (decisions, per-task cycle, gates, audit subagent, human gate between phases): `~/.claude/projects/-Users-idaliopessoa-dev-gospelviral/memory/execution_plan_pass_2.md`.

Key constraints during the migration (do not violate without explicit human approval):
- `viral-cristao-artifact.jsx` at the repo root is **byte-identical** until TASK_012 (it is the SSOT for behavior; TASK_012 archives it to `reference/`)
- SonarCloud local `sonar` is the only Quality Gate (zero CI); `javascript:S3776 ≤ 15` per function
- Playwright is NOT in the scaffold — browser smoke runs through Chrome DevTools MCP (`navigate`/`take_screenshot`/`list_console_messages`/`list_network_requests`/`evaluate`)
- After every task: invoke the read-only `black-box-auditor` subagent (`.claude/agents/black-box-auditor.md`) for a GAP REPORT before merge

The sections below describe the **artifact-era** repo shape and will be rewritten in TASK_012 once the migration completes.

---

## Repo shape

Single-file Claude artifact: `viral-cristao-artifact.jsx` (~1600 lines, default-exported React app). No `package.json`, no build system, no tests, no git. The file is meant to run inside an artifact/preview host (Claude.ai artifact runtime or equivalent) that already provides React, `lucide-react`, and Tailwind CSS — do **not** add a Vite/Next/CRA wrapper unless explicitly asked.

## Architecture (top-to-bottom in the file)

The single file is laid out as five banner-separated sections, in order:

1. **`OPTIMIZED_PROMPT`** (~line 7) — the LLM system prompt in Portuguese. Defines the viral-moment analyzer's role, scoring rubric (6 weighted dimensions, threshold ≥ 6.5), theological guardrails, cold-open decision logic, and the strict JSON `output_schema` that downstream UI consumes. Editing scoring weights, schema field names, or guardrails means UI fields will reshape — update both ends.
2. **`EXAMPLE_TRANSCRIPT` + `EXAMPLE_RESPONSE`** (~line 130) — hardcoded sample transcript and a fully-populated mock of the JSON the API is supposed to return. The "Ver exemplo pronto" button bypasses the API and renders this directly; treat it as the canonical shape of `results`.
3. **Helpers** (~line 438) — `extractVideoId`, `timestampToSeconds`, `parseJsonFromResponse` (strips ```json fences, slices first `{` … last `}`), `highlightText` + `splitByRegex` (scripture-reference + Jesus/Deus keyword highlighting), `chunkText` (splits caption into N-line subtitle screens cycled on a 2.2s timer).
4. **Components** (~line 528) — `CopyButton`, `CopyAllButton`, `ScoreBar`, **`SubtitlePreview`** (the 9:16 canvas, 3 stacked layers: draggable video proxy via YouTube thumbnail → optional PNG overlay → draggable subtitle chunk), `MomentCard` (one viral moment), `NumberField`, `SubtitleControls`/`VideoControls`/`OverlayControls`, `ConfigPanel` (sticky tabbed header).
5. **`App`** (~line 1266) — state machine with three views: `input` → `analyzing` → `results`. Holds `config` (subtitle), `videoConfig`, `overlayConfig` as **global** state shared across all 5 `MomentCard`s (the "aplica aos 5" promise in the ConfigPanel header).

### Coordinate system (critical for drag math)

`SubtitlePreview` works in a **1080×1920 reference canvas** (Reels/Shorts native). The on-screen canvas is 280×498 (mobile) or 340×604 (≥md), measured at runtime with `getBoundingClientRect`. `scaleFactor = canvasSize.width / 1080` converts between the two; pointer deltas are always recorded in **canvas-reference px** so values survive responsive resizes. Both `videoConfig.{x,y}` and `subtitleConfig.{x,y}` are offsets in this 1080-px space. The subtitle is also anchored to top/center/bottom (`anchorPercent` = 12/50/86) and offset from that anchor.

### API call (`analyze()`, ~line 1308)

Direct `POST https://api.anthropic.com/v1/messages` from the browser, model `claude-sonnet-4-20250514`, `max_tokens: 8000`, no API key in headers. This **will not work in a normal browser** (CORS + missing auth) — it relies on the artifact host injecting credentials/proxy, which is why the inline footer note says "funciona quando portado para Claude Code". If asked to make it run standalone, the realistic options are: (a) move the call server-side, or (b) swap to `window.claude.complete` / artifact-host API. Don't silently add `Authorization` headers with a hardcoded key.

### Schema coupling

`MomentCard` and friends read deeply nested fields: `moment.score_breakdown.<dim>.score`, `moment.theological_check.<flag>`, `moment.cold_open_analysis.decision`, `moment.key_scripture.{reference,text,when_to_display}`, `moment.caption.{text,structure_used}`, `moment.hashtags.all`. `getScore()` in `MomentCard` tolerates both `{score, notes}` objects and raw numbers — keep that fallback if you change the prompt to return flatter scores. The cold-open badge checks **both** `moment.cold_open === true` and `moment.cold_open_analysis?.decision === 'apply_cold_open'`.

## Running / iterating

There is no `npm run dev`. To preview changes:

- **Inside an artifact host**: paste the file and run.
- **Locally**: there's no scaffolding — if asked to add one, confirm with the user first (Vite + React + Tailwind + lucide-react is the obvious fit). Don't introduce a build pipeline on your own initiative.
- **Lint/tests**: none configured. Don't fabricate a test command.

## Conventions worth preserving

- All UI copy is **Portuguese (Brazilian)**. Match the existing voice when adding strings.
- Typography is intentional: `Instrument Serif` for display/numerals, `IBM Plex Sans` for UI, `IBM Plex Mono` for timestamps/codes/tabular numbers. Inline `style={{ fontFamily: ... }}` is the established pattern (Tailwind config isn't available here).
- Palette: stone-* neutrals on `#F5F1EA` paper background; accents `#B95D3F` (evangelização), `#3F6BB9` (edificação), `#7A6A4F` (híbrido), `#F4C04A` (scripture highlight).
- Canvas sizes live in the inline `<style>` block at line ~1381 (`.canvas-9-16`, `.video-16-9`, `.canvas-width-only`) — the comment there explicitly says this is to dodge Tailwind arbitrary-value issues. If you change canvas dimensions, update the CSS block, not just JS.
- Drag handlers use Pointer Events with `setPointerCapture` and `touchAction: 'none'` — keep both when addinæg new draggable layers, otherwise touch devices stutter.
