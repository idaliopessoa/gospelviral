# DEC_005: SonarCloud scanner = `@sonar/scan` (Node CLI), not the Java `sonar-scanner`

Date: 2026-05-28
Status: Accepted

## Decision
Use the Node-based `@sonar/scan` CLI (binary name: `sonar`) as the local Quality Gate runner. Properties are committed in `sonar-project.properties`; `SONAR_TOKEN` lives only in `.env.local` (gitignored) and is read from the shell env at scan time.

## Why
- ESM-friendly, lighter dependency than the Java standalone.
- Official replacement from SonarSource for JS-heavy projects.
- No Java toolchain required on the developer box.

## Consequences
- Scaffold install: globally installed (`/Users/idaliopessoa/.nvm/versions/node/v24.15.0/bin/sonar`, v4.3.6 verified).
- Token never appears in any committed file. Pre-PR check: `git grep` for the token returns empty.
- Local `sonar` is the only Quality Gate (zero CI by design).
