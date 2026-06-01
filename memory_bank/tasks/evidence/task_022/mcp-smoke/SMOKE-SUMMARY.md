# TASK_022 — Chrome DevTools MCP smoke (lines = true visual cap)

**When:** 2026-05-30 · branch `feature/task-022-subtitle-lines-cap` · app `pnpm dev` :5173.
Results = "Ver exemplo pronto", LEGENDA tab, font Bebas Neue, chars/tela 36.

## Before
`LINHAS=1` rendered on **2 lines**. Two compounding causes found by measuring the live span:
1. **Layout:** the SubtitleLayer is `position:absolute; left:50%`, so its shrink-to-fit width was the space right of the left edge ≈ **half the canvas (170 px)** — text wrapped at half width regardless of `maxWidth:92%`. (Present in the frozen artifact too.)
2. **Font:** fixed `SIZE_MAP` px never scaled; `min(92%, Nch)` collapsed to 92%; `ch` (='0' advance) is narrower than real mixed text → premature wrap.

## After (measured live, canvas 340 px)
| LINHAS | div width | font | rendered lines |
|---|---|---|---|
| 1 | 320 px | 24.4 px | **1** ✅ |
| 2 | 320 px | 24.4 px | **2** ✅ |
| 3 | 320 px | 24.4 px | **3** ✅ |

`lines` is now a TRUE visual cap (1→1, 2→2, 3→3). The SubtitleLayer has an
explicit wrap width (0.94 × canvas = 320 px, not 170), and the font is derived
from `charsPerScreen` + canvas width + the FONT'S OWN measured advance
(`measureCharAdvanceEm`), so a `charsPerScreen`-char line fills the wrap for any
font (Bebas 0.35 … Archivo 0.58) yet always stays on one line. `chars/tela`
controls density (more chars → smaller font); `size` (S/M/L) sets fill. Font
scales with canvas width → preview == 1080 export by construction.

Screenshot: `lines1-single-line.png` (LINHAS=1, one line).
