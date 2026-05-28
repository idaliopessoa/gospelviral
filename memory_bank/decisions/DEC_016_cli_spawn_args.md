# DEC_016: Claude CLI spawn args

Date: 2026-05-28
Status: Accepted (verified against claude 2.1.153 live smoke)

## Decision
The `runViaCli` adapter spawns the binary with:

```
claude -p \
  --output-format stream-json \
  --verbose \
  --permission-mode bypassPermissions \
  --model <wire-format slug>
```

When the capability probe reports `--include-partial-messages` is available,
the flag is appended. The transcript is delivered via stdin (DEC_017); the
user message never enters argv.

## Why
- `-p` (print mode) is what makes the CLI emit a one-shot non-interactive
  response. Without it the CLI tries to open an interactive session.
- `--output-format stream-json --verbose` produces the line-delimited
  typed-event stream the parser is designed to consume. (As of 2.1.153
  `--verbose` is required for stream-json to emit a `system/init` event with
  capability information; without it the event sequence is incomplete.)
- `--permission-mode bypassPermissions` avoids the interactive permission
  prompt that has no TTY in server context.
- `--model <slug>` pins to the resolved Anthropic model from TASK_005's
  `resolveModel`.
- `--include-partial-messages` (when available) gives richer streaming so a
  future progress UI can show "thinking" segments. Not required for the
  current end-to-end JSON extraction.

## Consequences
- The args list is the spawn contract; the test (`claude-cli.test.js`)
  asserts it line-by-line. Any change here requires a smoke re-run against
  the live binary.
- Cross-platform PATH resolution stays in TASK_008 (`apps/server/src/runtime/detect.js`);
  this adapter only receives an already-resolved `binPath`.
