# DEC_030: Strip `ANTHROPIC_API_KEY` from the Claude CLI child env

Date: 2026-05-28
Status: Accepted (hotfix on top of DEC_020)

## Decision
`runViaCli` builds an explicit `env` for the child process and removes
`ANTHROPIC_API_KEY` before spawning the `claude` binary, regardless of the
key's validity:

```js
const { ANTHROPIC_API_KEY: _stripped, ...childEnv } = process.env;
spawn(binPath, args, { ...options, env: childEnv });
```

## Why
- The Claude Code CLI prefers `ANTHROPIC_API_KEY` over the OAuth/keychain
  session when the env var is set, regardless of validity. If the key is
  rejected (e.g. the intentionally-invalid placeholder in `.env.local`),
  claude exits 1 **without writing anything to stderr**, leaving the
  adapter with `cli_nonzero_exit` and no diagnostic clue.
- The CLI path is supposed to ride the user's subscription (DEC_020) even
  when the server holds an API key — the two channels are independent.
- Local-dev defaults (DEC_005 → `.env.local` carries an invalid sentinel)
  weaponized the leak: every CLI spawn from the server failed in prod-like
  conditions while unit tests (mocked spawn) stayed green.

## Consequences
- New unit spec in `claude-cli.test.js`
  ("strips ANTHROPIC_API_KEY from the child env...") asserts the spawn
  options pass an `env` object that does NOT carry the key, even when the
  current process has it set.
- API adapter (`claude-api.js`) is unaffected — it reads `env.apiKey`
  from `config/env.js` and supplies the header explicitly, so the in-process
  env var is the legitimate source there.
- Future adapters that wrap an external binary should follow the same
  pattern: do not blindly inherit `process.env`; pass a sanitized subset.

## Discovered during
Live smoke at 2026-05-28T15:32Z. Browser submitted a real 68 KB transcript,
server returned 502 `cli_nonzero_exit` repeatedly. Manual reproduction
isolated the env var as the cause: same spawn args, same stdin, exit 0
without the key vs exit 1 with the invalid key.
