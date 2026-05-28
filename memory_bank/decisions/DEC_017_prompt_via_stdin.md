# DEC_017: Prompt delivery via stdin is mandatory for the CLI adapter

Date: 2026-05-28
Status: Accepted

## Decision
`runViaCli` ALWAYS writes the composed `systemPrompt + "\\n\\n" + userMessage`
to the child process's stdin and then ends the stream. The prompt never
appears in the spawn argv.

A spec asserts that no byte of `userMessage` is present in any element of
the argv passed to the spawn implementation.

## Why
- `OPTIMIZED_PROMPT` is ~4.6 KB and `EXAMPLE_TRANSCRIPT` ~3.3 KB; real
  pregação transcripts run 30–60 KB. Combined easily exceeds the 32 KB
  Windows `CreateProcess` limit (`ENAMETOOLONG`) and approaches the Linux
  `ARG_MAX` ceiling (`E2BIG`).
- argv is logged by most process inspectors (`ps`, audit logs); stdin is
  ephemeral and not captured by default.
- Avoids quoting/escaping pitfalls with the JSON-heavy prompt body.

## Consequences
- The adapter writes the prompt with explicit `'utf8'` encoding to defeat
  the platform's default 8-bit handling.
- Tests stub the child's `stdin.end` to confirm the call shape.
