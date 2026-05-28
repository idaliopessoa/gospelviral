# DEC_020: CLI precedence when both modes are available

Date: 2026-05-28
Status: Accepted

## Decision
When both the `claude` CLI is on PATH AND `ANTHROPIC_API_KEY` is set,
`detectRuntime` recommends `'cli'`.

## Why
- The CLI bills the user's existing Pro/Max/Team subscription — no marginal
  cost per analyze. The API path bills per token directly to the project's
  Anthropic account.
- The CLI authenticated via the user's local Claude Code session never
  exposes the API key to the server process.
- The artifact-era plan (`claude-code-bootstrap.md`) explicitly calls CLI
  the preferred mode and API the fallback.

## Consequences
- TASK_010's frontend badge says "via Claude Code CLI" by default whenever
  the CLI is detected, regardless of whether the API key is set.
- The user can force the API path by passing `mode: 'api'` in the
  `/api/analyze` body (TASK_009 honors the override). Detection only
  recommends; it does not dictate.
