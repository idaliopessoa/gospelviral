# TASK_019 — Chrome DevTools MCP smoke (D1–D6 + O2)

**When:** 2026-05-29 · **Build:** branch `feature/task-019-player-subtitle-fixes`
**App:** `pnpm dev` (web :5173 + server :8787), real browser via Chrome DevTools MCP.
**Video:** the REAL sermon upload — `A Pureza do Casamento … 1º Timóteo 3:2.mp4`
(`video-el.duration = 6192.46s ≈ 103 min`, covers every moment range), streamed
through the live `/api/upload/video/:id/stream` route. Results = "Ver exemplo
pronto" (moment #1 is `apply_cold_open`, peak `01:08–01:25` = 68–85s, cut
`01:08–02:15` = 68–135s — exercises the cold-open sequence end to end).

Screenshots in this folder: `D1-video-in-edit-mode.png`,
`D1-real-video-edit-mode.png`, `D5-font-changed-anton.png`,
`D2-D6-player-mode.png`.

## Results

| # | Defect | In-browser observation | Verdict |
|---|---|---|---|
| **D1** | Uploaded video is the canvas source in BOTH modes | EDIÇÃO (panel open): `video-el` count = **5**, `img[src*=img.youtube.com]` = **0**, poster seeked to startSec (`currentTime = 68`). Same in PLAYER. | ✅ |
| **D2** | Pause/resume in place | Play → `pause-button` shown (1), `play-button` hidden while playing; reaching the cut end → paused + `play-button` reappears (5). | ✅ |
| **D3** | Subtitle respects the panel shape | Chunk index DERIVED from currentTime on ONE cue: `t=68 → "E eu fiz uma oração"` (chunk[0]) vs `t=82 → "saber agora."` (later chunk). `<span>` `max-width = min(92%, 20ch)` — the hard cap is driven by `charsPerScreen`. | ✅ |
| **D4** | Cues populate (no "Transcript indisponível") | "LEGENDA DO VÍDEO" tab lists per-cue spoken lines on every card; zero "indisponível". (Real editor-timecode `HH:MM:SS:FF` format is unit-tested against the exact analyze-60 fixture — clean MM:SS path shown here in-browser.) | ✅ |
| **D5** | Font change visible | FONTE `Bebas Neue → Anton` flipped the rendered subtitle `font-family` from `"Bebas Neue", sans-serif` → `Anton, sans-serif`. Custom fonts load via the `index.html <link>` (the prod-build `<link>` survival is asserted by `build-fonts.test.js`). | ✅ |
| **D6** | Cold-open plays peak then full cut | Fresh play → `currentTime ≈ 68.4` (peak start). Boundary at peak end (set 90) → hook bounced back to **cut start 68.1** (peak replays in context). Cut end (135) → **paused, no further bounce** (onReachEnd fires only at the LAST segment). | ✅ |
| **O2** | Open-ended range capped | **23** `GET …/stream` responses, **all `206`** (bounded chunks; browser re-requests as it plays/seeks). **Zero** `200` full-to-EOF streams. No errors. | ✅ |

## Console
No `error`/`warn` output. Only dev-mode `[debug] [vite] connected` + the React
DevTools `[info]` hint, plus two pre-existing form-a11y *issues* ("no label /
no id on a form field") that are roadmap-tracked (DEC_011) and Sonar-ignored —
not TASK_019 regressions.

## Notes
- Chrome under MCP backgrounds **audible** media (the tab isn't OS-foreground),
  so continuous playback self-pauses. D2/D6 were therefore verified
  deterministically: a muted `play()` (muted autoplay is permitted) resets the
  segment index, and the segment-advance fires on the `timeupdate` a seek also
  emits — giving the exact peak→cut→end transition above.
- The video was streamed live via the O2-capped route; the 206-only request log
  is direct evidence the stream-to-EOF inefficiency is gone.
