# DEC_003: ESLint flat config

Date: 2026-05-28
Status: Accepted

## Decision
Single root `eslint.config.js` (flat config) over per-package `.eslintrc.*`.

## Why
- ESLint 9 deprecates legacy config.
- Cross-package import rules expressed once: block `react`/`react-dom` in `packages/shared/`, block `@anthropic-ai/*` outside `apps/server/src/runtime/`.
- One file to audit for security/policy rules.

## Consequences
- All packages share base rules; per-package overrides scoped by `files:` glob.
