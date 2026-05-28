# DEC_012: Visual parity evidence format for TASK_004

Date: 2026-05-28
Status: Accepted

## Decision
TASK_004 parity is captured as a textual checklist plus Chrome DevTools MCP
screenshots, console transcript and network transcript, all committed under
`memory_bank/tasks/evidence/task_004/`. No snapshot-based pixel-diff
regression suite ships with TASK_004.

## Why
- Playwright was deliberately excluded from the scaffold (DEC_004). Adding it
  just for this task would invert that decision without paying the
  installation/setup cost across the rest of Pass 1.
- Chrome DevTools MCP already exposes `take_screenshot`,
  `list_console_messages`, `list_network_requests`, `evaluate_script` — the
  primitives needed for an audit-time parity check, no in-repo dependency.
- The artifact behavior is the SSOT; a human comparison against the artifact
  running in its host (Block 1 gate) closes the parity verdict for Phase 1.

## Consequences
- Pixel-perfect regression testing is a ROADMAP item; only re-introduced if
  later phases need it (e.g. for `SubtitlePreview` drag math edge cases that
  jsdom can't probe).
- The PR description for TASK_004 must include the textual checklist plus
  the two screenshots; the audit verifies they exist on disk.
