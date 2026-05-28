# TASK_014: Video Upload — Backend Storage + Endpoint
timestamp: 2026-05-28T00:00:00Z
version: 1.2
status: Ready
owner: unassigned
confidence: HIGH
phase: 4

## Black Box Interface

### INPUT
- **Required Context**:
  - `bootstrap-features-fases-3-6.md` §"FASE 4 — Ingestão do vídeo-fonte por upload" — product spec, the cleanup-on-boot rule, the `VideoSource` primitive definition
  - `apps/server/src/server.js` — Hono app composition, route mounting, the `isMain` startup gate where cleanup hooks belong
  - `apps/server/src/config/env.js` — the single `process.env` seam; new env vars MUST land here
  - `apps/server/src/lib/validation.js` + `apps/server/src/lib/logger.js` — patterns reused (fail-shape, structured logging)
  - `packages/shared/src/types.js` — primitive typedefs already declared; `VideoSource` is added here so both apps see the same shape (DEC promotion is unconditional — VideoSource is bilateral by design, not "web-only until 2nd consumer")
  - `01-Systems-Architecture-Expert-viral-cristao.md` §"Single Source of Truth", §"Primitive-First Design" — VideoSource is a top-level primitive; storage owns it; nobody caches the path
  - `02 - Task Creation System - Black Box Architecture.md` — protocol; especially P1/P2/P3
- **Prerequisites**: TASK_005 (Complete) — server scaffold, env, logger, route conventions exist
- **Parameters**: none

### OUTPUT
- **Deliverables**:
  - `packages/shared/src/types.js` — adds the `VideoSource` JSDoc typedef:
    ```
    @typedef {object} VideoSource
    @property {string} id              uuid v4
    @property {string} filename        sanitized original name
    @property {number} sizeBytes
    @property {string} mimeType        "video/mp4" | "video/quicktime" | "video/webm"
    @property {string} uploadedAt      ISO timestamp
    ```
  - `apps/server/src/lib/multipart-parser.js` — thin wrapper over `busboy` (DEC: chosen streaming multipart parser; see Decisions Generated). Exports `parseMultipartUpload(stream: Readable, { onFile, onError, limits }): Promise<void>` — calls `onFile({ stream, filename, mimeType, fieldname })` for each file part; honors `limits.fileSize` (delegated to busboy). Route handler never imports `busboy` directly — §"Wrap external dependencies"
  - `apps/server/src/lib/multipart-parser.test.js` — Vitest suite (synthetic multipart body fed via `Readable.from`)
  - `apps/server/src/storage/video-storage.js` — **factory** `createVideoStorage({ dir, logger }): VideoStorage` returning an instance with:
    - `init(): Promise<void>` — idempotent. Ensures `dir` exists, then deletes its contents (NOT the dir itself). Logs the cleanup count
    - `save({ stream: Readable, filename: string, mimeType: string }): Promise<VideoSource>` — **streams** bytes into `<dir>/<id>.tmp` via `pipeline(stream, fs.createWriteStream(...))`, then atomic-renames to `<dir>/<id>.<ext>`, then writes sidecar `<dir>/<id>.json` atomically. Returns the typed `VideoSource`. **NEVER buffers the file in RAM** (see INVARIANT below). `sizeBytes` is read after the pipeline closes (from the write-stream byte counter)
    - `get(id: string): Promise<VideoSource | null>` — reads sidecar JSON; returns `null` when missing
    - `stream(id: string): Promise<Readable | null>` — for Phase 5 consumption (declared here; Phase 5 wires the route)
  - `apps/server/src/storage/video-storage.test.js` — Vitest suite (cases enumerated in Quality Gates below)
  - `apps/server/src/routes/upload.js` — exports `createUploadRouter({ storage, allowedMimes, maxBytes }): Hono`:
    - `POST /api/upload/video` — wires `Readable.fromWeb(c.req.raw.body)` → `parseMultipartUpload` → on the `video` field calls `storage.save({ stream, filename, mimeType })`. Multipart-level limits passed in via `parseMultipartUpload({ limits: { fileSize: maxBytes }, allowedMimes })`. Returns `200 { videoSource }` or `400 { error: { code, message } }`
    - `GET /api/upload/video/:id/info` — id format validated (no path traversal — see DE) → `storage.get(id)` → 200 or 404
  - `apps/server/src/routes/upload.test.js` — request-level integration tests (Hono `app.fetch` driven, multipart fixtures synthesized via `FormData` + `Blob`; **`maxBytes` injected at 1024 bytes via DI** to exercise the rejection path without large fixtures — see DC)
  - `apps/server/src/config/env.js` — adds `videoUploadDir` (default `apps/server/.tmp/video-uploads`, resolved to absolute path) and `maxUploadSizeBytes` (default `2147483648` = 2 GiB) to the `env` snapshot; `readEnv()` honors `VIDEO_UPLOAD_DIR` and `MAX_UPLOAD_SIZE_BYTES` overrides
  - `apps/server/src/config/env.test.js` — extends with two cases pinning the new vars
  - `apps/server/src/server.js` — composes the storage singleton (`createVideoStorage({ dir: env.videoUploadDir, logger })`), mounts `createUploadRouter({ storage, allowedMimes: env.videoAllowedMimes, maxBytes: env.maxUploadSizeBytes })` at `/api/upload/video`; calls `await storage.init()` inside the `isMain` block BEFORE `serve(...)`. Tests import the bare `app` and do NOT trigger init
  - Root `.gitignore` — adds `apps/server/.tmp/` (the parent of the video dir) so any future temp surface under it is ignored too
  - `apps/server/scripts/smoke-heap.js` + `package.json` script `smoke:heap` — in-process heap-invariant smoke (see DF). Standalone Node script; imports the storage + multipart-parser directly, feeds a 1.5 GiB synthetic stream, samples `process.memoryUsage().heapUsed` every 100 ms, asserts `max(heap) - baseline(heap) < 50 MB`. Exit non-zero on assertion failure
- **Artifacts**:
  - SonarCloud Quality Gate = PASS; `javascript:S3776 = 0` on every new function
  - Coverage on `video-storage.js` ≥ 95%; on `upload.js` route handler ≥ 90%
- **Decisions Generated**:
  - **DEC: Streaming-first upload pipeline (architectural INVARIANT).** Per `01-Systems-Architecture-Expert-viral-cristao.md` §"Replaceable Components" + §"Format/Interface Design": one storage interface, one persistence path. The pipeline is `req.body` (web `ReadableStream`) → `Readable.fromWeb(...)` (`node:stream`) → `parseMultipartUpload(...)` (busboy wrapper) → `storage.save({ stream, ... })` → `fs.createWriteStream(<id>.tmp)` via `stream.pipeline`. **Upload NEVER loads the whole file into RAM.** Memory residency during a 2 GiB upload must be `O(KB)` (chunk-sized), not `O(GB)`. The `c.req.parseBody()` path is explicitly rejected because it buffers the whole multipart body in memory — that is a wrong primitive for this contract.
  - **DEC: `busboy` as the streaming multipart parser, wrapped in `lib/multipart-parser.js`.** Per §"Wrap external dependencies". `busboy` is battle-tested (multer's underlying parser), streaming-first since v1, mature, minimal dependency surface. Alternatives considered: `@mjackson/multipart-parser` (web-streams native but smaller community + less exercised edge cases — deferred), `formidable` (does its own file persistence, conflicts with our storage owning the disk path), inline parser (RFC 7578 is too gnarly to hand-roll). The route handler imports the wrapper only; swap = local change inside `lib/multipart-parser.js`.
  - **DEC: `VideoSource` is a bilateral primitive in `@gospelviral/shared` from day one.** No "web-only until second consumer" hesitation (as was done for `transcript-extract.js` in TASK_013). The server defines what the wire response looks like; the frontend renders that shape; both must import the same typedef from the same module.
  - **DEC: `VideoSource` is a REFERENCE to the file, NOT a description of it.** The server does NOT probe duration / codec / fps / resolution on upload. If Phase 6 (export pipeline) needs that metadata for FFmpeg, it lands in a SEPARATE module `apps/server/src/runtime/video-metadata.js` (likely shelling out to `ffprobe`), NOT retrofitted into the `VideoSource` shape. Keeps the primitive small, stable, and replaceable. Recorded in "Known follow-ups" below.
  - **DEC: Sidecar JSON `<id>.json` next to `<id>.<ext>`** holds the typed `VideoSource` (`{ id, filename, sizeBytes, mimeType, uploadedAt }`). Written atomically (`<id>.json.tmp` → rename). `get(id)` reads the sidecar; `init()` cleanup deletes both files for a given id together. Alternative (reconstruct from `fs.stat`) was rejected — it loses original `filename`, `mimeType`, and a clean `uploadedAt` (mtime is reset by any tooling that touches the binary).
  - **DEC: Storage path is `apps/server/.tmp/video-uploads/` (relative to the repo root).** Gitignored via the **root** `.gitignore` adding `apps/server/.tmp/` — no per-workspace `.gitignore` fragmentation. Cleanup on boot removes the **contents** of the dir, never the dir itself (so the gitignored marker stays). Test runs use a tmp dir per-test by constructing their own `createVideoStorage({ dir: tmpdir })` instance (DI, not env override — see DB).
  - **DEC: Factory DI for the storage module — `createVideoStorage({ dir, logger })` mirrors `createAnalyzeRouter` / `createDetectRouter`.** No singleton, no module-level state. Single instance composed at `server.js`. Router receives the instance via factory props. Tests construct their own instance per test with a tmp dir and (for size-cap exercises) inject `maxBytes` into the router at construction time (DC).
  - **DEC: Test size-cap exercises use `maxBytes: 1024` injected via DI (router factory prop), NOT 2 GiB Blobs.** V8 has Blob/ArrayBuffer limits and 2 GiB fixtures would be slow + flaky. The real 2 GiB cap is verified only in the heap-invariant smoke (DF).
  - **DEC: Mime allowlist (Phase 4): `video/mp4`, `video/quicktime`, `video/webm`.** `mp4` + `quicktime` cover Premiere/iPhone exports (the common case); `webm` is included at zero cost. Configurable via `VIDEO_ALLOWED_MIMES` env var (comma-separated) if a future format is needed. Anything else → 400 `invalid_mime_type`.
  - **DEC: Size cap default 2 GiB (`2147483648` bytes).** Reasoning: a 1080p MP4 of a 60-90 min pregação typically lands at 1-1.8 GB; smaller caps rejected real-world files. Env override `MAX_UPLOAD_SIZE_BYTES`. Anything larger → busboy emits `'limit'` mid-stream → save is aborted, partial files unlinked, route returns 400 `file_too_large`.
  - **DEC: Disk path is `${dir}/${uuid}.${ext}`. Original filename never touches the filesystem.**
    1. Final binary path: `${storageRoot}/${uuid}.${ext}` where `ext` is derived from the validated mime via a fixed whitelist table (`video/mp4`→`.mp4`, `video/quicktime`→`.mov`, `video/webm`→`.webm`)
    2. Original filename NEVER touches the filesystem — stored ONLY in the sidecar JSON for UI display
    3. UUID generated server-side via `crypto.randomUUID()` (Node ≥ 19; project assumes Node 20 LTS)
    4. Path-traversal sanitization is **non-applicable by design** — the client never controls the filename used on disk
    5. Mime → extension mapping is a whitelisted lookup table, not a free derivation from the original filename or content-sniffing
  - **DEC: Heap-invariant smoke is in-process (Vitest-friendly Node script), NOT an HTTP debug endpoint.** Reasoning: (a) `process.memoryUsage().heapUsed` measured directly is the JS heap, not OS RSS (which is contaminated by buffer pools); (b) no HTTP-layer noise; (c) no `/debug/mem` endpoint to gate behind env flags or police via ESLint exceptions; (d) zero attack surface. If runtime memory inspection is wanted later, that lands as a separate task with its own threat-model review — out of scope for TASK_014.
  - **DEC: `storage.stream` is declared and tested as a unit but NOT wired into a route in Phase 4.** Phase 5 will mount `GET /api/upload/video/:id/stream` to feed the `<video>` element. Declaring the storage primitive now keeps the storage module's interface stable.

### INVARIANTS
- **Must Maintain**:
  - **STREAMING (architectural)**: Upload NEVER buffers the whole file in RAM. The pipeline `req.body → Readable.fromWeb → busboy → pipeline(stream, fs.createWriteStream)` is the only valid path. Memory residency during upload of 2 GiB MUST be `O(KB)`. **Validated by the heap-invariant smoke (`smoke:heap`): `max(process.memoryUsage().heapUsed) - baseline < 50 MB` while uploading 1.5 GiB. Smoke FAIL = PR BLOCKED, no bypass.** This is not a target, it is the contract
  - `reference/viral-cristao-artifact.jsx` remains frozen
  - `apps/server/src/config/env.js` is the single seam to `process.env` — no other file in `apps/server/src/` may read `process.env` directly (existing convention; new vars land here)
  - `VideoSource` shape lives in `packages/shared/src/types.js` and is imported (or referenced via JSDoc `@type`) by both server and web; the typedef must NOT be duplicated
  - `routes/upload.js` MUST NOT import `busboy` or any other multipart parser directly — only through `lib/multipart-parser.js` (the wrap per §"Wrap external dependencies")
  - Cleanup on boot deletes the **contents** of the upload dir but preserves the dir itself; idempotent (running twice is a no-op on an already-empty dir)
  - The upload dir is created if missing on `storage.init()` — no manual setup required
  - `storage.save({ stream, ... })` writes atomically: pipeline into `<id>.tmp` then `rename()` to `<id>.<ext>`, then atomic sidecar (`<id>.json.tmp` → rename). A crash mid-write never leaves a half-file visible under the final name
  - Original filename NEVER appears in any filesystem path — only in the sidecar JSON's `filename` field
  - `storage.get(id)` returns `null` for unknown ids — never throws
  - Cognitive Complexity ≤ 15 per function (`javascript:S3776`)
  - Zero regressions across `pnpm test` (web + server + shared)
- **Quality Gates**:
  - `multipart-parser.test.js` covers:
    1. Single-file multipart body → `onFile` invoked once with `{ stream, filename, mimeType, fieldname }`; `stream` yields the original bytes
    2. Multi-file multipart body → `onFile` invoked per file in field order
    3. `limits.fileSize` exceeded → busboy emits `'limit'` → wrapper rejects with `MultipartError { code: 'file_too_large' }`
    4. Malformed multipart → wrapper rejects with `MultipartError { code: 'malformed_body' }`
    5. Empty multipart → wrapper resolves with no `onFile` calls
  - `video-storage.test.js` covers:
    1. `init()` on a fresh tmpdir creates the dir and exits cleanly
    2. `init()` on a tmpdir with N stale files (binaries + sidecars) deletes all of them, leaves the dir
    3. `init()` is idempotent (call twice, no error)
    4. `save({ stream, ... })` writes the bytes correctly, returns a VideoSource whose `id` matches the on-disk filename; sidecar JSON present with the typed shape
    5. `save()` rejects with `EmptyFileError` when the input stream produces zero bytes
    6. `get()` returns the saved VideoSource for a known id (reads sidecar JSON)
    7. `get('does-not-exist')` returns `null`
    8. `stream()` returns a Readable whose bytes equal the original
    9. `stream('does-not-exist')` returns `null`
    10. Atomic write: a synthesized crash mid-write (mock `fs.rename` throw) leaves no `<id>.<ext>` and no `<id>.json` visible to `get`
  - `upload.test.js` (Hono `app.fetch` driven; router constructed with `maxBytes: 1024` via DI) covers:
    1. Happy path: POST multipart with valid `video/mp4` (1023 bytes) → 200 with VideoSource shape
    2. Rejection: POST with `application/pdf` → 400 `invalid_mime_type`
    3. Rejection: POST with 2048 bytes > `maxBytes` 1024 → 400 `file_too_large`
    4. Rejection: POST with no `video` field → 400 `missing_video_field`
    5. GET `/info` for a known id → 200 with VideoSource
    6. GET `/info` for an unknown id → 404
    7. GET `/info` for an invalid id format (e.g., `..`, `xxx`, non-uuid) → 400 `invalid_id`
  - `env.test.js` covers: `VIDEO_UPLOAD_DIR` override (absolute / relative / default), `MAX_UPLOAD_SIZE_BYTES` override (valid / invalid value → default), `VIDEO_ALLOWED_MIMES` override (single / multiple / default)
  - **`smoke:heap` gate (P3, pre-PR, in-process Node script — see DF)**: imports `createVideoStorage` + `parseMultipartUpload` directly; pre-generates `/tmp/big.mp4` (1.5 GiB of `/dev/zero`); pipes through the parser into a fresh storage instance; samples `process.memoryUsage().heapUsed` every 100 ms before / during / after; asserts `max(heap) - baseline < 50 MB`. Exit non-zero on assertion failure. Output: `memory_bank/tasks/evidence/task_014/heap-invariant.csv` (timestamp, heapUsed, delta) + assertion result. **Smoke FAIL = PR BLOCKED; investigate the pipeline, do not bypass.**

## Task Definition
Add a Hono `POST /api/upload/video` endpoint that accepts a single multipart-uploaded MP4 / MOV / WebM file via a **streaming** pipeline (`req.body → busboy wrapper → fs.createWriteStream`, never buffering the file in RAM), stores it under a gitignored temp dir, and returns a typed `VideoSource` handle. Add `GET /api/upload/video/:id/info` so the frontend can re-fetch metadata for a known id. Wire a one-shot cleanup at server boot that empties the temp dir (so a crashed previous run never leaves stale binaries). Promote `VideoSource` to `@gospelviral/shared` so the wire shape is the same on both sides. The streaming-first contract is validated by an in-process heap-invariant smoke that gates the PR.

## Success Criteria
1. `pnpm -F @gospelviral/server dev` boots, init runs once, upload dir is created+empty, server listens
2. `curl -F video=@sample.mp4 http://localhost:8787/api/upload/video` returns a JSON `{ videoSource: { id, filename, sizeBytes, mimeType, uploadedAt } }`
3. The uploaded file appears at `apps/server/.tmp/video-uploads/<uuid>.mp4` with a matching `<uuid>.json` sidecar, and IS gitignored (verified by `git status` showing nothing)
4. Re-starting the server deletes both files (cleanup-on-boot)
5. **`pnpm -F @gospelviral/server smoke:heap` PASS — `max(heap) - baseline < 50 MB` during a 1.5 GiB upload** (architectural INVARIANT)
6. SonarCloud Quality Gate = PASS; `javascript:S3776 = 0` on new code; new-code coverage ≥ 80%
7. Black-box auditor reports AUDITORIA LIMPA

## Risk Assessment
*(The "parseBody buffers in RAM" entry was promoted to a hard architectural INVARIANT — see INVARIANTS section above. It is no longer a risk to weigh; it is a contract the smoke gate enforces.)*

| Risk | Level | Mitigation | Detection |
|---|---|---|---|
| User uploads a non-video MP4 (e.g., audio-only `.mp4`) → mime allowlist accepts it | LOW | Mime check is purely an early filter; the frontend's `<video>` element in Phase 5 will surface a play error if there is no video track | UI feedback in Phase 5 |
| Concurrent uploads from two tabs collide on the same generated id | LOW | `crypto.randomUUID()` collision odds are nil at this scale | n/a |
| Cleanup-on-boot deletes a video the user just uploaded right before the server crashed | LOW | Expected behavior — the bootstrap DEC explicitly states "cleanup total na inicialização". Recorded in user-facing copy: "vídeos não persistem entre reinícios do servidor" | UX copy in TASK_015 |
| Path traversal via `:id` param (`../../etc/passwd`) | HIGH if naive | Validate id is a 36-char uuid v4 in the route handler before touching FS; storage helpers double-check via `path.basename` + dir comparison. Original filename never on disk (see DE) | Unit test case 7 in upload.test.js |
| Sonar `javascript:S5852` ReDoS flag on a mime/uuid regex (same false positive that hit TASK_013) | MEDIUM | Use a strict char-by-char check or `crypto.randomUUID().length === 36` + simple format check via `String.split('-')`, NO regex on the hot path. Recorded in [[sonar_quality_gate_gotchas]] | Local sonar pre-PR |
| busboy upstream advisory or breaking change in a future bump | LOW | Wrapped in `lib/multipart-parser.js` per §"Wrap external dependencies"; swap is local to the wrapper | Dependabot / manual review at version bump |
| Smoke heap-invariant fails on a developer machine with constrained RAM | LOW | The smoke measures JS heap, not RSS — host RAM pressure doesn't move the needle. If the assertion fires, the regression is real, not environmental | Smoke output reproducible across machines |

## Implementation Strategy

**Order matters: streaming pipeline FIRST, then verification. No "build wrong, then measure, then maybe fix."**

1. **Write tests first** (TDD, AAA) — `multipart-parser.test.js` (5 cases) → `video-storage.test.js` (10 cases) → `upload.test.js` (7 cases) → extend `env.test.js`
2. Promote `VideoSource` typedef to `packages/shared/src/types.js`
3. Extend `config/env.js` with the three new vars; add JSDoc
4. Implement `lib/multipart-parser.js` — thin streaming wrapper over busboy. Add `busboy` to `apps/server/package.json` dependencies
5. Implement `storage/video-storage.js` as a factory. Streaming `save({ stream, ... })` via `stream.pipeline(input, fs.createWriteStream(...))`. Atomic rename. Sidecar JSON atomic. Uses `node:fs/promises`, `node:crypto`, `node:stream`. No regex on the hot path. Mime → ext via Map. Id validation via `length === 36 && [0-9a-f-]` char check
6. Implement `routes/upload.js`. Streaming entry: `Readable.fromWeb(c.req.raw.body)` → `parseMultipartUpload(stream, { ... })` → `storage.save({ ... })`. NO `c.req.parseBody()` anywhere
7. Mount the route in `server.js`; compose the storage instance; call `await storage.init()` inside the `isMain` block
8. Add `apps/server/.tmp/` to root `.gitignore`
9. Implement `scripts/smoke-heap.js` + `package.json` script `smoke:heap`
10. Run gates in order: `pnpm lint` → per-workspace `pnpm -F @gospelviral/server exec vitest run --coverage` + `pnpm -F @gospelviral/shared exec vitest run --coverage` (see [[pnpm_workspace_test_coverage_flake]]) → curl smoke (small MP4) → **`pnpm -F @gospelviral/server smoke:heap` (1.5 GiB, in-process, must PASS — see DF)** → `set -a; source .env.local; set +a; pnpm sonar` (see [[sonar_env_sourcing]])
11. Black-box auditor; close gaps on the same branch; open PR with the SonarCloud block + the heap-invariant CSV summary

## Known follow-ups (NOT in scope of TASK_014)
- **`/api/upload/video/:id/stream`** route — wired in Phase 5 (TASK_017-ish) when the `<video>` element needs the bytes. `storage.stream` already exists by then
- **Range requests / partial content** on the stream route — required for `<video>` seeking; lands in Phase 5
- **Server-side video metadata (codec / fps / resolution / duration)** — lands in Phase 6 when the FFmpeg export pipeline needs it. **Lands as a SEPARATE module `apps/server/src/runtime/video-metadata.js`** (likely shelling out to `ffprobe`), NOT retrofitted into the `VideoSource` shape. `VideoSource` stays a **reference** to the file; metadata is a different concern with a different module
- **Runtime memory inspection endpoint** (`/debug/mem` or similar) — if operational visibility into live heap is wanted later, that lands as a separate task with its own threat-model review (auth, env-gating, exposure surface). NOT in scope of TASK_014 — the heap-invariant smoke is the in-process replacement (DF)

## Prerequisite Subtasks (MANDATORY)

### SUBTASK_014.P1: GitFlow Workflow
**Status**: ⏱️ Not Started
- Create feature branch from `develop`: `feature/task-014-video-upload-backend`
- Conventional commits scoped `(server)`, `(shared)`, `(multipart)`, `(storage)`:
  - `feat(shared): VideoSource primitive + mime allowlist default`
  - `feat(server): env vars VIDEO_UPLOAD_DIR / MAX_UPLOAD_SIZE_BYTES / VIDEO_ALLOWED_MIMES`
  - `feat(multipart): busboy streaming wrapper`
  - `feat(storage): video-storage factory with streaming save + cleanup`
  - `feat(server): POST /api/upload/video + GET /:id/info`
  - `chore(server): wire upload router + initVideoStorage; .gitignore apps/server/.tmp/`
  - `chore(server): smoke-heap script (heap-invariant smoke)`
- PR targets `develop`; trailer `Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>`
- Source branch deleted after merge

### SUBTASK_014.P2: Tests Workflow
**Status**: ⏱️ Not Started
- TDD Red→Green→Refactor for the storage module, the route handler, the env additions
- AAA pattern; per-workspace coverage runs ([[pnpm_workspace_test_coverage_flake]])
- Cognitive Complexity ≤ 15 per function on touched files

### SUBTASK_014.P3: Task Finalization
**Status**: ⏱️ Not Started
- `pnpm lint` = 0
- Per-workspace coverage runs producing fresh lcov files (see [[pnpm_workspace_test_coverage_flake]] + [[sonar_quality_gate_gotchas]])
- Curl smoke (small ~1 MB MP4): upload, assert response + file on disk + cleanup on restart
- **`pnpm -F @gospelviral/server smoke:heap` → PASS (delta heap < 50 MB during 1.5 GiB upload)** — this gate FAILS the task if exceeded; PR is blocked until the pipeline regression is fixed (see DF + INVARIANTS)
- `set -a; source .env.local; set +a; pnpm sonar` → Quality Gate = PASS; `javascript:S3776 = 0` on new code (see [[sonar_env_sourcing]])
- Evidence dir: `memory_bank/tasks/evidence/task_014/` with sonar PASS JSON / S3776=0 JSON / full scan log .txt / curl smoke transcript / **`heap-invariant.csv` (heap series + assertion result)**
- Black-box auditor invoked; gaps closed in-branch
- PR description includes the SonarCloud block (timestamp, commit SHA, branch, PASS, coverage, javascript:S3776 = 0) + the heap-invariant summary line (baseline → max → delta, PASS)

## Subtasks (Pass 2)

- **SUBTASK_014.1** — `VideoSource` typedef + `VIDEO_MIME_ALLOWLIST_DEFAULT` const in `@gospelviral/shared`; smoke import test
- **SUBTASK_014.2** — `apps/server/src/config/env.js` extension (3 new vars: `VIDEO_UPLOAD_DIR`, `MAX_UPLOAD_SIZE_BYTES`, `VIDEO_ALLOWED_MIMES`) + 6-case env suite
- **SUBTASK_014.3** — `apps/server/src/lib/multipart-parser.js` (busboy wrapper) + 5-case suite. Adds `busboy` to `apps/server/package.json`
- **SUBTASK_014.4** — `apps/server/src/storage/video-storage.js` factory (streaming `save`, sidecar JSON, atomic write, cleanup) + 10-case suite
- **SUBTASK_014.5** — `apps/server/src/routes/upload.js` + `apps/server/src/lib/upload-validation.js` + 7-case integration suite (router constructed with `maxBytes: 1024` via DI)
- **SUBTASK_014.6** — `apps/server/src/server.js` wiring + boot-time `storage.init()` + root `.gitignore`
- **SUBTASK_014.7** — `apps/server/scripts/smoke-heap.js` + `package.json` `smoke:heap` script + curl smoke + sonar + black-box auditor + PR composition
