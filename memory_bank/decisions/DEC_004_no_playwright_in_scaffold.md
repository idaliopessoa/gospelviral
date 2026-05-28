# DEC_004: Playwright removed from scaffold

Date: 2026-05-28
Status: Accepted

## Decision
No Playwright in the scaffold. UI verification for TASK_004 / TASK_010 / TASK_011 rides on the Chrome DevTools MCP the agent connects to: `navigate` → `take_screenshot` → `list_console_messages` → `list_network_requests` → `evaluate`.

## Why
- Without a snapshot regression suite, Playwright is dead weight: install cost, browsers download, CI surface (we have zero CI), maintenance overhead.
- Chrome DevTools MCP already provides the same primitives the audit needs (load page, screenshot, capture console+network) without any in-repo dependency.

## Consequences
- Browser smoke evidence in PR descriptions = MCP screenshots + console transcript.
- ROADMAP item: re-introduce Playwright if/when snapshot-based regression coverage becomes worthwhile.
