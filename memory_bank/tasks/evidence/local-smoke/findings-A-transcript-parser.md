# Findings A — Transcript parser & cue coverage (D4)

> Persona: Systems Architecture Expert (black-box / SSOT / primitive-first lens).
> READ-ONLY investigation. INSUMOS for a follow-up implementation task. No source edited.
> Decisive data: `analyze-60-request.network-request` (real 68 KB transcript) + `analyze-60-response.network-response` (5 real moments).

---

## Confirmed root

**The real transcript is a video-editor timecode export (`HH:MM:SS:FF - HH:MM:SS:FF`, 30 fps), NOT `MM:SS text` on one line. The strict prefix parser rejects every timecode line, so `parseTranscriptLines` returns `[]` → cues empty → D4 + key_quote fallback.**

Mechanical proof (`packages/shared/src/transcript-lines.js`):

- `parseTimestampPrefix(raw)` (lines 26–43): for `"01:28:25:10 - 01:28:59:13"`, `raw.indexOf(' ')` = 11 → `head = "01:28:25:10"` → `head.split(':')` = `["01","28","25","10"]` → **`parts.length === 4`** → line 31 `if (parts.length < 2 || parts.length > 3) return null;` → **rejected**. Verified by replicating the function against the live data.
- The following two lines in each block — `"Unknown"` (speaker) and the spoken-text line — also `return null` (no space-delimited numeric head). In `parseTranscriptLines` (lines 53–67) they reach line 62 `if (out.length === 0) continue;` → discarded (no anchor was ever pushed).
- Net: `parseTranscriptLines(realTranscript)` = `[]`.

Downstream collapse (both web consumers, per-moment in `MomentCard.jsx:357–364`):
- `buildSubtitleCues` (`subtitle-cues.js:37`) maps over `parseTranscriptLines(...) = []` → `[]` → `SubtitlePreview.jsx:200–201` `cueAt([], t)` → `null` → `subtitleText = moment.key_quote` (whole string, no chunking → **feeds D3**).
- `extractSegmentLines` (`transcript-extract.js:23`) → `parseTranscriptLines(...) = []` → guard line 24 returns `[]` → MomentCard Legenda tab shows **"Transcript indisponível para esse trecho"** (D4 user-visible string).

**Coverage is NOT the issue — FORMAT is.** Re-parsed under correct `HH:MM:SS` interpretation (frames dropped), every moment range contains 1–3 transcript block starts (proof, response ranges in absolute seconds):
- #1 `[5305,5353)` → starts {5305, 5339}
- #2 `[4751,4800)` → starts {4751, 4784}
- #3 `[4935,4980)` → starts {4935, 4972}
- #4 `[5534,5575)` → starts {5552}
- #5 `[5142,5201)` → starts {5142, 5172, 5179}

So a format-aware parse yields non-empty cues for all 5 moments. The example fixture worked only because it is clean `MM:SS text`.

**Why it slipped past validation:** `apps/server/src/lib/validation.js:3` `TIMESTAMP_RE = /\d{1,2}:\d{2}/` matches the `"01:28"` substring inside `"01:28:25:10"`, so `transcript_missing_timestamps` passes. The lenient ingest gate and the strict parser disagree — the transcript is accepted but produces zero cues. (Same lenient regex duplicated in `apps/web/src/hooks/useAnalyze.js:10`.)

---

## Format spec (every quirk observed in the real 68 KB transcript, 1145 lines, 286 blocks)

Per-block structure, repeated verbatim 286 times, each block separated by one blank line:
```
00:00:00:26 - 00:00:17:24      ← line 1: timecode RANGE
Unknown                         ← line 2: speaker label (own line)
Santidade.                      ← line 3: spoken text (own line)
                                ← line 4: blank separator
```
Quirks, each verified by char-scan over the live file:

1. **Timecode is a RANGE, not a point**: `START - END`, separator is exactly `" - "` (space-hyphen-space). 286/286 lines match the strict shape `^\d{2}:\d{2}:\d{2}:\d{2} - \d{2}:\d{2}:\d{2}:\d{2}$` — **zero** non-standard timecode lines.
2. **4 colon-parts = HH:MM:SS:FF** (the 4th field is FRAMES, not centiseconds). Max frame field observed = **29** ⇒ 30 fps base. Frames must be **dropped** (or rounded to seconds) — the TIME REFERENCE invariant is whole-second absolute on the file timeline.
3. **Zero-padded two-digit fields throughout** (`00:00:00:26`), unlike the lenient 1–2 digit `MM:SS`.
4. **Speaker label on its own line**: only value present is `"Unknown"` (286/286). Treat as a generic speaker-label line to skip (do not hardcode the literal "Unknown" — a different export could emit a real name).
5. **Spoken text on the line(s) after the speaker**: in THIS file every block has **exactly one** text line (0 blocks with >1 text line). The follow-up should still tolerate ≥1 text line before the blank separator (continuation-merge), since other exports wrap long captions.
6. **Blank line between blocks** (and a trailing blank-blank at EOF, lines 1143–1144).
7. **Trailing `"Clique aqui."`** is the final spoken text (line 1142) — a YouTube end-card artifact baked into the transcript text. It is the text of the last real block (`01:42:41:27 - 01:42:42:19`), not a stray line; it is far outside all moment ranges, so it is harmless here but should NOT be special-cased away (it's just text).
8. The **START** of each range is the anchor (matches current single-timestamp semantics). The END field is available and could later tighten `cue.end`, but is NOT needed for the additive fix (current tiling uses next-cue-start / segment endSec).

The transcript runs to `01:42:42` (~6162 s), comfortably covering all moment ranges (deepest end `01:32:55` = 5575 s).

---

## Affected black-boxes (per architecture boundary table)

| Black box | File | Current contract | Impact of D4 fix |
|---|---|---|---|
| `parseTranscriptLines` | `packages/shared/src/transcript-lines.js` | `(transcript) → {tsSec, text}[]` | **Primary candidate** for the change (single parser; SSOT for "raw transcript → timed lines"). Must stay additive: existing `MM:SS`/`HH:MM:SS` behavior frozen. |
| `parseTimestampPrefix` (internal) | same file | strict 2–3 part head | Must learn the 4-part `HH:MM:SS:FF` head + ` - END` range, drop frames. Or stay frozen and a normalizer feeds it `HH:MM:SS text`. |
| `buildSubtitleCues` | `packages/shared/src/subtitle-cues.js` | `(transcript, startTs, endTs) → SubtitleCue[]` | **Unchanged** if the parser/normalizer is fixed — it consumes `parseTranscriptLines` output. Cues become non-empty automatically. |
| `extractSegmentLines/Text` | `apps/web/src/lib/transcript-extract.js` | `(transcript, startTs, endTs) → string[]/string` | **Unchanged** for the same reason — fixed once at the shared parser. Legenda tab + D4 string both clear. |
| `validateAnalyzeBody` | `apps/server/src/lib/validation.js` | rejects no-timestamp bodies | Lenient regex already passes this format (no change required); optional note below. |
| `App` transcript SSOT | `apps/web/src/App.jsx:64` | `useState('')`, prop-drilled to `MomentCard` (`transcript=`) | If normalization is chosen at the web boundary, this is the single chokepoint to normalize once before passing down. |
| `timestampToSeconds` | `packages/shared/src/time.js` | `("MM:SS"/"HH:MM:SS") → sec` | **Frozen / untouched.** Moment ranges are still `HH:MM:SS`. Frames never reach it. |

Key architectural fact: **there is exactly ONE parser** (`parseTranscriptLines`), shared by both the cue builder and the web segment extractor (consolidated in TASK_017). Fixing the parser fixes BOTH consumers in one place — strong SSOT pull toward option (a).

---

## Proposed interface (INPUT → OUTPUT, additive, where normalization lives + WHY)

**Recommendation: extend the shared parser with format auto-detection at the line level (option a), keeping a single primitive. Do NOT add a separate normalization boundary, and do NOT invent a new primitive.**

### INPUT → OUTPUT (contract is UNCHANGED at the public surface)
```
parseTranscriptLines(transcript: string)
  → { tsSec: number, text: string }[]      // tsSec = whole seconds ABSOLUTE; [] on degenerate input
```
The public signature does not change. The internal prefix parser gains a second recognized shape:

```
parseTimestampPrefix(raw) recognizes, IN ORDER:
  (existing) "<H?H:MM:SS|MM:SS> <text>"          → { tsSec, text }   [FROZEN]
  (new)      "<HH:MM:SS:FF> - <HH:MM:SS:FF>"      → { tsSec, text: '' }  (anchor only; frames dropped, START used)
                                                     text comes from the following non-anchor lines
                                                     (existing continuation-merge handles speaker + text lines)
```

### Why the parser (option a) over a normalization boundary (option b)
1. **SSOT / single home.** `parseTranscriptLines` is already the one authoritative "raw transcript → timed lines" module (TASK_017 consolidation). Adding a normalizer elsewhere creates a *second* place that understands transcript formats → parallel truth, the exact red flag in the lens. Both consumers (`buildSubtitleCues`, `extractSegmentLines`) inherit the fix for free.
2. **Black-box stability.** The interface (`string → {tsSec,text}[]`) survives unchanged; only the implementation (HOW it recognizes a line) grows. Future formats (SRT, WebVTT) are then *also* a parser-internal concern, exactly where format knowledge belongs.
3. **No new primitive.** A `SubtitleCue` is built by `buildSubtitleCues`; `{tsSec,text}` is the intermediate. The editor export is a *variant input format*, not a new primitive — inventing one would violate primitive-first.
4. **Frames-drop lives next to the seconds arithmetic** it must stay consistent with (`tsSec` whole seconds, same scale as `timestampToSeconds`).

### Mechanics inside the parser (char-scan, no regex — honoring the existing "char-scan only" rule)
- The current `parseTranscriptLines` continuation-merge ALREADY does most of the work: if the timecode line is recognized as an **anchor with empty text**, the subsequent `"Unknown"` line and the spoken-text line are merged in as continuation text (line 64 `out[out.length-1].text += ...`). So the only real change is teaching `parseTimestampPrefix` to recognize the 4-part range head and return an anchor with `tsSec` (START, frames dropped) and `text: ''`.
- The speaker label `"Unknown"` would merge into the cue text as a leading word. **Decision point**: either (i) skip a bare speaker-label line, or (ii) accept it merges (then strip a known label) — see Open decisions. Cleanest: treat a line that is *only* a speaker label (single token, no sentence punctuation, immediately after an anchor) as skippable, OR keep it simple and let the follow-up decide whether `"Unknown "` prefix pollution is acceptable in the displayed cue. (In THIS data it would prepend `"Unknown "` to every cue — visible to the user — so stripping is preferable.)
- `normalizeCueText` already collapses whitespace; if frames/speaker are dropped before merge, cue text stays clean.

### Detection rule (additive, deterministic)
A line is a **new-format anchor** iff: it contains `" - "`, and the head before the first space is exactly 4 colon-separated all-digit fields (`isDigits` on each, 1–2 digit H/M/S, 2-digit FF). Otherwise fall through to the existing 2–3 part logic, then to continuation. No existing input can match the new branch (existing `MM:SS text` has no ` - ` numeric-range head), so **zero regression risk to frozen tests** by construction.

(Option b — normalize at `App.jsx` before prop-drill — is viable and *lower-blast-radius* if the team wants to keep the shared parser literally frozen, but it duplicates format knowledge and only fixes the web path, not any future server-side cue use. Documented as the fallback, not the recommendation.)

---

## SSOT / primitive notes

- **One parser, one home.** The fix belongs in `transcript-lines.js`; both downstream black boxes query it. No parallel format-handling copy anywhere.
- **No new primitive.** `{tsSec,text}` and `SubtitleCue {text,start,end}` are sufficient; the editor export is a parser *variant input*, composed through the existing pipeline.
- **TIME REFERENCE stays canonical.** `tsSec`/`cue.start`/`cue.end` remain whole seconds absolute on the file timeline; frames are dropped at parse so they never leak past the parser. `timestampToSeconds` (moment ranges) is untouched.
- **`segmentLines` vs `cues` stay distinct** (per memory note) — both happen to recover once the parser sees the format, but remain separate memos in `MomentCard`.
- **Validation lenience vs parser strictness is a latent SSOT smell** worth flagging: ingest accepts what the parser then silently drops to `[]`. Out of D4 scope to fix, but the follow-up should at least note it so the two don't drift further.

---

## Invariants to preserve

1. **Frozen `MM:SS` / `HH:MM:SS` behavior** — all of `transcript-lines.test.js`, `subtitle-cues.test.js`, `transcript-extract.test.js` must stay green, unchanged. (New branch is unreachable by their inputs.)
2. **TIME REFERENCE** — `cue.start` absolute seconds on the file timeline; a `47:30` line → 2850; frames dropped (or rounded), never carried as a fractional/extra field. `startSec` never subtracted.
3. **`buildSubtitleCues` tiling semantics** — end-exclusive `[startSec, endSec)`, gap-free tiling across visible cues, last cue → `endSec`, empty-text cues dropped first.
4. **Public signatures unchanged** — `parseTranscriptLines(string) → {tsSec,text}[]`, `buildSubtitleCues(transcript,startTs,endTs) → SubtitleCue[]`, `extractSegment*` identical.
5. **Char-scan only on the parse path** — no regex (existing module rule). New detection done with `indexOf`/`split`/`isDigits`.
6. **Pure / deterministic** — no DOM, Date, randomness.
7. **`AnalysisResponse` / `Moment` shapes untouched** — moment ranges remain `HH:MM:SS` strings.

---

## Risks / edge cases

- **Speaker-label pollution**: naïvely merging makes every cue read `"Unknown <text>"`. MUST be handled (skip bare label line, or strip). Highest-visibility edge case.
- **Ambiguity between `HH:MM:SS:FF - ...` and a hypothetical `HH:MM:SS text` where text starts with a digit**: disambiguated by the mandatory `" - "` second-timecode in the new branch; existing single-timestamp lines have no ` - <timecode>` head. Low risk, but the detection must require the FULL range shape, not just "4 colon parts".
- **Frames rounding**: dropping frames (floor to second) vs rounding. Floor matches `timestampToSeconds`'s integer arithmetic and keeps anchors ≤ their displayed second; recommend **floor (drop)**. (Sub-second precision is moot — cues tile to next-anchor anyway.)
- **fps assumption**: do NOT convert frames→fractional seconds (would require knowing fps; 30 here but fragile). Dropping frames sidesteps fps entirely. Note in code.
- **Multi-line text blocks** (not seen here but plausible in other exports): existing continuation-merge already covers them — keep that path intact.
- **Mixed-format transcript** (some `MM:SS text`, some editor blocks): line-level detection handles both in one pass; no global mode switch needed (a strength of option a).
- **Trailing `"Clique aqui."`**: harmless; it's legitimate block text, outside all ranges. Do not special-case.
- **D3 coupling regression**: once cues exist, `subtitleText` = full cue text (one block = up to ~400 chars, e.g. moment #1's 994-line). This will render as one long string until D3 (chunking/wrapping) is addressed — see below. The D4 fix is correct in isolation but makes D3 immediately visible.

---

## Test matrix (AAA) — add alongside the FROZEN suites

`packages/shared/src/transcript-lines.test.js` (new `describe('editor timecode export')`):
- **Arrange** `"00:00:00:26 - 00:00:17:24\nUnknown\nSantidade."` **Act** parse **Assert** `[{ tsSec: 0, text: 'Santidade.' }]` (frames dropped, speaker stripped).
- **Arrange** `"01:28:25:10 - 01:28:59:13\nUnknown\nVocê colocou..."` **Act** parse **Assert** `tsSec === 5305` (= 1*3600+28*60+25; **not** 5305.33, **not** including frames).
- **Arrange** two consecutive editor blocks **Act** parse **Assert** two entries, correct `tsSec`, no cross-bleed.
- **Arrange** editor block whose text spans two lines before the blank **Act** parse **Assert** the two text lines merge into one cue.
- **Arrange** a `"Foo Bar"` speaker (non-"Unknown") block **Act** parse **Assert** label still stripped (skip-by-position, not by literal).
- **Arrange** MIXED: one `MM:SS text` line + one editor block **Act** parse **Assert** both produce correct anchors (regression-proof of additivity).
- **REGRESSION (frozen, must still pass):** all existing `MM:SS`/`HH:MM:SS`/continuation/reject/empty cases byte-identical.

`packages/shared/src/subtitle-cues.test.js`:
- **Arrange** real-format slice spanning moment #1 `[01:28:25, 01:29:13]` from a 2-block fixture **Act** `buildSubtitleCues` **Assert** ≥1 cue, `start === 5305`, `end` tiled, text has no leading `"Unknown"`, no leading timecode, no frame digits.
- **Arrange** real-format fixture for a range with one block **Act** build **Assert** single cue `start=anchor`, `end=endSec`.

`apps/web/src/lib/transcript-extract.test.js`:
- **Arrange** editor-format slice **Act** `extractSegmentLines` **Assert** non-empty array, clean text (proves D4 string clears).

Fixture: extract a ~6-block real slice (e.g. blocks around `01:28`) into a small named fixture so the tests use the genuine shape, not a hand-typed approximation.

---

## Open decisions for the human

1. **THE decision — where normalization lives**: (a) extend shared `parseTranscriptLines` with line-level format auto-detection [RECOMMENDED — SSOT, fixes both consumers, char-scan], vs (b) a normalization step at the `App.jsx` web boundary [smaller blast radius, but duplicates format knowledge + web-only]. Recommend (a).
2. **Speaker label handling**: skip the label line by position (line immediately after an anchor, single token), vs strip a known-label set, vs leave merged. Recommend skip-by-position (format-agnostic, survives non-"Unknown" exports).
3. **Frames**: drop/floor (recommended, fps-agnostic) vs round-to-nearest-second.
4. **Validation tightening** (`validation.js` + duplicated `useAnalyze.js` regex): do we tighten ingest to actually require parseable lines (so a truly unparseable transcript fails fast at submit, not silently empties cues), or keep lenient? Out of D4's minimal scope — flag, decide separately.

---

## CC / decomposition notes

- The change is localized to `parseTimestampPrefix` + (maybe) one helper for the new branch. Keep `parseTranscriptLines` cognitive complexity ≤ 15: extract `parseEditorRangeAnchor(raw)` and `parseClockAnchor(raw)` helpers so `parseTimestampPrefix` is a 2-branch dispatcher and neither sub-parser balloons. AAA tests target each helper through the public `parseTranscriptLines` surface (never the internals).
- No interface in the boundary table changes → no DEC required for the contract, but the *behavioral* addition (new accepted format + frames-drop) warrants a short DEC entry recording the editor-export support + frames-drop rationale (sits next to the existing TIME REFERENCE invariant docs).
- **D4 → D3 unblock**: D4's fix is the prerequisite for D3. Today cues are `[]` so D3 (chars/lines chunking) has nothing to chunk — the key_quote fallback renders whole. Once D4 lands, `cueAt` returns real cue text; D3 then operates on actual cue strings (decide: re-chunk/wrap cue text per `subtitleConfig.charsPerScreen`/`lines` while keeping it cue-timed). D3 cannot be meaningfully implemented or tested against the real transcript until D4 produces cues. Sequence: **D4 first, D3 second.**
