# DEC_025: localStorage persists visual presets only

Date: 2026-05-28
Status: Accepted

## Decision
`localStorage` is the SSOT for the visual presets:
`subtitleConfig`, `videoConfig`, `overlayConfig` (without `dataURL`),
`isConfigCollapsed`. Schema version is pinned at `1`; key is
`viral-cristao:config:v1`.

Deliberately **NOT** persisted:
- `url`, `transcript`, `results`, `error`, `view` — session-only by design.
- `overlayConfig.dataURL` and `overlayConfig.filename` — the overlay PNG is
  re-uploaded each session.
- `runtime.forcedMode` — per DEC_023 the mode override is session-only.

## Why
- Visual presets are work the user invested time in (fine-tuning subtitle
  font, anchor, offsets). Losing them on reload is the painful regression.
- Analysis state is large and short-lived; persisting it would invite a
  stale-results problem after the underlying transcript or model rotates.
- The overlay PNG is potentially multi-megabytes; `localStorage` ceiling
  on most browsers is ~5 MB per origin. A single overlay could fill the
  budget. The UI documents the constraint via "overlay não é salvo entre
  sessões" copy (a future polish task; not blocking).

## Consequences
- `loadVisualPresets` strips `dataURL` and `filename` on read AND on write
  so a future bug in upstream state cannot leak the PNG into storage.
- Schema mismatch (e.g. a v2 release reading a v1 payload) returns
  defaults and removes the v1 entry; future migrations explicitly opt-in
  by reading the old key once before writing the new one.
- Corrupted JSON is treated as cache miss: defaults returned, key removed,
  one warn emitted (not an error). The app does not crash.
