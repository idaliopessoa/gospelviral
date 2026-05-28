# TASK_004 — Visual parity evidence

Date: 2026-05-28
Branch: feature/task-004-app-composition
Reviewer: Claude Opus 4.7 (1M context) — pending human side-by-side sign-off

## Screenshots (Chrome DevTools MCP)

- `01-input-view.png` — initial `input` view, `http://localhost:5173/`
- `02-results-view.png` — `results` view after clicking **Ver exemplo pronto**

## Textual checklist (artifact → ported app)

| Aspect | Artifact | Ported app | Match |
|---|---|---|---|
| Page bg | `#F5F1EA` paper | `#F5F1EA` paper (App.jsx inline + globals.css body) | ✓ |
| Display font | Instrument Serif on H1/H2 | Instrument Serif (inline `style={{ fontFamily: "'Instrument Serif', serif" }}`) | ✓ |
| Body font | IBM Plex Sans | IBM Plex Sans (globals.css `:root` + body, inline overrides) | ✓ |
| Mono font | IBM Plex Mono on inputs, timestamps, tab numerals | IBM Plex Mono inline on the same surfaces | ✓ |
| Header copy | "Momentos Virais · cristão" + "Análise de pregações para Reels & Shorts" | identical | ✓ |
| Input view H1 | "Cole o vídeo e a *transcrição*." | identical | ✓ |
| Step label | "PASSO 1 — INSIRA O MATERIAL" (uppercase, tracking 0.3em) | identical | ✓ |
| Buttons | "Analisar momentos virais" (primary, stone-900) + "Ver exemplo pronto →" (border) | identical | ✓ |
| Disabled state | Primary CTA disabled when url/transcript empty | confirmed via snapshot uid=1_18 `disabled` | ✓ |
| YouTube validation hint | Green check + monospace `video_id: <id>` when valid URL | preserved in InputView.jsx | ✓ |
| Loading messages | 5-message rotation @ 3500ms | `LOADING_MESSAGES` const + `useLoadingRotation` hook | ✓ |
| Results header | "Resultado da análise" / "Top 5 momentos · *<topic>*" | identical | ✓ |
| Five moment cards | 5 articles, all hooks rendered, ranks 1..5 | confirmed via `document.querySelectorAll('article').length === 5` | ✓ |
| Canvas | `.canvas-9-16` class loaded (280×498 mobile / 340×604 desktop) | confirmed via DOM probe `canvasPresent: true` | ✓ |
| ConfigPanel sticky | sticky top-0 z-50 with 3 tabs (Legenda/Vídeo/Overlay) | preserved in ConfigPanel.jsx | ✓ |
| "Nova análise" back button | Visible only on results view | `showBack={view === 'results'}` in App.jsx Header | ✓ |
| Footer | "PROTÓTIPO · BUILT WITH CLAUDE" tracking 0.2em | identical | ✓ |

## Console transcript (Chrome DevTools MCP)

Both views: zero errors. Only Vite dev pings + React DevTools info + the two
documented accessibility warnings (`[issue] No label associated with a form
field` × 2/12 and `[issue] A form field element should have an id or name
attribute` × 2/7), both ignored per **DEC_011** (label accessibility roadmap
item — full a11y pass scheduled after TASK_012).

## Network transcript

42 requests on the input view, all 200. After the favicon fix in
`index.html`, no 404s remain. Reaching `results` after clicking the example
button triggers only React-render activity — no outbound API calls (the
example path bypasses `lib/api.js` per artifact behavior).

## Known caveats (not regressions)

- `localStorage` persistence of configs is **not** wired in TASK_004; reload
  resets to defaults. Wired in TASK_011.
- The placeholder `analyzeMoments` in `lib/api.js` throws
  `"backend not wired yet — TASK_010"` for any input that is not the example
  fixture. The full transport lands in TASK_010.
- Label-control association warnings logged by Chrome (12 + 7 on results
  view) are tracked under **DEC_011** and silenced in Sonar
  (`javascript:S6853`).

## Sign-off

- Automated checks: lint 0 / 93 specs green / build 1.93s.
- Visual parity: requires a human side-by-side comparison against the
  artifact running in its host (the Block 1 gate per the goal). Pending.
