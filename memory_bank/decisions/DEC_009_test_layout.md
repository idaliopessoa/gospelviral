# DEC_009: Test layout — co-located `*.test.{js,jsx}` next to source

Date: 2026-05-28
Status: Accepted

## Decision
Vitest specs live **next to the source file they exercise**, named
`<source>.test.{js,jsx}`. No `__tests__/` subdirectory.

## Why
- One-click navigation between source and spec; no folder jump.
- Vitest's per-workspace `include` glob already picks them up
  (`src/**/*.test.{js,jsx}`).
- Keeps the diff for any single behavior change scoped to one folder.

## Consequences
- Applies uniformly across `apps/web`, `apps/server`, and `packages/shared`.
- Coverage instruments only `src/**`; specs themselves are excluded from
  the numerator by v8's default heuristics.
