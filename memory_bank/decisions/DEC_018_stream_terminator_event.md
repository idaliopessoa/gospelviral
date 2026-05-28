# DEC_018: Stream-json terminator event is `type: "result"`

Date: 2026-05-28
Status: Verified against claude 2.1.153 live smoke

## Decision
The parser treats the JSON-line event with `type: "result"` as the
terminator. Its `result` field carries the model's final text. Subtype
`success` signals normal completion; `error` (or `is_error: true`) signals
the CLI failed mid-stream and is mapped to `AdapterTransportError` with
code `cli_error_event`.

The captured live-smoke fixture lives at
`apps/server/src/parsers/__fixtures__/smoke-events.jsonl` (last 3 lines:
two `assistant` events followed by the terminating `result` event).

## Why
- The architecture-doc plan flagged this as the one detail that could only
  be confirmed with a live binary; the smoke run produced a definitive
  answer.
- Treating `result` as the terminator (rather than waiting on stream EOF
  alone) lets the adapter short-circuit on error events instead of waiting
  for the process to close on its own timeline.

## Consequences
- A future CLI release that renames the terminator (e.g., to `final` or
  `done`) would require:
  1. Re-running `pnpm -F @gospelviral/server smoke:cli --yes` and updating
     the fixture.
  2. Editing `extractResultText` in `apps/server/src/parsers/stream-json.js`.
  3. Updating this DEC with the new event name.
- The unknown-event fallback in the parser (`type: "unknown", raw`) keeps
  the adapter resilient to additive schema changes — only a terminator
  rename is breaking.
