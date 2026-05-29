# TASK_018 follow-up — COMMON EVIDENCE (shared brief for the investigation agents)

> Read this FIRST. It is the shared architectural map + live findings so each agent does not re-derive the same context. Persona for every agent: `01-Systems-Architecture-Expert-viral-cristao.md`. Do NOT fix code — produce findings/insumos only.

## Environment (live, 2026-05-29)
- Branch `feature/task-018-play-subtitle-sync` (PR #7 open, gates green). Dev running: web :5173, server :8787. Server log: `/tmp/gv-dev.log` (has temporary `[stream-debug]` lines from the stream route).
- The user is testing with a **REAL analysis** (not "Ver exemplo pronto"): a 103-min sermon ("A Pureza do Casamento I 1º Timóteo 3:2"). So the 5 moments have **real HH:MM:SS timestamps deep in the video** (e.g. moment #01 = `01:28:25 → 01:29:13`, 48s), NOT the example's shallow MM:SS.
- A real **video was uploaded** (`videoSource` set, ~1.56 GB, non-faststart/moov-at-end) and an **overlay PNG is active at 100%** opacity.
- Chrome under MCP control IS the same window the user interacts with (shared → races possible; coordinate).

## Architecture map (files + roles)
Subtitle/video/coldopen render path:
- `apps/web/src/components/SubtitlePreview.jsx` — 9:16 canvas. Layers: `VideoLayer` (`<video src=/api/upload/video/:id/stream>` when `videoSource && mode==='player'`, else YouTube `<img>` thumbnail), `OverlayLayer` (z-10 PNG), `SubtitleLayer` (z-20). Play button (z-30) when `!isActivePlayer`. `buildTextStyle(config)` builds the subtitle CSS from `subtitleConfig`. Subtitle text = `cueAt(cues, currentTime)?.text ?? moment.key_quote ?? moment.hook_title`.
- `apps/web/src/hooks/useVideoPlayback.js` — per-card `<video>` lifecycle: play() (gesture, seeks startSec, restart-on-replay), pause reactive, pause@endSec, reset clock on unmount. Callback ref. NO pause-toggle (play only).
- `apps/web/src/lib/cueAt.js` — pure `cueAt(cues, t)` → active SubtitleCue (clamps cue[0]/last; null if no cues).
- `packages/shared/src/subtitle-cues.js` — `buildSubtitleCues(transcript, startTs, endTs)` → cues. Empty when no transcript line falls in `[startSec, endSec)`.
- `packages/shared/src/transcript-lines.js` — `parseTranscriptLines` (handles `MM:SS` and `HH:MM:SS` prefixes), `normalizeCueText`.
- `apps/web/src/lib/transcript-extract.js` — `extractSegmentLines/Text` (Legenda tab). Same parser; empty → MomentCard shows "Transcript indisponível para esse trecho".
- `apps/web/src/components/SubtitleControls.jsx` — panel inputs: `font` (real CSS names: IBM Plex Sans / Inter Tight / Manrope / Bebas Neue / Anton / Archivo Black), `textColor`, `background`, `position`, `size` (S/M/L → 14/17/21px in SubtitlePreview SIZE_MAP), `charsPerScreen` (15–60 slider), `lines` (1/2/3), highlight toggles, x/y.
- `apps/web/src/components/ConfigPanel.jsx` — tabs (Legenda/Vídeo/Overlay/Vídeo Fonte) + RECOLHER/EXPANDIR (collapse = PLAYER mode, open = EDIÇÃO). Tab click forces `isCollapsed=false`.
- `apps/web/src/App.jsx` — SSOT: `subtitleConfig/videoConfig/overlayConfig`, `playingIndex` (one-at-a-time), `mode` derived from `isConfigCollapsed`, `handleCollapseChange` (pause-on-edit chokepoint). `videoSource` session-only.
- `packages/shared/src/types.js` — `SubtitleConfig`, `VideoConfig`, `OverlayConfig`, `Moment` (incl. `cold_open`, `cold_open_analysis.{viability_score, decision:'apply_cold_open'|'keep_linear', peak_moment:{timestamp, why_powerful}}`), `SubtitleCue {text,start,end}`.

## THE pivotal TASK_018 change (root of the subtitle cluster)
Before TASK_018 the preview subtitle was `moment.key_quote` run through `chunkText(text, charsPerScreen, lines)` + a 2.2s rotation (`useChunkRotation`). TASK_018 **removed `chunkText`/`useChunkRotation`** and made the subtitle = the **transcript cue text** (`cueAt(cues, currentTime).text`). Consequence: `charsPerScreen` and `lines` from the panel are **no longer applied to the displayed text** — the whole cue (or whole key_quote fallback) is rendered. `buildTextStyle` still applies font/size/color/background/position.

## Live observations captured (deterministic, this session)
- `cueAt`/playback WORK: `v.play()` → RESOLVED, `paused` true→false, `currentTime` 5305→5306 advancing; server serves 206 with correct Content-Range; `seekable 0-6192`, `readyState 4`.
- `transcriptIndisponivelOnScreen: true` (D4 reproducing now).
- Subtitle rendered text = "Quando você colocou essa aliança no dedo, você fechou o pacto do amor diante de …" — a WHOLE long string, no chars/lines chunking (D3). Since cues are empty (D4), this is the **key_quote fallback shown whole**.
- Subtitle computed style: `fontFamily: "Bebas Neue", sans-serif`, `fontSize: 14px`. `document.fonts.check` → TRUE for IBM Plex Sans / Anton / Bebas Neue / Archivo Black. **So font IS applied + loaded at the CSS level** — D5 "não funciona" is likely perception (overlay covering preview) or a specific case; investigate live.
- Console `@import must precede all other statements` warning in `globals.css` (Google Fonts @import not first) — fonts still resolved as loaded, but worth confirming it doesn't intermittently break loading.

## Per-defect leads (NOT fixes — starting points)
- **D3 (chars/lines ignored):** direct consequence of the chunkText removal. The panel (`subtitleConfig.charsPerScreen/lines`) is the user-declared SSOT for on-screen text shape, but the cue/fallback text bypasses it. Question for the agent: should cue text be re-chunked/wrapped per panel before render, while staying cue-timed?
- **D4 ("Transcript indisponível"):** cues/segmentLines EMPTY for the real moment ranges. WHY empty is the key unknown — needs the **real transcript format vs the HH:MM:SS moment ranges**. Extract live: the `POST /api/analyze` request body (transcript the user sent) + response (real moment timestamps) via Chrome DevTools network panel (`get_network_request`), or read the transcript from app state. Hypothesis: transcript timestamp format/scale doesn't cover the deep HH:MM:SS ranges → `[startSec,endSec)` filter yields nothing.
- **D5 (font change):** font appears applied+loaded at CSS level. Confirm whether the user can SEE it change with the overlay removed; check if a specific font value fails; check the `@import` ordering in `globals.css`.
- **D1 (YouTube cover persists):** `VideoLayer` shows the `<img>` thumbnail whenever `!(videoSource && mode==='player')` — i.e. in EDIÇÃO mode it still shows the YouTube thumbnail even with a video uploaded. Desired: with `videoSource`, always render the `<video>` (paused poster frame) instead of the YouTube cover, in both modes.
- **D2 (no pause):** `SubtitlePreview` shows the play button only when `!isActivePlayer`; while playing there is no affordance to pause (clicking the playing video does nothing). `useVideoPlayback` exposes `play()` but no `pause()`/toggle. Pause currently only happens via mode flip / another card.
- **D6 (cold open sequence):** Desired editing model — play the cold-open snippet FIRST, then play the full cut in sequence (the cut CONTAINS the cold-open window). Example: cut `1:19:50→1:20:50`, cold open `1:20:15→1:20:25` → final = [cold open 1:20:15→1:20:25] + [full cut 1:19:50→1:20:50]. Today playback is single linear `[startSec,endSec]`. Inputs: `moment.cold_open` / `cold_open_analysis` (where is the cold-open window stored? `peak_moment.timestamp` is a single point, not a range — schema gap to flag). Touches `useVideoPlayback` (multi-segment sequence) + the cue/subtitle alignment during the cold-open replay.

## Cross-cutting findings (context, not in the D1–D6 scope unless promoted)
- **504 on `/api/analyze`:** abort path in `routes/analyze.js` (`withTimeout` on `c.req.raw.signal` or 10-min app timeout) → upstream (Vite proxy/browser) drops long-held connection → 504. Flaky; AUTO vs forced-CLI is the SAME code path (no mode bug). Fix = SSE/keep-alive/timeout tuning (roadmap, DEC_021). See sibling file `task_018_playback_bug.md`.
- **Stream-to-EOF inefficiency:** `routes/upload.js` serves `bytes=START-` as `createReadStream(start, end=size-1)` → a deep seek streams hundreds of MB to EOF; browser re-requests. Works but heavy on large files. (TASK_016 territory.)
- **Overlay covers video:** with an opaque overlay PNG, a playing video is largely hidden → can read as "nothing happening". Relevant to D1/D5 perception.

## ⭐ DECISIVE captured data (real analyze run reqid=60, saved to disk)
Files: `analyze-60-request.network-request` (real transcript, 68 KB) + `analyze-60-response.network-response` (5 real moments).

**D4 ROOT FOUND — the real transcript is a video-editor timecode export, NOT `MM:SS text`:**
```
00:00:00:26 - 00:00:17:24      ← HH:MM:SS:FF - HH:MM:SS:FF (FRAMES, 4 parts, a RANGE)
Unknown                         ← speaker label on its own line
Santidade.                      ← spoken text on the following line(s)
```
`parseTimestampPrefix` expects a 2–3 part `MM:SS`/`HH:MM:SS` prefix on a single line. The timecode line has **4 colon-parts → rejected** (`parts.length > 3 → null`); the `Unknown`/text lines carry no timestamp → discarded (no anchor). ⇒ `parseTranscriptLines` returns `[]` ⇒ cues empty ⇒ **"Transcript indisponível" (D4) + key_quote fallback rendered whole (feeds D3)**. The example worked only because it was clean `MM:SS text`. Coverage is NOT the issue (transcript runs to 01:42, covers the moment ranges) — FORMAT is. Follow-up must teach the shared parser this real-world format (4-part timecode with frames, range syntax, speaker line, text on following lines) — or normalize on ingest. This is the single highest-leverage root.

**D6 data — cold-open window IS available:** every moment has `cold_open_analysis.decision === 'apply_cold_open'` and `peak_moment.timestamp` = a **range string** like `"01:28:43-01:29:00"` nested inside `[timestamp_start, timestamp_end]` (e.g. #1 cut `01:28:25→01:29:13`, peak `01:28:43→01:29:00`). Note schema friction: `peak_moment.timestamp` is a free-form "start-end" string (the types.js typedef calls it a single `timestamp`), and top-level `moment.cold_open` is `undefined` (only `cold_open_analysis.decision` is set) — the agent should flag the schema/shape the player needs (a parsed cold-open `{start,end}` range).

Real moment ranges (response): #1 01:28:25→01:29:13 peak 01:28:43-01:29:00 · #2 01:19:11→01:20:00 peak 01:19:35-01:19:55 · #3 01:22:15→01:23:00 peak 01:22:25-01:22:50 · #4 01:32:14→01:32:55 peak 01:32:30-01:32:50 · #5 01:25:42→01:26:41 peak 01:26:00-01:26:20. All `apply_cold_open`.

## Temporary instrumentation to remove before any merge
- `apps/server/src/routes/upload.js`: `console.log('[stream-debug] …')` in GET `/:id/stream`.
