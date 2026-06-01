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
explicit wrap width (0.94 × canvas = 320 px, not 170 — fixes the `left:50%`
shrink-to-fit layout bug). The three knobs are ORTHOGONAL (final model):
- **`size`** (S/M/L) → font size only, scaled to the canvas (→ preview == 1080
  export). The font does NOT depend on `charsPerScreen`.
- **`chars/tela`** → effective chars-per-line (line WIDTH), capped to what fits
  the size-driven font (`measureCharAdvanceEm` measures the actual font advance).
- **`lines`** → true visual cap (a `perLine×lines` chunk wraps to ≤ `lines` rows).

(The font reads 24.4 px in the table above because that early capture used the
first-pass chars-driven model; the shipped model is size-only — see the
re-verified numbers below.)

Screenshot: `lines1-single-line.png` (LINHAS=1, one line).

## Follow-up correction (review feedback)
First pass coupled the font size to `charsPerScreen` (font shrank as chars/tela
grew) — wrong. Corrected so the three knobs are orthogonal:
- **`size`** (S/M/L) → font size only (S 14.3 px, L 21.1 px on a 340 canvas).
- **`chars/tela`** → line WIDTH (effective chars-per-line, capped to what fits)
  — never the font.
- **`lines`** → true visual cap.

Re-verified live (size L, LINHAS=1):
| chars/tela | font px | rendered lines | text-box width |
|---|---|---|---|
| 18 | 21.1 | 1 | 138 px |
| 36 | 21.1 | 1 | — |
| 50 | 21.1 | 1 | 319 px |

Font **constant** across the slider (was the bug); box width tracks chars/tela;
`size` S→14.3 / L→21.1 still drives the font. Screenshot:
`chars-slider-no-font-change.png`.

