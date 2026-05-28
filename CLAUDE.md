# CLAUDE.md

Guidance for Claude Code (claude.ai/code) when working in this repository.

## What this is

`gospelviral` is a `pnpm` monorepo for the **Viral Cristão** tool — given a
YouTube pregação URL plus the transcript, it returns the top 5 viral
moments structured for Reels/Shorts (9:16 preview with layered video +
overlay PNG + subtitle). The original single-file React artifact
(`reference/viral-cristao-artifact.jsx`) is the frozen behavioral SSOT;
the active code is the monorepo described below.

## Repo shape

```
apps/
  web/                Vite + React 18 + Tailwind v3 JIT (the UI)
  server/             Node + Hono (dual-mode CLI / API analyzer)
packages/
  shared/             Cross-app primitives + LLM I/O contract
                      (types, parser, OPTIMIZED_PROMPT, example fixtures)
reference/
  viral-cristao-artifact.jsx   Frozen artifact; never imported, do not modify
memory_bank/
  tasks/              Task protocol files (status, INPUT/OUTPUT, invariants)
  decisions/          DEC files — one per architectural decision (DEC_001..)
  tasks/evidence/     Chrome DevTools MCP screenshots, parity checklists
01-Systems-Architecture-Expert-viral-cristao.md   architectural lens (SSOT)
02 - Task Creation System - Black Box Architecture.md   task protocol (SSOT)
claude-code-bootstrap.md   migration plan + dual-mode CLI/API spec
ROADMAP.md            forward-looking items deferred from the migration
sonar-project.properties   Sonar config (committed); SONAR_TOKEN in .env.local only
eslint.config.js      flat config with cross-package import rules
```

## Architecture

### Frontend (`apps/web`)

Three-view state machine driven by `useAnalyze`:

- `input` — `InputView.jsx` collects URL + transcript and surfaces validation errors.
- `analyzing` — `AnalyzingView.jsx` cycles 5 PT-BR loading messages every 3500 ms (`useLoadingRotation`).
- `results` — `ResultsView.jsx` renders the sticky `ConfigPanel` plus 5 `MomentCard`s.

Components live under `apps/web/src/components/`; hooks under
`apps/web/src/hooks/` (`useCanvasMeasurement`, `useChunkRotation`,
`usePointerDrag`, `useAnalyze`, `useRuntime`, `useLoadingRotation`,
`useVisualPresetsPersistence`). The `ModeBadge` in the header reads
`useRuntime().currentMode` and lets the user force `auto` / `cli` / `api`
for the session.

**Persistence (`apps/web/src/lib/persistence.js`)**: subtitle/video/overlay
configs plus `isConfigCollapsed` are persisted to `localStorage` under
`viral-cristao:config:v1`. The PNG `dataURL` and `filename` are stripped
on both read and write (overlay re-upload each session). Schema mismatch
or corrupted JSON falls back to defaults silently with a single warn.

**Transport (`apps/web/src/lib/api.js`)**: the only module in `apps/web`
that calls `fetch('/api/analyze')`. The example fixture short-circuits
to `EXAMPLE_RESPONSE` without touching the network.
**`apps/web/src/lib/runtime.js`** is the only module that calls
`GET /api/runtime/detect`.

### Backend (`apps/server`)

`POST /api/analyze` and `GET /api/runtime/detect` mounted via Hono. The
handler in `routes/analyze.js` validates the body (`lib/validation.js`),
composes the user message (`lib/build-user-message.js`), resolves the
model preference to a wire slug (`config/models.js`), and dispatches to
**one of two adapters** that share an identical surface:

```
runViaApi({ systemPrompt, userMessage, modelId, maxTokens?, signal?, apiKey?, fetchImpl? })
  → Promise<AnalysisResponse>

runViaCli({ systemPrompt, userMessage, modelId, maxTokens?, signal?, binPath?, spawnImpl? })
  → Promise<AnalysisResponse>
```

- **API adapter** (`runtime/claude-api.js`) calls the Anthropic Messages REST API. Status mapping per DEC_015.
- **CLI adapter** (`runtime/claude-cli.js`) spawns the `claude` Code CLI with `-p --output-format stream-json --verbose --permission-mode bypassPermissions --model <slug>`, writes the prompt to stdin (DEC_017), and consumes the line-delimited JSON stream (`parsers/stream-json.js`). The terminator is `type: "result"` (DEC_018).
- **Runtime detection** (`runtime/detect.js`) uses `which@^5` to find a `claude`/`openclaude` binary on PATH; memoized 60 s (DEC_019). When both CLI and API key are available, CLI wins (DEC_020 — billing rides the user's subscription).

Both adapters delegate JSON parsing to `@gospelviral/shared`'s
`parseAnalysisResponse`. The server never holds its own parser copy.

### `packages/shared`

Owns the cross-app primitives:

- Type constants: `CANVAS_REFERENCE` (1080×1920), `SUBTITLE_ANCHOR_PERCENT` (12/50/86), `ANALYSIS_RESPONSE_REQUIRED_KEYS`, `TOP_MOMENTS_COUNT`.
- LLM I/O contract: `OPTIMIZED_PROMPT`, `parseAnalysisResponse`, `AnalysisResponseError`.
- Example fixtures: `EXAMPLE_URL`, `EXAMPLE_TRANSCRIPT`, `EXAMPLE_RESPONSE`.

Hard boundary: **zero React/DOM imports, zero `@anthropic-ai/*` imports**.
ESLint flat config enforces both.

## Coordinate system

`SubtitlePreview` works in a **1080×1920 reference canvas** (Reels/Shorts).
The on-screen canvas is 280×498 (mobile) or 340×604 (≥md). The hook
`useCanvasMeasurement` reports `scaleFactor = canvasSize.width / 1080`.
Pointer drag deltas are recorded in canvas-reference px so values survive
responsive resizes. Subtitle anchor percentages: top=12, center=50,
bottom=86.

## Schema coupling

`MomentCard` and friends read deeply nested fields:
`moment.score_breakdown.<dim>.score`,
`moment.theological_check.<flag>`,
`moment.cold_open_analysis.decision`,
`moment.key_scripture.{reference, text, when_to_display}`,
`moment.caption.{text, structure_used}`,
`moment.hashtags.all`. `MomentCard`'s `readScore()` tolerates both
`{score, notes}` objects and raw numbers. The cold-open badge dual-checks
`moment.cold_open === true` OR
`moment.cold_open_analysis?.decision === 'apply_cold_open'`.

## Commands

```
pnpm install               # install workspace
pnpm dev                   # boot both apps (web :5173, server :8787)
pnpm test                  # all suites (shared + server + web)
pnpm test:coverage         # all suites with coverage
pnpm build                 # apps/web Vite build
pnpm lint                  # ESLint flat across the workspace
pnpm sonar                 # @sonar/scan CLI (reads .env.local)
pnpm -F @gospelviral/server smoke:api --yes   # hand-driven Anthropic API smoke
pnpm -F @gospelviral/server smoke:cli --yes   # hand-driven CLI smoke
```

`.env.local` (gitignored) holds `SONAR_TOKEN`, `ANTHROPIC_API_KEY`
(deliberately invalid for now), and any port/timeout overrides.

## Conventions

- **PT-BR UI copy** — match the existing voice when adding strings.
- **Typography** — `Instrument Serif` (display/numerals), `IBM Plex Sans` (UI),
  `IBM Plex Mono` (timestamps/codes/tabular). Inline
  `style={{ fontFamily: "'…', sans-serif" }}` is the established pattern
  (Tailwind theme doesn't redefine the font stack).
- **Palette** — stone-* neutrals on `#F5F1EA` paper background;
  accents `#B95D3F` (evangelização), `#3F6BB9` (edificação),
  `#7A6A4F` (híbrido), `#F4C04A` (scripture highlight).
- **Canvas dimensions** in `apps/web/src/styles/globals.css` (`.canvas-9-16`,
  `.video-16-9`, `.canvas-width-only`) — CSS-puro fallback ported verbatim
  from the artifact's inline `<style>` block.
- **Drag handlers** use Pointer Events with `setPointerCapture` and
  `touchAction: 'none'`. `usePointerDrag` is the shared implementation.
- **No PropTypes** — JSDoc typedefs in `@gospelviral/shared/src/types.js`
  are the contract layer (DEC_010); Sonar `javascript:S6774` is project-wide
  silenced.
- **No SSE yet** — `/api/analyze` returns JSON-only (DEC_021). Streaming is
  a ROADMAP item.

## Quality gate

Local `@sonar/scan` (CLI binary `sonar`) is the **only** Quality Gate (zero
CI). The project token lives in `.env.local`; `sonar-project.properties`
is committed. Threshold: Sonar way default plus `javascript:S3776 ≤ 15`
per function. The two persistent `javascript:S1874` warnings on the lucide
`Youtube` icon are an accepted deprecation per DEC_011.

## References

- **Architectural lens** — `01-Systems-Architecture-Expert-viral-cristao.md`
- **Task protocol** — `02 - Task Creation System - Black Box Architecture.md`
- **Migration plan + dual-mode spec** — `claude-code-bootstrap.md`
- **Frozen behavioral SSOT** — `reference/viral-cristao-artifact.jsx`
- **Decisions** — `memory_bank/decisions/` (DEC_001..DEC_029)
- **Roadmap** — `ROADMAP.md`
