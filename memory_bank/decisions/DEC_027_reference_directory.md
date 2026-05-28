# DEC_027: `reference/` directory convention for frozen artifacts

Date: 2026-05-28
Status: Accepted

## Decision
Frozen artifacts and historical reference material live under `reference/`
at the repo root. The first occupant is
`reference/viral-cristao-artifact.jsx` (moved from the repo root by
TASK_012's `git mv`).

`reference/` files are NEVER imported by either `apps/web` or `apps/server`.
They are read-only documentation: a future maintainer can diff the live
code against the frozen artifact to confirm behavioral parity.

## Why
- Keeping the original artifact at the root made it look like an active
  source file long after TASK_002/003/004 finished porting it.
- A dedicated `reference/` folder marks the file as historical at a glance
  and prevents accidental imports.
- `git log --follow reference/viral-cristao-artifact.jsx` preserves the
  full pre-move history.

## Consequences
- ESLint flat config already ignores `viral-cristao-artifact.jsx`; the rule
  follows the file to the new path because the ignore is by name pattern.
- Any future "frozen reference" (e.g., a captured production stream-json
  fixture) goes under `reference/` and inherits the same do-not-import
  policy.
