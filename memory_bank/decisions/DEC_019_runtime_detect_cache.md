# DEC_019: Runtime detection memoization (60s TTL)

Date: 2026-05-28
Status: Accepted

## Decision
`detectRuntime` memoizes the PATH walk for 60 seconds, keyed on the
`binCandidates` array. `clearDetectionCache()` (also exposed) busts every
cache entry; the `/api/runtime/detect?refresh=true` query in TASK_009 will
call it on demand. The `apiKey` field on a cached result is refreshed
in-place on every call so a key set later in-process is reflected without
re-walking PATH.

## Why
- 60s is short enough that a user installing the CLI mid-session sees the
  badge update via the next render (re-renders typically happen on tab
  switch or refresh).
- 60s is long enough that the badge poll the frontend will do in TASK_010
  does not constantly stat the filesystem.
- The PATH walk is the expensive bit; the API-key check is cheap and
  unrelated, so refreshing it from the cached result is free and avoids
  stale `recommended` values.

## Consequences
- Tests pass `ttlMs: 0` when they need to force a re-probe without manually
  calling `clearDetectionCache()`.
- Production callers (TASK_009) get the default 60s and `clearDetectionCache`
  on the explicit `refresh=true` query parameter.
