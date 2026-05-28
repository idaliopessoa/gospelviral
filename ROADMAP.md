# ROADMAP

Forward-looking items deferred during the artifact → monorepo migration.
Each entry links back to the originating task file so the rationale stays
discoverable.

## SSE streaming for `/api/analyze`
- **Scope**: medium
- **Why deferred**: TASK_009 ships a JSON-only envelope (`{ status: 'ok', data }`)
  to keep the contract tight while both adapters wired up. The analyzing-view
  loading messages stay client-side timed in the meantime.
- **Open questions**: should the SSE event stream the CLI adapter's
  intermediate `assistant` events (thinking + tool_use) verbatim, or only
  the final `result`? The CLI parser tags every event today; the route
  would need to choose.
- **Source**: `memory_bank/tasks/task_009_analyze_endpoint.md` ("Decisions
  Generated" → SSE deferred).

## Playwright snapshot regression
- **Scope**: large
- **Why deferred**: DEC_004 explicitly excluded Playwright from the
  TASK_001 scaffold. Browser-driven verification today runs through the
  Chrome DevTools MCP; introducing Playwright is only worth the install
  + maintenance cost when there is a real pixel-diff regression suite
  to feed.
- **Open questions**: which snapshot tool — Playwright's
  `toMatchSnapshot` or a pure visual diff like `pixelmatch`? Storage of
  baseline images (LFS vs in-repo)?
- **Source**: `memory_bank/decisions/DEC_004_no_playwright_in_scaffold.md`.

## IndexedDB-backed overlay PNG store
- **Scope**: medium
- **Why deferred**: TASK_011's `localStorage` ceiling (~5 MB per origin)
  forced the overlay `dataURL` to be stripped (DEC_026). IndexedDB has
  gigabyte-scale quotas and stores binary `Blob`s natively, which would
  let the overlay survive reloads without bloating the visual-presets
  payload.
- **Open questions**: a single keyed `Blob` per overlay, or per-config
  set? Migration from the current strip-on-write semantics to
  binary-blob storage?
- **Source**: `memory_bank/tasks/task_011_localstorage_persistence.md` →
  DEC_026.

## Apify integration (transcript auto-pull)
- **Scope**: medium
- **Why deferred**: out of scope for the artifact-port migration. The
  existing UX assumes the user pastes the transcript manually
  (`claude-code-bootstrap.md` describes the YouTube "Mostrar transcrição"
  copy-paste path). Auto-pulling needs an Apify token, rate-limit
  handling, and a fallback when YouTube changes its transcript layout.
- **Open questions**: free Apify quota envelope; YouTube ToS posture for
  automated transcript scraping.
- **Source**: `claude-code-bootstrap.md` §"Confirme antes de começar".

## Multi-vídeo (analyze multiple pregações in sequence)
- **Scope**: large
- **Why deferred**: the current `App` state machine is built around
  one URL + one transcript at a time. Multi-vídeo touches the input
  view, the analyzing view (queue + progress), the results view (cross-
  vídeo comparison), and the backend (request batching).
- **Open questions**: are batches processed serially server-side, or
  parallel with a concurrency cap? Cross-vídeo comparison UI shape?
- **Source**: `claude-code-bootstrap.md` §"Confirme antes de começar".

## Export ZIP (text assets + thumbnail per moment)
- **Scope**: small
- **Why deferred**: the artifact UX is "copy individual blocks for each
  moment". A ZIP export of all five moments' hooks, captions, hashtags,
  and CTA text — plus a thumbnail snapshot of the 9:16 preview — would
  cut the copy-paste loop dramatically but is independent of the
  dual-mode backend work.
- **Open questions**: server-side render of the preview canvas (Puppeteer?)
  or client-side `dom-to-image`? Filename scheme inside the ZIP?
- **Source**: `claude-code-bootstrap.md` §"Confirme antes de começar".

## Cross-tab `localStorage` sync
- **Scope**: small
- **Why deferred**: TASK_011 explicitly documents the "last write wins"
  behavior across multiple browser tabs as acceptable. A `storage` event
  listener can broadcast changes to the visual presets without any
  server hop.
- **Open questions**: which tab's `forcedMode` wins on a cross-tab
  conflict (mode is session-only per DEC_023)? Should the listener
  refresh the whole hook state or just the changed config?
- **Source**: `memory_bank/tasks/task_011_localstorage_persistence.md`
  Risk Assessment.

## i18n beyond PT-BR
- **Scope**: large
- **Why deferred**: TASK_002 isolated the Portuguese scripture book regex
  in its own module (`apps/web/src/lib/scripture-books.js`), so a future
  i18n pass can swap the locale-specific source data without touching
  `highlightText`. The rest of the UI copy is still hard-coded PT-BR.
- **Open questions**: react-intl vs lingui vs vanilla i18next? Are
  scripture book names the only thing that needs locale-specific data,
  or do the hook templates in the prompt need translation too?
- **Source**: TASK_002 implementation notes for `scripture-books.js`.

## Promote `OPTIMIZED_PROMPT` to a server-only subpath
- **Scope**: small
- **Why deferred**: today the prompt lives in `@gospelviral/shared` so
  both adapters can read it without a server-only barrel. Vite tree-shakes
  it from the web bundle (`apps/web` only imports `EXAMPLE_RESPONSE`,
  `EXAMPLE_TRANSCRIPT`, `EXAMPLE_URL`). If bundle inspection ever shows
  the prompt leaking into the browser bundle, move it to
  `packages/shared/src/server-only/` and tighten the ESLint
  cross-package rule.
- **Open questions**: prove the leak first; without a regression there's
  no reason to fork the package layout.
- **Source**: TASK_002 Risk Assessment.

## Full accessibility pass (form-label association)
- **Scope**: medium
- **Why deferred**: DEC_011 tracks the sibling-label pattern in
  `SubtitleControls.jsx` and friends as a deliberate roadmap item; the
  artifact-era pattern was preserved during the parity port. A dedicated
  pass would wire `htmlFor` + `id` on every form control and add
  `aria-label` where the label is too far from the input.
- **Open questions**: do we also rebuild the radio-group keyboard nav
  (Tab / arrow keys), or is that out of scope for this pass?
- **Source**: `memory_bank/decisions/DEC_011_label_accessibility_roadmap.md`.

## Windows-friendly process group abort for the CLI adapter
- **Scope**: small
- **Why deferred**: TASK_007 uses `process.kill(-pid, 'SIGTERM')` on
  POSIX (`detached: true` spawn), which is sufficient for the macOS /
  Linux development target. Full Windows support requires `tree-kill` or
  `taskkill /F /T /PID`.
- **Open questions**: do we add `tree-kill` as a runtime dep, or write
  the 30-line `spawn('taskkill', ...)` ourselves?
- **Source**: `memory_bank/tasks/task_007_claude_cli_adapter.md` Risk
  Assessment.
