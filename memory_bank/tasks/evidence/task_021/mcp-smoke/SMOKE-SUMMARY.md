# TASK_021 — Chrome DevTools MCP smoke (overlay upload fixed)

**When:** 2026-05-30 · **Build:** branch `feature/task-021-standardize-file-upload`
App: `pnpm dev` (:5173). Results = "Ver exemplo pronto", OVERLAY tab.

The exact symptoms the user reported, each re-checked in the real browser:

| Reported symptom | Before | After (verified) |
|---|---|---|
| "click não abre o finder" | `<label>`+`display:none` input; click fell through | dropzone is a `<button>`; clicking it calls `input.click()` → opens the OS picker. `inputClickedOnZoneClick = true`. |
| "clico várias vezes ele seleciona o texto" | text got selected on multi-click | `select-none` (`user-select: none`); 3× click → `getSelection().toString() === ""`. |
| "ao soltar ele abriu em outra aba a imagem" | no `onDrop` → browser navigated to the file | `onDrop` calls `preventDefault()`; a real drop → `evt.defaultPrevented = true`, overlay applied (`overlay ativo`, filename shown, 6 `data:image/png` imgs in the previews), NO navigation. |
| "o componente ganha destaque" (drag) | hover-only | `isDragging` highlight + copy flips to "Solte o PNG aqui". |

Same `useFileSelect` primitive now backs the video upload too (click + drag parity).

Screenshot: `overlay-upload-fixed.png` (overlay applied across the 5 card previews).

Note: a leftover `file:///…/overlay.png` browser tab was present at the start of
the smoke — that was the user's earlier failed drop opening the image in a new
tab, the exact bug now fixed.
