# DEC_023: `forcedMode` is session-only (not persisted)

Date: 2026-05-28
Status: Accepted

## Decision
The runtime mode override the user picks via the `ModeBadge` popover
(`Auto / CLI / API`) is held in React state by `useRuntime` and lasts only
until the page reloads. It is NOT written to `localStorage`.

## Why
- Persistence in TASK_011 covers visual config (subtitle/video/overlay) —
  artifacts the user spent time tuning. A mode override is a transient
  troubleshooting knob and surviving a reload could mask "I uninstalled
  the CLI but it still tries CLI" confusion.
- Detection runs on every mount and is the SSOT for what's available;
  forcing a mode is a session-level demand.

## Consequences
- TASK_011 explicitly excludes `forcedMode` from the persisted keys list.
- The badge popover's default radio on every page load is `Auto`.
