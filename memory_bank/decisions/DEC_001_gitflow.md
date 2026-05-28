# DEC_001: GitFlow (main + develop) over trunk-based

Date: 2026-05-28
Status: Accepted

## Decision
Use GitFlow with `main` (production) and `develop` (integration). Feature branches off `develop`: `feature/task-XXX-<kebab>`.

## Why
- Migration runs in 12 bounded tasks; each task = one feature PR; clean per-task auditability.
- `main` stays releasable; `develop` absorbs in-flight integration risk.
- Trunk-based would require a green CI to protect `main`; zero CI on this repo by design.

## Consequences
- All TASK_002..TASK_012 branch from `develop`.
- Auto-merge target: `develop`. Release-to-`main` happens later as a batch.
