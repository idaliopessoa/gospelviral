# TASK_018 follow-up — INSUMOS consolidados (base para a nova task)

> Síntese das 4 investigações (persona 01-Systems-Architecture-Expert) sobre os 6 defeitos de uso real do player. Detalhe por cluster: `findings-A-transcript-parser.md`, `findings-B-subtitle-render.md`, `findings-C-video-layer.md`, `findings-D-cold-open.md`. Evidência bruta: `analyze-60-request/response`, screenshots `../task_018/`.

## Tabela defeito → raiz → fix proposto
| # | Raiz (confirmada) | Fix proposto | Black-box |
|---|---|---|---|
| **D4** | Transcript real = timecode de editor `HH:MM:SS:FF - … / Unknown / texto` (4 partes). `parseTimestampPrefix` rejeita 4 partes → cues vazios → "indisponível" + fallback. (286/286 linhas batem o padrão; cobertura OK, formato é o problema.) | Estender o parser shared com **auto-detecção de formato** (SSOT, conserta ambos consumidores). Dropar frames, usar START do range como âncora, pular linha de speaker. Testes `MM:SS` congelados continuam passando. | `transcript-lines.js` (+`subtitle-cues.js`, `transcript-extract.js` herdam) |
| **D3** | TASK_018 removeu `chunkText` → cue/fallback renderizado inteiro; `charsPerScreen`/`lines` do painel mortos (viola SSOT). | Re-chunk **cue-aware**: `chunkText(cue.text, chars, lines)` + índice DERIVADO de `currentTime` na janela `[start,end]` (sem timer). Helper puro `selectVisibleChunk`. preview==export favorece chunk sobre CSS-clamp. | `SubtitlePreview` (interno/aditivo) |
| **D5** | **Bug REAL de produção (verificado)**: `@import` Google Fonts vem DEPOIS do `@tailwind` em `globals.css` → spec viola → `pnpm build` **remove o @import** (dist CSS tem zero `googleapis`) → fontes custom nunca carregam em prod → trocar fonte não surte efeito. (Overlay opaco = fator de percepção secundário.) | Mover carga de fonte pra `<link>` em `index.html` (ou `@import` antes do `@tailwind`). | `globals.css`/`index.html` (zero impacto de interface) |
| **D1** | `VideoLayer` só mostra `<video>` em `mode==='player'` → edição mantém capa YouTube com vídeo enviado. | `hasVideo = Boolean(videoSource)` (dropar condição de modo) → `<video>` poster (seek startSec) em AMBOS os modos; thumbnail YouTube = fallback só sem videoSource. Drag continua gated a edição (é no wrapper div). | `SubtitlePreview` VideoLayer |
| **D2** | `useVideoPlayback` só expõe `play()`; botão só com `!isActivePlayer`; tocando não há como pausar. | **Paused-but-active**: add `isPlaying`/`pause`/`toggle` (aditivo) ao hook; `isPlaying` event-driven do elemento; `playingIndex` SSOT inalterado; botão exibe com `!isPlaying` (gated a player mode). `play()` sync no gesto (autoplay-safe). | `useVideoPlayback` (+`SubtitlePreview`) |
| **D6** | Playback é segmento único `[start,end]`; sem pré-roll do cold open. | **Sequência de segmentos**: `apply_cold_open` → `[peak, fullCut]` (peak primeiro, cut replay em contexto); senão `[fullCut]`. Hook ganha `segments[]` + `segmentIndex` interno. `parseColdOpenRange("A-B")→{start,end}` (peak é range string; **trap**: `timestampToSeconds` do range inteiro → 0). Cues inalterados (peak ⊆ cut, absoluto). | `useVideoPlayback` (param `segments`), novos helpers shared |

## ⚠️ Cross-cutting CRÍTICO (definem a decomposição em subtasks)
1. **`useVideoPlayback` é tocado por D2 E D6.** D2 adiciona `pause/toggle/isPlaying`; D6 troca `startSec/endSec` por `segments[]`. **Devem ser UM refactor coerente do hook**, não duas mudanças conflitantes. → uma subtask "hook playback" que entrega segments[] + pause/toggle juntos.
2. **Sequência D4 → D3.** D3 (chunk do cue) só é verificável quando D4 faz os cues existirem. D4 primeiro (ou co-land).
3. **`SubtitlePreview` é tocado por D1, D2, D3** (VideoLayer, botão pause, chunk da legenda). Contrato público sobrevive (tudo aditivo/interno), mas as 3 mudanças convergem no mesmo componente → coordenar pra não brigar.
4. **D5 e D1 são independentes** (quick wins isoláveis). D5 é o de maior ROI (bug de prod, fix trivial).
5. **`chunkText` home**: hoje em `apps/web/lib`. Se Phase 6 (burn) precisa server-side → mover canônico pra `@gospelviral/shared` + re-export (preview==export com uma só verdade de chunk).

## Novos black-boxes / helpers propostos (consolidado)
- `parseTranscriptLines` estendido (auto-detect formato) — shared. [D4]
- `selectVisibleChunk(text, currentTime, cueWindow, {charsPerScreen, lines})` puro — web. [D3]
- `parseColdOpenRange(peakString) → {start,end}|null` puro — shared. [D6]
- `buildPlaybackSegments(moment, coldOpenRange) → segments[]` puro — SSOT da ordem cold-open-first. [D6]
- `advanceSegment(currentTime, segments, idx) → {nextIndex, seekTo|null, reachedEnd}` puro. [D6]
- `useVideoPlayback({segments, isActivePlayer, onReachEnd}) → {videoRef, currentTime, play, pause, toggle, isPlaying}`. [D2+D6]

## Grafo de dependência (para Pass 2)
- D5 — independente (quick win, faz primeiro).
- D4 — independente; **bloqueia D3**.
- D3 — depende de D4.
- D1 — independente (VideoLayer).
- D2 + D6 — **acoplados no hook** (uma subtask conjunta) + tocam SubtitlePreview (coordenar com D1/D3).

## Decisões abertas (precisam de ti antes de criar a task)
1. **D4 — onde normalizar:** estender `parseTranscriptLines` shared (rec — SSOT, conserta os dois paths) vs normalizador no boundary web (`App.jsx`, menor blast radius mas duplicado/web-only).
2. **D5 — forma do fix:** `<link>` no `index.html` (rec, build-safe) vs `@import` antes do `@tailwind`.
3. **D2 — modelo de estado:** paused-but-active (rec; `playingIndex` intacto) vs pause→`playingIndex=null`.
4. **D6 — migração do hook:** trocar `startSec/endSec`→`segments[]` (rec; 1 só caller) vs overload compatível.
5. **D6 — schema:** ajustar typedef `peak_moment.timestamp` pra range (barato, agora) — e o server deve normalizar pra `{start,end}` na ingestão, ou fica client-side (`parseColdOpenRange`)? Expor `cold_open` boolean real vs depender de `decision`?
6. **`chunkText` home:** manter em web (só D3) vs mover pra shared agora (prep Phase 6).
7. **`lines` semântica:** cap visual rígido (chunk + `max-width` ch) vs hint de capacidade.

## Fora de escopo desta follow-up (anotados, decidir promover ou não)
- **504 em `/api/analyze`** — abort por desconexão do proxy/timeout 10min (flaky; AUTO == CLI mesmo path). Fix = SSE/keep-alive (ROADMAP, DEC_021).
- **Stream serve `bytes=START-` até EOF** — seek profundo em arquivo grande streama centenas de MB; browser reabre. Pesado (TASK_016).
- **Typedef `size`** (`number` vs `'S'|'M'|'L'`) em types.js — mismatch pré-existente (B).
- **Limpeza obrigatória:** remover `[stream-debug]` temporário em `apps/server/src/routes/upload.js` antes de qualquer merge.
