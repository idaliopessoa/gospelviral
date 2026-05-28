# DEC_026: Overlay PNG is session-only (excluded from persistence)

Date: 2026-05-28
Status: Accepted

## Decision
The overlay's `dataURL` (the PNG itself) and the original `filename` are
stripped before `saveVisualPresets` writes. On `loadVisualPresets`, both
fields are forced to `null`. Only the `opacity` value persists across
reloads.

## Why
- PNG data URLs encode the file in base64; even a small overlay can be
  hundreds of KB. Localized to the ~5 MB `localStorage` ceiling per
  origin, one careless overlay can blow the budget and break ALL future
  writes (the same module also persists subtitle and video state).
- Re-uploading the PNG is a single click; persisting it is not worth the
  fragility.

## Consequences
- TASK_011's `persistence.test.js` asserts the strip happens at both
  read and write — even a future bug in caller code can't write the
  PNG to disk.
- A future "save overlay to IndexedDB" task is a sensible ROADMAP item if
  user feedback complains about the re-upload friction.
