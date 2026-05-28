# DEC_028: `ROADMAP.md` lives at the repo root

Date: 2026-05-28
Status: Accepted

## Decision
The forward-looking roadmap is committed at `/ROADMAP.md`, not under
`memory_bank/`.

## Why
- `memory_bank/` is the task-protocol working set (tasks, decisions,
  evidence) — internal scaffolding the project uses to coordinate work.
- The roadmap is user-facing — anyone reading the repo can find it
  alongside `CLAUDE.md` and the existing architecture docs.
- Repo-root visibility aligns with the typical GitHub convention.

## Consequences
- New roadmap items go into `ROADMAP.md` directly; the task files no
  longer need a "future work" section.
- The deferred items already recorded inside task files (see
  `memory_bank/tasks/task_011_localstorage_persistence.md` → "Multi-tab
  race" line) are linked from `ROADMAP.md` rather than restated.
