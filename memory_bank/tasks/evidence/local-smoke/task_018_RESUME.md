# TASK_018 follow-up — RESUME (read on restart, BEFORE launching agents)

> User paused to shut down the machine. On restart: bring the SUMMARY (this file) first, get the user's confirmation of the 4-agent grouping, THEN launch the agents. Do NOT auto-launch.

## State of the world
- Branch `feature/task-018-play-subtitle-sync`. **PR #7 open, gates green, NOT merged** (Phase-5 human gate). The 6 defects below are a FOLLOW-UP (new task, e.g. TASK_019) — not blockers re-opened on #7 unless the user decides.
- Working tree (uncommitted): `apps/server/src/routes/upload.js` has a TEMPORARY `console.log('[stream-debug] …')` in GET `/:id/stream` — **must be removed before any merge**. Plus untracked evidence files under `memory_bank/tasks/evidence/local-smoke/`.
- Dev server stopped on pause. Upload dir is wiped on each boot — the user must re-upload to test live again. The captured network files below PERSIST on disk (do not depend on the server).

## Evidence files (all on disk, survive reboot)
- `task_018_defects_common_evidence.md` — THE shared brief for the agents (architecture map, TASK_018 subtitle-source change, live findings, per-defect leads, the ⭐ DECISIVE D4 root + D6 data). Agents read this first.
- `task_018_playback_bug.md` — the player/504/stream investigation (currentTime=5305 is CORRECT = real deep moment; playback works; 504 = analyze abort; stream-to-EOF inefficiency).
- `analyze-60-request.network-request` — the REAL transcript (68 KB, video-editor timecode format).
- `analyze-60-response.network-response` — the 5 REAL moments (HH:MM:SS ranges + cold_open peaks).
- `../task_018/` (01-player, 02-playing-cue-synced, 03-edit-cue0) — MCP screenshots.

## Defect inventory (confirmed with the user)
- **D1** [melhoria] videoSource present → preview should always use the uploaded `<video>`, never the YouTube thumbnail (both modes).
- **D2** [bug] no pause — clicking the playing video should toggle pause; today play-only.
- **D3** [bug] subtitle ignores `charsPerScreen` + `lines` (panel is SSOT). Root: TASK_018 removed `chunkText`; cue/fallback text rendered whole.
- **D4** [bug] "Transcript indisponível para esse trecho" on screen. ⭐ ROOT FOUND: real transcript is `HH:MM:SS:FF - HH:MM:SS:FF` + `Unknown` + text (4-part timecode w/ frames, range, speaker line) — the parser expects single-line `MM:SS text` → 4-part rejected → empty cues → indisponível + key_quote fallback (also feeds D3).
- **D5** [bug] font change "not working" — BUT font IS applied+loaded at CSS level (computed `Bebas Neue`, `document.fonts.check` true). Likely perception (overlay covering) or specific case / `@import` ordering. Investigate.
- **D6** [bug/feature] cold open sequence — play the cold-open snippet FIRST, then the full cut in sequence (cut contains the cold open). Data: `cold_open_analysis.peak_moment.timestamp` = range string (e.g. "01:28:43-01:29:00") inside `[timestamp_start,timestamp_end]`, `decision='apply_cold_open'`. Schema friction: peak is a free-form string; top-level `moment.cold_open` undefined.

## Approved-pending grouping → 4 parallel agents (AWAIT user confirm)
- **A — Transcript parser & cue coverage** (D4): shared `transcript-lines.js`/`subtitle-cues.js`/`transcript-extract.js`; support the real timecode format or normalize on ingest. Highest leverage.
- **B — Subtitle render & panel SSOT** (D3 + D5): `SubtitlePreview` buildTextStyle/SubtitleLayer + `subtitleConfig`; re-apply chars/lines to cue text; confirm font.
- **C — Video layer & playback gesture** (D1 + D2): `VideoLayer` thumbnail→`<video>`; `useVideoPlayback` add `pause()`/toggle.
- **D — Cold open playback model** (D6): cold_open schema + multi-segment sequencing in `useVideoPlayback` + subtitle alignment.
Each agent: persona `01-Systems-Architecture-Expert-viral-cristao.md`, code + saved-data only (NO Chrome → no race), output structured insumos (root, black-boxes, proposed interface, risks, tests). NO fixes.

## Next action on restart (exact)
1. Greet + present this SUMMARY (defects + 4-agent grouping + key roots already found).
2. Get user's explicit confirm/adjust of the grouping.
3. Launch the 4 agents in parallel (single message, multiple Agent calls), each pointed at this dir + the persona.
4. Aggregate their outputs into ONE insumos doc → create the follow-up task per `02 - Task Creation System` → Pass 2 decomposition into subtasks.

## Cross-cutting (noted, not in D1–D6 unless promoted by the user)
- 504 on /api/analyze (analyze abort / proxy disconnect; flaky; AUTO == forced-CLI same code path). Fix = SSE/keep-alive (roadmap).
- Stream serves `bytes=START-` to EOF (heavy deep-seek on large files) — TASK_016 territory.
