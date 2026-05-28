# Viral Cristão · Bootstrap pro Claude Code

## Origem
`viral-cristao-artifact.jsx` no root — single-file React (~1594 linhas), validado funcionando no ambiente artifact do claude.ai. É a **SSOT** da implementação atual. Toda decisão arquitetural já foi tomada e testada lá.

## Objetivo
Portar pra projeto fora do ambiente artifact preservando 100% das funcionalidades visuais e de comportamento. Eliminar 3 limitações do artifact que o build real resolve, e adicionar capacidade nova de **rodar via Claude Code CLI** quando disponível (sem precisar de API key).

## Stack alvo
- **Frontend**: Vite + React 18 + Tailwind v3 com JIT
- **Backend**: Node + Express (ou Hono) — necessário pro spawn do CLI, e como proxy da API
- **JavaScript** (não migrar p/ TS agora)
- **Monorepo simples**: `apps/web/` (Vite) + `apps/server/` (Node), workspace via pnpm ou npm workspaces

## Capacidade nova: dual-mode CLI ↔ API

O artifact atual só fala com a API Anthropic via fetch. **No projeto portado, queremos suportar dois caminhos:**

### Modo CLI (preferido quando disponível)
- Backend detecta `claude` no PATH do usuário (`which claude` ou equivalente cross-platform)
- Se existe: spawna o binário com prompt via stdin, parseia stream-json no stdout
- **Vantagem**: usuário já está autenticado no Claude Code (Pro/Max/Team), não precisa fornecer API key, billing vai via assinatura existente

### Modo API (fallback BYOK)
- Se CLI não detectado, ou usuário escolher explicitamente: backend faz fetch pra `api.anthropic.com` com `VITE_ANTHROPIC_API_KEY` do `.env.local`
- Mesmo caminho de hoje, mas agora servidor-side (evita CORS, esconde key)

### Referência de implementação
Estude o repositório [`nexu-io/open-design`](https://github.com/nexu-io/open-design) — particularmente:
- `apps/daemon/src/agents.ts` — definição do adapter `claude`, detecção via PATH, `buildArgs` com `--output-format stream-json`, `promptViaStdin: true`, fallbacks
- `apps/daemon/src/claude-stream.ts` — parser line-delimited JSON do stdout do Claude Code (eventos `text` / `thinking` / `tool_use` / `tool_result` / `status`)
- Capability probing via `claude -p --help` pra detectar `--include-partial-messages` e `--add-dir`

**Não copie tudo** — Open Design suporta 16 CLIs, sistema de permissions complexo, filesystem real pro agent. Para Viral Cristão simplifica drasticamente:
- Único CLI: `claude`
- Single-shot request → response (não agentic multi-turn, não tool use)
- Não precisa CWD especial nem permission posture
- Argumentos mínimos: `claude -p --output-format stream-json --permission-mode bypassPermissions --model <id>`
- Prompt completo (system + transcript do usuário) via stdin

## Conteúdo do .jsx existente
- **App** — estado central: subtitleConfig, videoConfig, overlayConfig, url, transcript, results, activeTab, isConfigCollapsed
- **Componentes** — ConfigPanel, SubtitleControls, VideoControls, OverlayControls, MomentCard, SubtitlePreview, NumberField, LoadingState, EmptyState, ErrorState
- **Constantes** — OPTIMIZED_PROMPT (~4400 tokens), EXAMPLE_URL, EXAMPLE_TRANSCRIPT (~10min pregação fictícia), EXAMPLE_RESPONSE (5 momentos pré-analisados)
- **Helpers** — highlightText (versículos + Jesus/Deus), chunkText (paginação legenda), extractVideoId, timestampToSeconds
- **CSS inline** — Google Fonts + classes `.canvas-9-16` `.video-16-9` `.canvas-width-only` com breakpoint 768px

## SSOT — NÃO mudar
- **Black box architecture** — cada componente isolado, props bem definidas
- **Configuração global** (não por momento) — 1 mudança aplica aos 5 cards
- **Canvas referência 1080×1920** (Reels/Shorts) — drag-on-preview converte preview-px → canvas-px via `scaleFactor = canvasSize.width / 1080`
- **Drag + offset X/Y em px** — vídeo e legenda, mesma lógica
- **Legenda = âncora + offset** — âncora é Topo/Centro/Inferior (anchorPercent 12/50/86), offset é deslocamento em px do anchor
- **PT-BR labels + EN JSON keys** (contract da Claude API)
- **Tipografia** — Instrument Serif (display) + IBM Plex Sans (body) + IBM Plex Mono (números/tabular)
- **Mobile breakpoint = 768px** (md:) — canvas 280×498 mobile, 340×604 desktop

## Limitações do artifact que NÃO se aplicam mais
- ❌ Tailwind arbitrary values (`w-[280px]`, `top-[12%]`) não compilavam → JIT do Vite resolve nativo
- ❌ max_tokens > 1000 retornava "Invalid response format" no proxy → API real aceita 16k+, CLI sem limite prático
- ❌ localStorage proibido dentro do iframe → liberado fora dele

## Estrutura sugerida
```
viral-cristao/
├── apps/
│   ├── web/                    # Vite + React (frontend)
│   │   ├── src/
│   │   │   ├── App.jsx · main.jsx
│   │   │   ├── components/
│   │   │   │   ConfigPanel.jsx
│   │   │   │   SubtitleControls.jsx · VideoControls.jsx · OverlayControls.jsx
│   │   │   │   MomentCard.jsx · SubtitlePreview.jsx
│   │   │   │   NumberField.jsx
│   │   │   │   states/{Loading,Empty,Error}.jsx
│   │   │   ├── lib/
│   │   │   │   prompt.js              # OPTIMIZED_PROMPT
│   │   │   │   example-data.js        # URL + transcript + response
│   │   │   │   api.js                 # fetch p/ backend /api/analyze
│   │   │   │   helpers.js             # highlight, chunk, extract, timestamp
│   │   │   ├── config/defaults.js     # DEFAULT_SUBTITLE/VIDEO/OVERLAY_CONFIG
│   │   │   └── styles/globals.css     # @import fonts + classes canvas
│   │   ├── vite.config.js             # proxy /api → localhost:server port
│   │   └── tailwind.config.js
│   └── server/                 # Node + Express (backend)
│       ├── src/
│       │   ├── server.js              # /api/analyze (SSE), /api/runtime/detect
│       │   ├── runtime/
│       │   │   ├── detect.js          # which('claude') cross-platform
│       │   │   ├── claude-cli.js      # spawn + stdin + stream-json parser
│       │   │   └── claude-api.js      # fetch fallback c/ API key
│       │   └── parsers/
│       │       └── stream-json.js     # line-delimited JSON → eventos tipados
│       └── package.json
├── .env.example                       # ANTHROPIC_API_KEY=...
└── package.json                       # workspaces
```

## Endpoint principal do backend

`POST /api/analyze` com body `{ url, transcript, mode? }`:
- Se `mode === 'cli'` ou `mode` ausente e CLI detectado → spawn Claude Code
- Se `mode === 'api'` ou CLI não detectado → fetch Anthropic API
- Responde com **SSE** (Server-Sent Events) streamando o progresso, e finaliza com o JSON parseado dos top 5 momentos

`GET /api/runtime/detect` retorna `{ cli: boolean, apiKey: boolean, recommended: 'cli'|'api' }` — frontend usa pra mostrar o modo ativo e oferecer toggle nas settings.

## Plano de migração
1. Scaffold monorepo (pnpm workspaces, Vite p/ web, Express p/ server)
2. Mover constantes inline do .jsx pra `lib/` e `config/` no `apps/web`
3. Extrair componentes 1:1 (sem refatorar lógica ainda) pra `apps/web/src/components`
4. Trocar `fetch` hardcoded por `lib/api.js` que chama o backend
5. Implementar `apps/server` com endpoint dual-mode (CLI primeiro, API fallback)
6. Adicionar `localStorage` no frontend pra persistir configs entre reloads
7. UI mostra modo ativo: badge discreta "via Claude Code CLI" ou "via API key"
8. Validar visual e comportamento **idênticos** ao artifact original
9. Documentar roadmap de features futuras (não implementar nesta sessão)

## Confirme antes de começar
1. **Migração 1:1 primeiro** (validar paridade frontend) → backend depois? Ou **scaffolding completo desde já** (web + server + dual-mode)?
2. **Package manager**: pnpm (mais rápido, melhor p/ monorepo) ou npm (mais universal)?
3. **Features novas no escopo desta sessão?** Candidatas:
   - Apify integration (puxar transcript YouTube automaticamente)
   - Multi-vídeo (analisar várias pregações em sequência)
   - Export ZIP (assets de texto + thumbnail de cada momento)
4. Cria **CLAUDE.md** do projeto agora ou depois da migração?

## Notas de debug histórico (pra evitar refazer)
- Aspect-ratio CSS + flex/grid containers = canvas colapsa em alguns browsers → usar **width/height fixos em px**
- Padding-bottom hack pra aspect = z-index da legenda vaza em iPad app → usar **dimensões fixas + isolate**
- Tailwind `w-[280px]` não compila no artifact → **CSS puro via `<style>` block** ficou como fallback robusto (no Vite com JIT, classes Tailwind funcionam nativamente, mas pode manter o CSS puro como segurança)
- ConfigPanel sticky precisa de **z-50** mínimo pra não competir com z-20 da legenda
- `min-w-0` nos grid items é essencial pra evitar que conteúdo force overflow e colapse a outra coluna

## Notas sobre o spawn do Claude Code CLI
- **Prompt via stdin sempre** — evita ENAMETOOLONG no Windows (limite ~32 KB no CreateProcess) e E2BIG no Linux. O `OPTIMIZED_PROMPT + transcript` facilmente passa de 32 KB
- **`--output-format stream-json`** dá line-delimited JSON com eventos tipados — parsear linha-a-linha, cada linha é um JSON object com `type` field
- **`--permission-mode bypassPermissions`** evita prompts interativos (não tem TTY no servidor)
- **Capability probe** `claude -p --help` antes do primeiro spawn — checar se `--include-partial-messages` existe (>= 1.0.86) e adicionar se sim, pra streaming mais rico
- **Fallback bin**: além de `claude`, tentar `openclaude` no PATH (drop-in fork)
- **Output final** vem como evento `result` ou similar no stream — extrair o JSON dos top 5 momentos dali, mesmo schema da API
