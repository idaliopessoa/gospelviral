# DEC_006: Expected Quality Gate FAIL on the scaffold scan ("Coverage on New Code")

Date: 2026-05-28
Status: Accepted (documented exception)

## Decision
The first SonarCloud scan after TASK_001 lands is expected to return **Quality Gate FAIL** on `new_coverage`. The TASK_001 PR description records the verdict; it is NOT a bug, NOT to be worked around silently.

## Why
- TASK_001 ships zero new business logic by design — scaffolding only.
- Smoke tests live in the scaffold (App renders, healthz=200, barrel imports) so the scan can run, but they exercise trivial surface and won't meet "Sonar way" coverage-on-new-code thresholds.

## Remediations (human picks one — agent does NOT decide)
1. Temporarily relax the QG to ignore coverage until TASK_002 lands the first real testable code.
2. Accept the FAIL as a documented exception in the PR description, scheduled to clear on TASK_002.
3. Wait to scan until TASK_002 is merged.

## Consequences
- Bypassing the gate or skipping the scan is forbidden.
- Reporting the FAIL to the human is mandatory; this DEC is the link referenced in the PR description.
