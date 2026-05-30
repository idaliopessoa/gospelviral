# TASK_013: Card Tabs — Redes Sociais / Legenda do Vídeo
timestamp: 2026-05-28T00:00:00Z
version: 1.3
status: Ready
owner: unassigned
confidence: HIGH
phase: 3

## Black Box Interface

### INPUT
- **Required Context**:
  - `bootstrap-features-fases-3-6.md` §"FASE 3 — Abas no card" — product spec (defaults, fixed-top, what goes in each tab)
  - `apps/web/src/components/MomentCard.jsx` — current layout of the right column (hook, scripture, caption, hashtags, CTA, score `<details>`); contract preserved for the fixed-top region
  - `apps/web/src/App.jsx` — owner of `transcript` state; the new prop threading begins here
  - `apps/web/src/views/ResultsView.jsx` — passes per-moment props to `MomentCard`; threads transcript through
  - `packages/shared/src/types.js` — `Moment.timestamp_start`, `Moment.timestamp_end`, `AnalysisRequest.transcript` shape
  - `apps/web/src/lib/helpers.js` — `timestampToSeconds` is the existing parser; reuse, do not duplicate
  - `01-Systems-Architecture-Expert-viral-cristao.md` §"Black Box Interfaces" + §"Single Source of Truth" — transcript stays owned by `App.jsx`; no parallel copies in `MomentCard`
  - `02 - Task Creation System - Black Box Architecture.md` — protocol; especially the P1/P2/P3 prereqs
- **Prerequisites**: TASK_010 (Complete) — frontend is wired to backend, `transcript` already flows through the analyze pipeline; nothing else blocks
- **Parameters**: none

### OUTPUT
- **Deliverables**:
  - `apps/web/src/lib/transcript-extract.js` — exports:
    - `extractSegmentLines(transcript: string, startTs: string, endTs: string): string[]` — primary public surface; returns one normalized entry per matched transcript cue (continuation text already merged into its anchor cue). Used by `MomentCard` to render one `<p>` per cue
    - `extractSegmentText(transcript: string, startTs: string, endTs: string): string` — convenience wrapper around `extractSegmentLines` that joins entries with `' '`. Kept for any future consumer that needs a flat string; not currently used by `MomentCard`
    - Internal `parseTranscriptLines(transcript)`, `parseTimestampPrefix(raw)`, `isDigits(s, min, max)` — **not exported**
  - `apps/web/src/lib/transcript-extract.test.js` — full Vitest suite (cases enumerated in Quality Gates below)
  - `apps/web/src/components/CardTabs.jsx` — new **stateless / fully controlled** component. Receives the active tab + change callback from above; renders the tab buttons and the active tab body declared in the `tabs` array prop
    - Props: `{ activeTab: string, onActiveTabChange: (id: string) => void, tabs: Array<{ id: string, label: string, body: import('react').ReactNode }> }`
    - **Rationale for `tabs` array (not `children` map)** — see DEC under "Decisions Generated" below. Labels travel with data, no compound-component magic, generic enough to be reused beyond `MomentCard`
    - **No internal `useState`** — `activeTab` is owned by `App.jsx` and threaded down. Same control pattern used by `ConfigPanel` for `activeTab` (config tabs) and `isCollapsed`
  - `apps/web/src/components/MomentCard.jsx` updated:
    - Right column reorganized: fixed top (Hook + ScriptureBox) → `<CardTabs>` (caption + hashtags + CTA grouped in "Redes Sociais"; transcript-extracted text in "Legenda do Vídeo") → `<details>` score breakdown stays below tabs (outside)
    - New props: `transcript: string`, `activeCardTab: 'redes-sociais' | 'legenda-video'`, `onActiveCardTabChange: (tab) => void`
    - Helper consumed: `extractSegmentLines(transcript, moment.timestamp_start, moment.timestamp_end)` computed inline in the "Legenda do Vídeo" tab body (memoized via `useMemo` keyed on the three inputs). Memoization gates the helper call so re-renders driven by other prop changes do not re-slice. Each returned line is rendered as its own `<p>` (one paragraph per cue, mirroring the timecode source structure)
    - `CopyButton` at the top of "Legenda do Vídeo" tab copies the lines joined with `'\n'` (preserves the per-line structure when pasted elsewhere)
  - `apps/web/src/views/ResultsView.jsx` updated: accepts `transcript`, `activeCardTab`, `setActiveCardTab` props; passes them to each `MomentCard` (same shape used for `activeTab` of `ConfigPanel`)
  - `apps/web/src/App.jsx` updated:
    - New state: `const [activeCardTab, setActiveCardTab] = useState('redes-sociais')`
    - Passes `transcript`, `activeCardTab`, `setActiveCardTab` to `ResultsView`
    - **Persistence**: `activeCardTab` is **session-only** for now — NOT added to `loadVisualPresets / saveVisualPresets`. Persisting it would bump the localStorage `schemaVersion` (v1 → v2) and trigger a one-shot migration; that schema bump is **deferred to a follow-up task** to keep TASK_013 scoped to the UI change. Documented as a known follow-up below
  - Vitest suites updated:
    - `MomentCard.test.jsx` — asserts fixed-top region renders unchanged; asserts the body matches the `activeCardTab` prop (`'redes-sociais'` → caption + hashtags + CTA; `'legenda-video'` → extracted text + copy button); asserts clicking a tab button invokes `onActiveCardTabChange` with the right value; asserts score `<details>` is outside tabs
    - `CardTabs.test.jsx` — new — asserts controlled behavior: renders body for the passed `activeTab` prop, clicking a tab button calls `onActiveTabChange(nextTab)`, no internal state mutation occurs; asserts ARIA roles (`role="tablist"`, `role="tab"`, `role="tabpanel"`, `aria-selected`)
    - `App.test.jsx` / `ResultsView.test.jsx` (if not present, add the integration case): a single click on tab "Legenda do Vídeo" in card #1 switches **all five cards** to that tab — proves the global lift
- **Artifacts**:
  - SonarCloud Quality Gate = PASS; `javascript:S3776 = 0` on `transcript-extract.js`, `CardTabs.jsx`, and the touched parts of `MomentCard.jsx`
  - Coverage on `transcript-extract.js` = 100% (pure function); coverage on `CardTabs.jsx` ≥ 90%
- **Decisions Generated**:
  - **DEC: Legenda do Vídeo renders one paragraph per transcript cue (line-per-cue), not a joined paragraph.** User feedback during the SUBTASK_013.5 browser smoke asked for the legenda to mirror the timecode source structure — one cue per visual line. The helper grew a `extractSegmentLines: (...)=>string[]` primary export; the existing `extractSegmentText` becomes a thin wrapper that joins with `' '` and is kept for any future consumer that needs a flat string. `MomentCard.LegendaVideoTabBody` maps the lines to `<p>` elements; `CopyButton.text` joins the lines with `'\n'` so paste preserves structure. The behavior change is additive (new export, alternative render path) and pinned by a new test in `MomentCard.test.jsx` asserting `paragraphs.length > 1` in the legenda body.
  - **DEC: `CardTabs` accepts a `tabs: Array<{id, label, body}>` prop instead of a `children` map.** Pass 1 OUTPUT (v1.0) declared a `children: { id: ReactNode }` shape. Pass 2 plan review proposed and the human approved the array-prop shape on the grounds that (a) children-as-object is non-idiomatic React, (b) labels co-locate with data, (c) the component stays generic enough to host more than two tabs without renaming the slot keys. Recorded here so the black-box auditor and future maintainers see the chosen contract verbatim. The behavioral contract (stateless, controlled, ARIA roles, no internal state, called only by `MomentCard` for now) is unchanged.
  - **DEC: Transcript extraction is deterministic, hand-parsed (no regex on the hot path), frontend-only.** Originally a single regex `^(\d{1,2}:)?…\s+(.*)$` parsed each line. SonarCloud (`javascript:S5852`, ReDoS vulnerability hotspot, MEDIUM probability) flagged it. Bounded quantifiers actually made the regex safe, but the false positive blocked the Quality Gate on `new_security_hotspots_reviewed`. Refactored to `indexOf` + `split(':')` + `charCode` digit check. Zero regex on the hot path; observable behavior unchanged; 16 extract tests stay green.
  - **DEC (promotion clause): if FASE 6 (or any second consumer — server-side prompt cleaning, export pipeline, etc.) needs the same extractor, the file MIGRATES to `packages/shared` rather than being duplicated.** Single SSOT for transcript slicing. The migration is mechanical (move file, update imports, add to shared's barrel) and must NOT fork the implementation. Recorded here so future-self knows the helper has a planned promotion path; no action now.
  - **DEC: Tab state (`activeCardTab`) is GLOBAL, owned by `App.jsx`, threaded down via props.** Rationale: the active card tab is a visualization preference of the same nature as `subtitleConfig`, `videoConfig`, `overlayConfig`, and `isConfigCollapsed` — one change applies to all 5 cards. Real workflow toggles "copy texts" vs "review speech" across all cards together; per-card local state would cost 5 clicks per toggle and break coherence with the existing global-config pattern. `CardTabs` is stateless / fully controlled to enforce this.
  - **DEC: `activeCardTab` is session-only for now; persistence is a follow-up.** Adding it to `loadVisualPresets / saveVisualPresets` would bump `localStorage` `schemaVersion` from v1 to v2 (with a one-shot migration that drops unknown payloads). That migration is doable but out of scope for TASK_013. Tracked in "Known follow-ups" below.
  - **DEC: "Redes Sociais" is the default tab.** Confirms the bootstrap; recorded so future redesigns don't silently flip the default.
  - **DEC: Score breakdown `<details>` stays outside the tabs, below them.** It is diagnostic metadata, not postable text. Keeps Sonar surface and behavior unchanged.
  - **DEC: Optional "limpar" regex button on Legenda do Vídeo is deferred to ROADMAP.** Out of scope for TASK_013.
  - **DEC: Granularity of segment extraction = per-line (the transcript's smallest unit).** No sub-line slicing; if a line's timestamp falls inside the moment range, the whole line text is included. Edge handling: a line whose timestamp is **before** `start` but is the **closest preceding** line is **excluded** (we trust the moment's `timestamp_start` as the cut point).

### INVARIANTS
- **Must Maintain**:
  - `reference/viral-cristao-artifact.jsx` remains **frozen** — never read, never modified
  - The fixed-top region of `MomentCard` (header with rank/badges/score, hook, scripture) is **visually and behaviorally identical** to the pre-task version (no font/spacing/color changes; tests pin this)
  - `MomentCard` props contract: **adding** `transcript`, `activeCardTab`, `onActiveCardTabChange` is allowed; **renaming or removing** any existing prop is not — downstream tests assert the current props still work
  - `App.jsx` remains the **single owner** of `transcript` and the **new single owner** of `activeCardTab`. `MomentCard` and `CardTabs` consume via props, never read from a global, never cache, never mutate
  - `CardTabs` MUST be stateless (no `useState`, no `useReducer` for the active tab) — controlled by the `activeTab` prop. Sonar smell `react/no-unstable-nested-components` and React's controlled-component contract apply
  - `extractSegmentText` is **pure** — same inputs always produce the same output; no DOM, no fetch, no `Date.now`, no randomness
  - PT-BR UI copy preserved: tab labels are exactly `Redes Sociais` and `Legenda do Vídeo`
  - Typography unchanged: tab buttons use `'IBM Plex Sans', sans-serif`; legenda body uses `'IBM Plex Sans', sans-serif` matching the caption block; copy buttons use the existing `CopyButton`
  - Cognitive Complexity ≤ 15 per function (`javascript:S3776`)
  - Zero regressions across `pnpm test` (web + server + shared)
- **Quality Gates**:
  - `extractSegmentText` specs cover, at minimum:
    1. Happy path: `MM:SS` lines, range fully inside transcript → returns concatenated text with timecodes stripped
    2. `HH:MM:SS` lines mixed with `MM:SS` lines → both parsed correctly
    3. `start` before the first timestamp → returns from the first line
    4. `end` after the last timestamp → returns through the last line
    5. `start === end` → returns empty string
    6. `end < start` → returns empty string (no throw)
    7. Empty transcript → returns empty string
    8. Transcript with no timestamps at all → returns empty string (graceful; do not throw — server-side validation already rejects this case before it reaches the UI)
    9. Lines without a leading timestamp (continuation lines from a wrapped paragraph) → attach to the previous timestamped line; included/excluded with that line
    10. Internal whitespace normalization: multiple spaces collapse to one in the joined output; leading/trailing whitespace trimmed
  - `CardTabs` specs cover: renders the body that matches the passed `activeTab` prop; clicking a tab button invokes `onActiveTabChange(nextTab)`; `aria-selected` reflects the controlled value; `role="tablist"` / `role="tab"` / `role="tabpanel"` present
  - `MomentCard` specs cover: hook + scripture render above tabs; the body matches `activeCardTab` prop; "Redes Sociais" body contains caption + hashtags + CTA; "Legenda do Vídeo" body contains the extracted text and a copy button; score `<details>` renders below tabs and is still collapsible
  - **Integration spec (App or ResultsView level)**: rendering with 5 moments, default `activeCardTab='redes-sociais'`, all 5 cards show the "Redes Sociais" body; clicking the "Legenda do Vídeo" tab on card #1 flips **all 5** cards to that tab — proves the global lift
  - Manual browser smoke via Chrome DevTools MCP: navigate to `/`, run example analysis, click tab on card #1, screenshot that all 5 cards switched together, list_console_messages = no errors

## Task Definition
Split the long-text region of each `MomentCard` into two tabs — "Redes Sociais" (caption + hashtags + CTA, default) and "Legenda do Vídeo" (transcript text sliced to the moment's range, no timecodes) — by adding a small deterministic extraction helper, a generic `CardTabs` component, and minimal prop threading so `transcript` reaches each card. The fixed-top metadata of the card (rank, badges, hook, scripture, viral score) and the diagnostic score `<details>` at the bottom are untouched.

## Success Criteria
1. Loading the example response shows each `MomentCard` with two tabs visible; "Redes Sociais" is selected by default
2. Switching to "Legenda do Vídeo" displays the transcript text between `timestamp_start` and `timestamp_end`, with timecodes stripped, on at least one card
3. The fixed top of each card (rank, badges, hook, scripture, viral score) renders identically to the pre-task state (pinned by test)
4. The score `<details>` below the tabs remains collapsible and renders the same content as before
5. A "Copiar" button on the Legenda do Vídeo tab copies the extracted text
6. `pnpm lint` = 0; `pnpm test` green; SonarCloud Quality Gate = PASS; `javascript:S3776 = 0` on new files
7. Chrome DevTools MCP screenshot captured for both tab states on at least two cards; `list_console_messages` shows no errors

## Risk Assessment
| Risk | Level | Mitigation | Detection |
|---|---|---|---|
| Transcript granularity is per-line, not per-phrase or per-word — some users expect cleaner cuts | LOW | DEC records the choice; "limpar" follow-up in ROADMAP can refine later | Visual inspection on the example transcript |
| Lines without a timestamp (continuation lines) misattributed | LOW | Test case #9 pins the "attach to previous" behavior | Unit test |
| Score `<details>` placement breaks copy-paste UX flow | LOW | DEC records "stays outside tabs"; if user feedback says otherwise, easy reverse | Manual review |
| Prop threading drift: future task forgets to pass `transcript` and Legenda do Vídeo silently shows empty | MEDIUM | `MomentCard` PropTypes are not enforced (project policy DEC_010 — JSDoc only); compensate by adding a `MomentCard.test.jsx` case that renders without `transcript` and asserts a visible fallback "Transcript indisponível" (no crash) | Unit test pins the fallback |
| Global tab state forgets to propagate to all 5 cards (e.g., a future refactor accidentally re-introduces internal state in `CardTabs`) | MEDIUM | Integration spec asserts that clicking on card #1 flips all 5 cards; ESLint forbids `useState` inside `CardTabs.jsx` is overkill — rely on the integration spec | Integration test |
| `activeCardTab` not persisted → user reloads and loses tab choice | LOW | Documented follow-up; schema bump v1→v2 in a separate task; UX cost is one click after reload | User feedback |
| Sonar `javascript:S3776` exceeded on `extractSegmentText` due to edge-case branches | MEDIUM | Plan to factor into two helpers: `parseTranscriptLines` (line → `{ ts, text }`) and `extractSegmentText` (filter + join). Each stays ≤ 15 CC | Local `pnpm sonar` before PR |

## Implementation Strategy
1. **Write tests first (TDD, AAA)** — `transcript-extract.test.js` covering the 10 cases enumerated above; `CardTabs.test.jsx` covering controlled-component cases; `MomentCard.test.jsx` updates pinning fixed-top + tab-body-matches-prop + score-below; integration spec (App or ResultsView) pinning global lift
2. Implement `transcript-extract.js` with two internal functions (`parseTranscriptLines`, `extractSegmentText`); export only `extractSegmentText`
3. Implement `CardTabs.jsx` as a generic slot-based **stateless / controlled** component (no `useState`, no Moment-specific knowledge inside)
4. Refactor `MomentCard.jsx`:
   - Lift the right-column content into two grouping fragments
   - Insert `<CardTabs activeTab={activeCardTab} onActiveTabChange={onActiveCardTabChange}>` between scripture and score `<details>`
   - Accept `transcript`, `activeCardTab`, `onActiveCardTabChange` props; compute `extractSegmentText` via `useMemo`; pass into the Legenda tab body
5. Thread `transcript`, `activeCardTab`, `setActiveCardTab` through `App.jsx` → `ResultsView.jsx` → `MomentCard.jsx`. Add `const [activeCardTab, setActiveCardTab] = useState('redes-sociais')` to `App.jsx`
6. Run `pnpm lint && pnpm test` until green (including the new integration spec)
7. Manual browser smoke via Chrome DevTools MCP: navigate, click tab on card #1, screenshot showing all 5 cards switched, capture console + network
8. Run `pnpm sonar` → Quality Gate must be PASS; `javascript:S3776 = 0` on new code
9. Open PR targeting `develop` with the SonarCloud block

## Known follow-ups (NOT in scope of TASK_013)
- **`activeCardTab` persistence** — bump `localStorage` `schemaVersion` v1 → v2; add `activeCardTab` to the persisted payload; one-shot migration drops v1 payloads (existing pattern in `persistence.js`). Small follow-up task; deferred to keep TASK_013 scoped to the UI change.
- **"Limpar" regex button on Legenda do Vídeo** — frontend-only, no IA; normalize whitespace / strip filler. Recorded in `ROADMAP.md` (Phase 3 follow-ups).
- **Helper promotion to `@gospelviral/shared`** — triggered when FASE 6 (or any second consumer) needs the same extractor; move + update imports, do NOT duplicate.

## Prerequisite Subtasks (MANDATORY)

### SUBTASK_013.P1: GitFlow Workflow
**Status**: ⏱️ Not Started
- Create feature branch from `develop`: `feature/task-013-card-tabs`
- Conventional commits scoped `(card)` or `(transcript)`:
  - `feat(transcript): extractSegmentText helper`
  - `feat(card): tabs Redes Sociais / Legenda do Vídeo`
  - `test(card): pin fixed-top region and tab switch`
- PR targets `develop`; trailer `Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>`
- Source branch deleted after merge

### SUBTASK_013.P2: Tests Workflow
**Status**: ⏱️ Not Started
- TDD Red→Green→Refactor for the helper and the new component
- AAA pattern in every test (`// Arrange / // Act / // Assert`)
- 100% coverage on `transcript-extract.js` (pure module); ≥ 90% on `CardTabs.jsx`
- Zero regressions on existing `MomentCard.test.jsx`, `useAnalyze.test.js`, the full web suite, and server + shared suites
- Cognitive Complexity ≤ 15 per function on touched files (`javascript:S3776`)

### SUBTASK_013.P3: Task Finalization
**Status**: ⏱️ Not Started
- `pnpm lint` = 0
- `pnpm test --coverage` green; coverage non-decreasing
- `pnpm sonar` (the `@sonar/scan` CLI; reads `.env.local`) → Quality Gate = PASS; `javascript:S3776 = 0` on new code
- Chrome DevTools MCP smoke:
  - `navigate_page` to `http://localhost:5173`
  - Run example analysis (or load fixture)
  - `take_screenshot` for: card 1 default tab, card 1 Legenda do Vídeo tab, card 2 default tab
  - `list_console_messages` → no errors
  - `list_network_requests` → only expected `/api/runtime/detect` + (if analysis run) `/api/analyze`
- Save evidence to `memory_bank/tasks/evidence/task_013/`
- Conventional commit on feature branch with `Co-Authored-By` trailer
- PR description includes the SonarCloud block (timestamp, commit SHA, branch, PASS/FAIL, coverage, dart:S3776 = 0 — note: this project uses `javascript:S3776`, paste with that key)
- On-screen execution summary displayed (no document)
- Black-box auditor subagent invoked on this task file + produced artifacts before merge; gaps fixed in the same branch until zero

## Subtasks
*(Pass 2 will decompose into ordered subtasks. Expected shape:*
- *SUBTASK_013.1 — `transcript-extract.js` helper + 10-case test suite (pure, no React)*
- *SUBTASK_013.2 — `CardTabs.jsx` stateless controlled component + tests*
- *SUBTASK_013.3 — `MomentCard.jsx` refactor: fixed-top + `<CardTabs>` + score-below; transcript prop; `useMemo` extraction; updated tests*
- *SUBTASK_013.4 — Prop threading `App.jsx` → `ResultsView.jsx` → `MomentCard.jsx`: new `activeCardTab` state in App, `transcript` plus `activeCardTab` + `setActiveCardTab` passed through; integration spec asserting global lift*
- *SUBTASK_013.5 — Browser smoke (Chrome DevTools MCP) + `pnpm sonar` + PR composition.)*
