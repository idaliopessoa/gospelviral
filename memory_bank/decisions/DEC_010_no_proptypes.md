# DEC_010: JSDoc typedefs instead of runtime PropTypes (S6774 ignored)

Date: 2026-05-28
Status: Accepted

## Decision
Components do NOT declare `propTypes`. The component contract is documented
via JSDoc typedefs in `packages/shared/src/types.js` (the same place the
server uses for `Moment`, `AnalysisResponse`, `SubtitleConfig`, etc.) and via
the prop list at the top of each component's signature.

Sonar's `javascript:S6774` ("missing in props validation") is project-wide
ignored in `sonar-project.properties`.

## Why
- The project is intentionally TS-free for the migration phase
  (`01-Systems-Architecture-Expert-viral-cristao.md` §"Stack"). Layering
  runtime PropTypes on top of JSDoc duplicates the contract without adding
  the type-guarantee TS would.
- The package `@gospelviral/shared` already owns the canonical primitive
  shapes via JSDoc; PropTypes would be a redundant runtime restatement.
- Vitest specs already exercise the props as the public surface; mismatches
  show up there.

## Consequences
- Tests are the contract enforcement layer, not PropTypes.
- When this codebase eventually moves to TypeScript, JSDoc typedefs port
  directly; PropTypes would have been throwaway scaffolding.
