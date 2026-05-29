# TASK_018 — playback bug investigation (real large video)

## Symptom
Real video uploaded, PLAYER mode: play button shows, clicking ▶ does nothing — video frozen.

## Evidence captured (pre-reboot session, controlled Chrome)
Per-card `<video>` state after clicking play on card 0:
- card 0 (active): `paused:false`, `readyState:1` (HAVE_METADATA only), `networkState:IDLE`, `buffered:none`, `currentTime:5305`, `duration:6192.46`, `error:null`
- cards 1-4 (paused): same file, `currentTime` 5111 / 4935 / 5440 / 4751 — NONE at their expected startSec (68/400/530/302/210)
- 8 media requests to `/stream`, all 206
- duration 6192s (~103min) → large real file (likely multi-GB)

## Key anomaly
`currentTime` lands ~5000s (scattered per card) instead of each card's `startSec`. Setting `videoEl.currentTime = startSec` (68) → ends at ~5305. Seek lands wrong / data never usable (`buffered:none`, `networkState:IDLE`).

## Hypotheses (ranked)
1. **`meta.sizeBytes` ≠ actual on-disk file size.** If sidecar size > real file, `Content-Length`/`Content-Range` over-promise → server streams fewer bytes than declared → browser stalls waiting for bytes that never come → frozen, `buffered:none`. Seek `currentTime=68` may clamp to `seekable` end (~where moov-end data sits) → ~5000s. TEST: stat disk file vs sidecar `sizeBytes` right after upload.
2. **Upload truncated.** Large file > MAX_UPLOAD_SIZE_BYTES (2 GiB) → busboy truncates → partial file, size mismatch as in (1). Or upload cut by proxy timeout.
3. **Seek-on-not-ready.** `videoEl.currentTime = startSec` set before metadata/seekable ready → clamped. (client side, useVideoPlayback)

## 504 finding — ROOT CAUSE FOUND (separate from the player bug)
**The 504 is on `POST /api/analyze` (real LLM analysis), NOT upload/stream.** User clarified: they send URL + transcript and click "Analisar" (not uploading a video).

Origin pinned: `apps/server/src/routes/analyze.js`
- handler does `withTimeout(adapter.fn(...), c.req.raw.signal, timeoutMs=600000, abortController)`.
- `withTimeout` aborts on EITHER (1) `setTimeout(abort, 600000)` = 10-min app timeout, OR (2) `c.req.raw.signal` firing = **client/proxy DISCONNECTED mid-analysis**.
- abort → adapter throws `AbortError` → `mapAdapterError` (analyze.js:47) → **HTTP 504 `{code:'timeout', message:'Analysis exceeded the timeout.'}`**.

So a 504 means the analyze run was aborted. Sequential/fast 504s ⇒ almost certainly trigger (2): the Vite dev proxy (`http-proxy`, no `proxyTimeout` set) or the browser drops the long-held connection before the CLI analysis finishes → `c.req.raw.signal` aborts → 504. (10-min app timeout would make the user wait 10 min, which doesn't match "sequential".)

Confirmed NOT a generic upload/proxy problem:
- direct :8787 and via-proxy :5173 uploads of tiny.mp4 → 200, instant.
- 1.5 GB upload via proxy → 200, ~2.5 s.
- 2.5 GB (> 2 GiB cap) → clean 400 file_too_large (cap works, no hang).

TO INVESTIGATE / fix options (analyze flow, TASK_009/010 — out of TASK_018 scope):
- (a) measure real elapsed-time-to-504 (user) to confirm disconnect vs 10-min timeout.
- (b) the real fix is SSE/streaming progress (DEC_021 roadmap) so headers flush early + connection stays alive; OR keep-alive pings; OR tune proxy/socket timeouts for dev.
- (c) NOTE: server `serve()` (@hono/node-server) uses Node defaults (requestTimeout 300s, headersTimeout 60s) — these govern receiving the REQUEST, not a slow response, so not the direct cause, but worth revisiting alongside SSE.

## NOTE: cleanup-on-boot leaves an orphan `.tmp` on >2GiB reject
During testing, a > 2 GiB upload (rejected 400) left a `<uuid>.tmp` (2048 MB) in the upload dir. The error path's `safeUnlink(p.tmp)` may not cover the busboy-limit branch. Minor; verify in the upload route's error handling (TASK_014 territory). Boot `init()` clears the dir anyway.

## Player bug (currentTime=5305) — STILL OPEN, needs a separate clean repro
The frozen-playback / wrong-currentTime investigation (top of this file) is unrelated to the 504. To repro: use "Ver exemplo pronto" (skips analyze, no 504) → upload a video → collapse → play. Then stat sizeBytes vs disk + read [stream-debug].

## Range/route code reviewed — looks correct at HTTP level
- `lib/range.js` parseRangeHeader: handles `bytes=A-`, `A-B`, `-N`; clamps end; correct.
- `storage.streamRange`: `createReadStream(file, {start,end})`, returns `size: meta.sizeBytes`. Correct IF sizeBytes accurate.
- `routes/upload.js` GET `/:id/stream`: 206 + Content-Range `start-end/size` + Content-Length `end-start+1`. Correct IF sizeBytes accurate.
→ Everything hinges on `meta.sizeBytes` being the TRUE file size. Verify next.

## Next step
Clean run (NO source edits mid-test → no restart): upload → immediately `stat` disk file vs sidecar sizeBytes → play → read monitor `[stream-debug]` lines (Range asked vs size served) → inspect `<video>` state.

## Temporary instrumentation in tree (REMOVE before merge)
- `apps/server/src/routes/upload.js`: `console.log('[stream-debug] ...')` in GET /:id/stream.
