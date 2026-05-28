# DEC_011: Sibling-text labels in form controls — accessibility roadmap

Date: 2026-05-28
Status: Accepted (with explicit roadmap follow-up)

## Decision
`SubtitleControls.jsx` (and a few others) keep the artifact's pattern of
`<label>` siblings adjacent to a `<select>` / `<input>` instead of `htmlFor`
+ `id` pairing. Sonar's `javascript:S6853` ("a form label must be associated
with a control") is project-wide ignored in `sonar-project.properties`.

## Why
- The artifact relies on visual proximity for label association. Adding
  `htmlFor` + matching `id` on every field would re-shape every control's
  JSX and risk regressions in the parity pass.
- The current pattern is a usability gap, not a correctness gap; the UI is
  still usable for sighted/mouse users.

## Consequences
- **Roadmap item**: a dedicated accessibility pass after TASK_012 closes
  Phase 1, wiring `id` + `htmlFor` on every form control and adding
  `aria-label` where text is too far from the control.
- Screen-reader users hit a degraded experience until that pass lands —
  document this caveat in the public README when TASK_012 rewrites it.
