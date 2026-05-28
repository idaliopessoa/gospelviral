# Viral Cristão / gospelviral — Bootstrap das Features (Fases 3–6)

## Contexto

A migração (Fases 1–2) está completa: monorepo pnpm com `apps/web` (Vite/React/Tailwind), `apps/server` (Hono), `packages/shared`, execução dual-mode CLI↔API. Este documento define **quatro novas fases de features** sobre essa base. É um documento de PRODUTO — descreve o QUE cada fase faz e as decisões já tomadas, não o COMO. Você (Claude Code) tem o código na frente; eu não. Por isso aqui não há paths, nomes de arquivo nem Black Box Interfaces detalhadas — isso é seu trabalho no Pass 1, lendo o código real.

## Como usar este documento

Para cada fase, na ordem:
1. **Pass 1** — decompor a fase em tasks usando o protocolo de `02 - Task Creation System - Black Box Architecture.md`. Cada task com Black Box Interface (INPUT/OUTPUT/INVARIANTS), Complexity Assessment, prerequisites P1/P2/P3. Atualizar o `task_registry.md` (sequência continua de TASK_013 em diante).
2. **Apresentar o registry da fase** para revisão humana antes de qualquer código.
3. **Pass 2 por task** (após aprovação) — mesmo ciclo da migração: ler task → expandir subtasks → implementar (TDD) → auditoria black-box (subagente `.claude/agents/black-box-auditor.md`) → corrigir gaps na mesma branch até zero → merge.

Gates inalterados: `pnpm lint` 0, `pnpm test` verde, `sonar` (@sonar/scan) PASS, `javascript:S3776 ≤ 15`. Gate humano entre fases. Persona arquitetural: `01-Systems-Architecture-Expert-viral-cristao.md`.

## Princípios herdados (não reabrir)

- `reference/viral-cristao-artifact.jsx` permanece **frozen** — nunca modificado
- SSOT, black box, primitives estáveis, configuração **global** (1 mudança aplica aos 5 momentos)
- Canvas de referência **1080×1920** (Reels/Shorts); posicionamento sempre nesse sistema, escalado para preview
- PT-BR labels + EN JSON keys

---

## FASE 3 — Abas no card (Redes Sociais / Legenda do Vídeo)

### Objetivo
Dividir os blocos de texto longo de cada card em duas abas, separando contextos de uso e facilitando a leitura.

### Comportamento
- Duas abas na região de texto do card (abaixo do preview do vídeo).
- **Aba 1 "Redes Sociais"** — ativa por **default**. Contém caption + hashtags + CTA, reorganizados de forma coesa (hoje estão soltos no card).
- **Aba 2 "Legenda do Vídeo"** — texto da fala do trecho, **extraído do transcript**, **sem timecodes**, só o texto corrido para leitura/revisão.
- Hook, scripture reference, viral score e badges permanecem **fixos no topo do card** (metadados do momento), acima das abas. NÃO entram nas abas.

### Decisões fechadas (DEC)
- **DEC** — A legenda do vídeo é **extraída do transcript** (fatiar entre `timestamp_start` e `timestamp_end`, remover timecodes), via helper puro determinístico. NÃO é pedida à IA (custo zero, reversível).
- **DEC** — Aba "Redes Sociais" é a default.
- **DEC (avaliar na decomposição)** — Botão opcional de "limpar" leve na legenda do vídeo (regex apenas, sem IA: normalizar espaços/pontuação, remover ruído de fala). Decidir se entra nesta fase ou vira follow-up.

### Primitives / dados
Nenhum primitive novo. Helper novo: extração de texto de segmento do transcript.

### Restrições
Parte superior do card (hook/scripture/score/badges) intocada.

---

## FASE 4 — Ingestão do vídeo-fonte por upload

### Objetivo
Permitir que o usuário forneça o arquivo MP4 do vídeo, habilitando preview tocável (Fase 5) e export (Fase 6).

### Comportamento
- **Upload manual** do MP4 (drag-drop ou file picker).
- **Opcional e posterior**: a análise continua rodando só com URL + transcript. O vídeo é um *upgrade* — entra quando o usuário quer preview-com-play ou export. Quem só quer os textos não precisa subir vídeo.
- O arquivo fica disponível para o frontend (preview via `<video>`) e para o backend (export via FFmpeg).
- **Storage temporário** em pasta isolada no server (gitignored).
- **Cleanup na inicialização do server**: varre tudo da sessão anterior, começa zerado. Se o server cair no meio de algo, a próxima inicialização zera os binários pesados (auto-limpante por design).
- Sobrevive à limpeza: apenas o `CompositionSpec` (leve). Varridos: vídeo-fonte, PNGs temporários, MP4 intermediário.

### Decisões fechadas (DEC)
- **DEC** — Upload é opcional/posterior, não obrigatório no início do fluxo.
- **DEC** — Cleanup total na inicialização; pasta temporária isolada e gitignored.

### Primitives / dados
- **`VideoSource`** (novo) — referência ao arquivo ingerido: localização temporária, duração, formato, e associação à análise corrente.

---

## FASE 5 — Play + sincronização de legenda

### Objetivo
Tocar o trecho de cada card com a legenda sincronizada à fala, para ver o Reel montado em movimento.

### Comportamento
- Usa **`<video>` nativo** com o arquivo da Fase 4 (não iframe do YouTube).
- **Play button no centro** do canvas de cada card. Todos começam parados.
- **Modo governado pelo painel de config**:
  - Painel recolhido/fechado → modo **PLAYER** (vídeo tocável, legenda sincronizada, drag desativado).
  - Qualquer aba de config aberta → modo **EDIÇÃO** (drag ativo, vídeo estático no frame editável).
- Modo é **global aos 5 cards** (config é global, modo segue).
- **Abrir qualquer aba de config pausa imediatamente** qualquer card que esteja tocando.
- **Um toca por vez**: dar play em um card para todos os outros.
- **Legenda sincronizada pelo timecode do transcript.** A granularidade **segue a fonte**: se o transcript tiver timecode por frase, a legenda troca por frase; se tiver por palavra, troca por palavra. O sistema NÃO impõe granularidade — espelha o que o transcript fornecer.
- **Remove o timer arbitrário de 2.2s** do preview atual (era placeholder do artifact).
- O controle recolher/expandir do painel (`isConfigCollapsed`) ganha função de **estado de modo**, além de economia de espaço.

### Decisões fechadas (DEC)
- **DEC** — `<video>` nativo, não iframe (o arquivo real da Fase 4 destrava isso e elimina branding/embed/cross-origin do YouTube).
- **DEC** — Modo governado pelo painel; global aos 5; abrir config pausa reprodução em curso.
- **DEC** — Um card toca por vez.
- **DEC** — Sincronização por timecode do transcript, granularidade conforme a fonte.
- **DEC** — Remover o timer de 2.2s.

### Primitives / dados
- **`SubtitleCue[]`** (novo) — lista de cues `{ texto, start, end }` derivada do transcript, granularidade conforme a fonte. É a fonte única de timing da legenda, **compartilhada com a Fase 6**.

### Restrições
O preview só toca se houver `VideoSource` (Fase 4). Sem vídeo ingerido, mantém o fallback atual (thumbnail estático + comportamento de edição).

---

## FASE 6 — Export MP4 com legenda queimada

### Objetivo
Gerar o MP4 final do corte — vídeo + overlay + legenda queimada — pronto para postar.

### Comportamento
- **FFmpeg no backend** (single-user local).
- **Legenda queimada via PNG-overlay**: o frontend renderiza cada estado de legenda (cue) como PNG transparente, usando o **mesmo motor de canvas que desenha o preview**, e envia os PNGs + timecodes para o backend. O FFmpeg compõe cada PNG sobre o vídeo no intervalo do respectivo cue. Garante **fidelidade ao preview** (fonte, highlights amarelos em versículos/Jesus, posição custom do drag, fundo/sombra).
- **Mesma fonte de timing do preview**: os `SubtitleCue[]` da Fase 5. O que se vê é o que se queima.
- O **overlay PNG** (já existente) também é queimado.
- Output: MP4 do corte (entre `timestamp_start` e `timestamp_end`), com overlay e legenda queimados. **Sem SRT externo** — tudo queimado.
- **`CompositionSpec` estruturado em tracks/clips** (track de vídeo, track de overlay, track de legenda, com clips temporizados). Mesmo usando um clip por track agora, a *estrutura* de tracks/clips é o que viabiliza a timeline futura (Fase 7) sem reescrita.
- Cleanup do vídeo-fonte e PNGs temporários pela política da Fase 4.

### Decisões fechadas (DEC)
- **DEC** — FFmpeg no backend.
- **DEC** — Legenda queimada via PNG-overlay temporizado pelos cues (fiel ao preview), NÃO `drawtext` nem `.ass`.
- **DEC** — Sem legenda externa SRT; tudo queimado no vídeo.
- **DEC** — `CompositionSpec` como primitive de primeira classe, estruturado em tracks/clips desde já (pensando na timeline da Fase 7).
- **DEC** — Timing dos cues no export = `SubtitleCue[]` da Fase 5 (SSOT de timing compartilhado entre preview e export).

### Primitives / dados
- **`CompositionSpec`** (novo) — descrição da composição em tracks/clips: track de vídeo (corte), track de overlay (PNG + opacidade + posição), track de legenda (cues com PNG + intervalo). É a "receita" de produção; sobrevive ao cleanup; é o documento que a timeline futura vai editar.

### Restrições
Export requer `VideoSource`. O `apps/server` deixa de ser stateless (passa a processar vídeo: storage, render, cleanup, tratamento de erro de FFmpeg) — aceito conscientemente. O app passa a ser **analisador + produtor de vídeo**.

---

## FASE 7 — Timeline (futura, NÃO implementar agora)

Editor de timeline para ajuste fino de corte, overlay e legenda. Já viabilizado pelo `CompositionSpec` em tracks/clips. Apenas registrar no `ROADMAP.md`; não criar tasks nesta rodada.

---

## Dependências entre fases

- **Fase 3** — independente. Pode começar imediatamente.
- **Fase 4** — fundação das Fases 5 e 6. Sem UI vistosa, mas destrava as duas seguintes.
- **Fase 5** — depende da Fase 4 (`VideoSource`).
- **Fase 6** — depende da Fase 4 (`VideoSource`) e da Fase 5 (`SubtitleCue[]`).

Ordem de execução recomendada: 3 → 4 → 5 → 6, com gate humano entre cada.

## Primitives novos (resumo)

| Primitive | Introduzido em | Compartilhado com | Papel |
|---|---|---|---|
| `VideoSource` | Fase 4 | 5, 6 | Referência ao MP4 ingerido (temporário) |
| `SubtitleCue[]` | Fase 5 | 6 | Timing da legenda, derivado do transcript, granularidade conforme a fonte |
| `CompositionSpec` | Fase 6 | 7 (futura) | Receita de produção em tracks/clips; sobrevive ao cleanup |

## Confirmação esperada antes de começar

Antes do Pass 1 da Fase 3, confirme que entendeu:
1. Este documento é produto, não implementação — você decompõe em tasks lendo o código real, usando `01` (persona) e `02` (protocolo).
2. A ordem é 3 → 4 → 5 → 6, uma fase por vez, registry revisado por humano antes do Pass 2, gate humano entre fases.
3. As DECs marcadas como "firme" no documento são invioláveis.

Comece pelo Pass 1 da **Fase 3**: decomponha em tasks, atualize o registry a partir de TASK_013, e apresente para revisão humana. Não escreva código ainda.
