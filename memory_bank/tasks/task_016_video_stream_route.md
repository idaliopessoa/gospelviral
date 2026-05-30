# TASK_016: Video Stream Route (HTTP Range)
timestamp: 2026-05-29T00:00:00Z
version: 1.0
status: Ready
owner: unassigned
confidence: HIGH
phase: 5

## Black Box Interface

### INPUT
- **Required Context**:
  - `bootstrap-features-fases-3-6.md` §"FASE 5" — the `<video>` player consumes this route; "só toca se houver VideoSource"
  - `apps/server/src/storage/video-storage.js` — `createVideoStorage` factory; `stream(id)` already returns a full `Readable`; `get(id)` returns the `VideoSource` (with `sizeBytes`, `mimeType`)
  - `apps/server/src/routes/upload.js` — `createUploadRouter`, `isValidVideoId` (path-traversal guard), the `{ error: { code, message } }` envelope
  - `apps/server/src/server.js` — storage composed + router mounted at `/api/upload/video`
  - `01-Systems-Architecture-Expert-viral-cristao.md` §"Replaceable Components", §"Wrap external dependencies"
  - `02 - Task Creation System - Black Box Architecture.md` — protocol
  - Memory: [[smoke_heap_invariant_trigger_files]] — **this task touches `storage/video-storage.js` + `routes/upload.js`, so P3 MUST run `pnpm smoke:heap`**
- **Prerequisites**: TASK_014 (Complete) — storage + upload router exist
- **Parameters**: none

### OUTPUT
- **Deliverables**:
  - `apps/server/src/storage/video-storage.js` — gains streaming-range capability without breaking the existing `stream(id)`:
    - `streamRange(id: string, range?: { start: number, end: number }): Promise<{ stream: Readable, size: number, mimeType: string } | null>` — returns a `createReadStream` opened on `[start, end]` (inclusive) when a range is given, or the full file otherwise; `null` for unknown ids. NEVER reads the whole file into memory (`createReadStream`, not `readFile`)
    - Existing `stream(id)` kept (or re-expressed in terms of `streamRange`) so no caller breaks
  - `apps/server/src/lib/range.js` — `parseRangeHeader(headerValue: string, size: number): { start, end } | null | 'unsatisfiable'` — pure parser for a single `bytes=start-end` range; no regex on the hot path (char-scan), handles `bytes=N-`, `bytes=-N`, open-ended; returns `null` for absent/garbage, `'unsatisfiable'` when out of bounds
  - `apps/server/src/lib/range.test.js`
  - `apps/server/src/routes/upload.js` — adds `GET /:id/stream`:
    - id validated via `isValidVideoId` → 400 `invalid_id` on failure
    - unknown id → 404
    - no `Range` header → `200` full body, `Accept-Ranges: bytes`, `Content-Length`, `Content-Type: <mimeType>`
    - valid `Range` → `206 Partial Content`, `Content-Range: bytes start-end/size`, `Content-Length: chunk`, `Content-Type`, `Accept-Ranges: bytes`
    - unsatisfiable range → `416 Range Not Satisfiable` with `Content-Range: bytes */size`
  - `apps/server/src/storage/video-storage.test.js` — extended with `streamRange` cases
  - `apps/server/src/routes/upload.test.js` — extended with stream-route cases
- **Artifacts**:
  - SonarCloud Quality Gate = PASS; `javascript:S3776 = 0` on new code; coverage ≥ 90% on `range.js` + the new route branch
- **Decisions Generated**:
  - **DEC: Range parsing is a pure module (`lib/range.js`), char-scanned, no regex.** Avoids `javascript:S5852` and is unit-testable in isolation. Supports a single range only (the `<video>` element never sends multipart ranges for progressive playback).
  - **DEC: `streamRange` uses `fs.createReadStream(path, { start, end })`** — streaming, O(KB) residency. The HTTP layer never buffers the file. (Same invariant family as the upload pipeline; see [[smoke_heap_invariant_trigger_files]].)
  - **DEC: size + mimeType come from the sidecar `VideoSource` via `storage.get(id)`** — no second `fs.stat`, no parallel source of truth. The sidecar is already the SSOT for file metadata.
  - **DEC: full-body GET (no Range) still advertises `Accept-Ranges: bytes`** so the browser knows it can seek; most browsers issue a `Range: bytes=0-` immediately for `<video>` anyway.

### INVARIANTS
- **Must Maintain**:
  - **⏱ TIME REFERENCE (cross-task invariant — 016/017/018)**: all time is seconds ABSOLUTE on the full uploaded video file's timeline. The player (TASK_018) seeks `<video>.currentTime` to a moment's absolute `timestamp_start`; the browser then issues a `Range` request for the BYTE offset corresponding to that seek. This route MUST honor that range (206) and NOT force a download from byte 0 — i.e. range support is what makes "start playback at minute 47" cheap. Byte ranges here are independent of the time scale, but the route's correctness (serving the seeked byte range) is what lets the absolute-time seek work end-to-end. A non-range (200-only) implementation would break the player's start-at-`timestamp_start` behavior for large files.
  - `reference/viral-cristao-artifact.jsx` frozen
  - `routes/upload.js` keeps importing storage + the multipart wrapper only — no direct `fs` in the route; the route asks `storage.streamRange`, never builds a path
  - Original filename never on disk / never in a path (TASK_014 invariant preserved)
  - id validated before any FS touch (path traversal non-applicable by design + `isValidVideoId`)
  - **Streaming residency**: the stream route NEVER loads the whole file into memory; `createReadStream` only. `pnpm smoke:heap` PASS at P3 confirms the upload path did not regress
  - `apps/server/src/config/env.js` remains the single `process.env` seam
  - Cognitive Complexity ≤ 15 per function (`javascript:S3776`)
  - Zero regressions across `pnpm test`
- **Quality Gates**:
  - `range.test.js`: `bytes=0-99` → {0,99}; `bytes=100-` → {100,size-1}; `bytes=-100` → {size-100,size-1}; absent/garbage → null; `bytes=999999-` (>size) → 'unsatisfiable'; multi-range `bytes=0-1,2-3` → null (unsupported)
  - `video-storage.test.js`: `streamRange(id)` full → bytes equal original; `streamRange(id, {start,end})` → exactly that slice; unknown id → null; the read is a `createReadStream` (not a buffered read)
  - `upload.test.js` (via `app.fetch`): full GET → 200 + Accept-Ranges + Content-Length; `Range: bytes=0-3` → 206 + Content-Range + 4-byte body; out-of-range → 416; invalid id → 400; unknown id → 404
  - `pnpm -F @gospelviral/server smoke:heap` → PASS (upload path regression guard, per the trigger-files memory)

## Task Definition
Add `GET /api/upload/video/:id/stream` so the frontend `<video>` element can play (and seek within) an uploaded source video. The route honors HTTP `Range` requests with `206 Partial Content`, backed by a streaming `createReadStream` in the storage layer (never buffering the file). Size and mime come from the existing sidecar `VideoSource`. The storage module gains a `streamRange` capability; range parsing is a pure, regex-free helper.

## Success Criteria
1. `curl -s -D- -o /dev/null http://localhost:8787/api/upload/video/<id>/stream` (after an upload) returns `200` with `Accept-Ranges: bytes` + `Content-Length`
2. `curl -s -D- -o /dev/null -H 'Range: bytes=0-99' .../stream` returns `206` with `Content-Range: bytes 0-99/<size>`
3. A `<video src=".../stream">` in a browser plays and can seek (manual, deferred to TASK_018 smoke)
4. `pnpm smoke:heap` PASS; SonarCloud QG PASS; `javascript:S3776 = 0` on new code
5. Black-box auditor: AUDITORIA LIMPA

## Risk Assessment
| Risk | Level | Mitigation | Detection |
|---|---|---|---|
| Hono response from a Node `Readable` needs Web-stream conversion (`Readable.toWeb`) | MEDIUM | Mirror the upload route's `Readable.fromWeb` pattern in reverse; unit test asserts the bytes round-trip | Route test |
| Off-by-one in `Content-Range` (inclusive end) | MEDIUM | `range.test.js` pins inclusive semantics (`bytes=0-99` = 100 bytes); Content-Length = end-start+1 | Unit test |
| `createReadStream` range past EOF | LOW | `parseRangeHeader` returns `'unsatisfiable'` → 416 before opening the stream | Unit test |
| Sonar `javascript:S5852` on a range regex | MEDIUM | Char-scan parser, no regex ([[sonar_quality_gate_gotchas]]) | Local sonar |
| smoke:heap not run despite touching storage/route | MEDIUM | P3 checklist + [[smoke_heap_invariant_trigger_files]] memory force it | P3 gate |

## Implementation Strategy
1. **Tests first** — `range.test.js` (parser), `video-storage.test.js` (+streamRange), `upload.test.js` (+stream route)
2. Implement `lib/range.js` (pure, char-scan)
3. Extend `video-storage.js` with `streamRange`; keep `stream(id)` working
4. Add `GET /:id/stream` to `routes/upload.js` (206/200/416/404/400)
5. Gates: `pnpm lint`, per-workspace coverage ([[pnpm_workspace_test_coverage_flake]]), **`pnpm -F @gospelviral/server smoke:heap`** ([[smoke_heap_invariant_trigger_files]]), `set -a; source .env.local; set +a; pnpm sonar` ([[sonar_env_sourcing]])
6. curl smoke (200 + 206 + 416); black-box auditor; PR

## Prerequisite Subtasks (MANDATORY)
### SUBTASK_016.P1: GitFlow
**Status**: ⏱️ Not Started — branch `feature/task-016-video-stream-route` from `develop`; conventional commits `(server)`/`(storage)`; PR → develop; Co-Authored-By trailer
### SUBTASK_016.P2: Tests
**Status**: ⏱️ Not Started — TDD/AAA; ≥ 90% on `range.js`; zero regressions; CC ≤ 15
### SUBTASK_016.P3: Finalization
**Status**: ⏱️ Not Started — lint 0; per-workspace coverage; **`pnpm smoke:heap` PASS**; `pnpm sonar` PASS + S3776=0; curl smoke (200/206/416) evidence; auditor; PR with SonarCloud block

## Subtasks (Pass 2 will decompose)
- SUBTASK_016.1 — `lib/range.js` pure parser + tests
- SUBTASK_016.2 — `streamRange` in video-storage + tests
- SUBTASK_016.3 — `GET /:id/stream` route + tests
- SUBTASK_016.4 — smoke:heap + curl smoke + sonar + auditor + PR
