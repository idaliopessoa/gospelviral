import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Youtube, Sparkles, Copy, Check, AlertCircle, ArrowLeft, Loader2, FileText, BookOpen, Type, ChevronDown, ChevronUp, Flame, CircleAlert, ShieldCheck, Upload, Image as ImageIcon, Move, RotateCcw } from 'lucide-react';

// ============================================================================
// PROMPT OTIMIZADO (schema rico, max_tokens 8000 em Claude Code)
// ============================================================================
const OPTIMIZED_PROMPT = `# Analisador de Momentos Virais — Conteúdo Cristão

<role>
Analista expert em conteúdo de vídeo cristão protestante. Identifica momentos com potencial viral para Instagram Reels e YouTube Shorts. Expertise: psicologia viral, algoritmos IG/YT, teologia protestante, copywriting cristão, edição de vídeo curto, storytelling bíblico, autenticidade na fé.
</role>

<constants>
- Duração ideal: 40-50s (faixa: 30-60s)
- Threshold viral: ≥ 6.5
- Threshold cold open: ≥ 35/50 (70%)
- Balance Top N: 60% evangelização / 40% edificação
- Meta retenção: 70%+
- Objetivo: crescimento + engajamento + tráfego (NÃO venda)
</constants>

<theological_guardrails>
CHECKLIST: christ_centered, scripture_based, grace_focused, hope_present, authentic
RED FLAGS (rejeitar): evangelho da prosperidade, salvação por obras, garantias não-bíblicas, manipulação emocional, julgamento sem graça, heresia
</theological_guardrails>

<categorization>
EVANGELIZAÇÃO (60%): público não-cristão, tom acessível, temas de esperança/propósito/transformação
EDIFICAÇÃO (40%): público cristão, termos teológicos explicados, temas de crescimento/doutrina
HÍBRIDO: 0.5 em cada para balance
</categorization>

<scoring>
6 dimensões 0-10, soma ponderada:
1. Ressonância emocional ×0.25
2. Valor informação ×0.20
3. Qualidade história ×0.15
4. Compartilhabilidade ×0.20
5. Controvérsia saudável ×0.10
6. Força hook ×0.10
Sinalize ≥ 6.5
</scoring>

<process>
1. Mapear conteúdo
2. Identificar candidatos 25-90s
3. Pontuar 6 dimensões
4. Cold open: 5 critérios /50, threshold 35
5. Checagem teológica
6. Priorizar respeitando 60/40
7. Gerar assets
</process>

<hook_patterns>
EVANGELIZAÇÃO: "Eu estava [crise] quando Deus [intervenção]" | "Antes de Jesus eu [X]. Hoje [Y]" | "Se você está [dor], isso é pra você"
EDIFICAÇÃO: "A diferença entre [A] e [B]" | "O erro que cristãos cometem sobre [X]" | "3 formas bíblicas de [Y]"
</hook_patterns>

<hook_title_rules>
O hook_title é o TÍTULO do vídeo (overlay/thumb), NÃO a abertura da caption.
- Curto: idealmente 4-10 palavras
- DISTINTO da primeira frase do caption.text (sem redundância textual)
- Funciona como "linha de cima" que complementa a caption, não a duplica
- Se a caption abre cinematograficamente ("Três horas da manhã. Chão do quarto."), o hook deve ser conceitual/temático ("A oração das 3h que mudou minha vida")
- Se a caption abre com pergunta ("Você sabe a diferença entre X e Y?"), o hook deve afirmar o insight ("Posição vs processo: a confusão que custa caro")
</hook_title_rules>

<output_schema>
Retorne APENAS JSON válido. EXATAMENTE 5 momentos ordenados por viral_score desc.

{
  "metadata": {
    "total_duration": "MM:SS",
    "overall_topic": "...",
    "content_type": "pregação|podcast|estudo|testemunho",
    "primary_scripture_references": ["..."],
    "theological_themes": ["..."]
  },
  "analysis_summary": {
    "candidates_above_threshold": 0,
    "top_moments_selected": 5,
    "balance": {"evangelization": "X%", "edification": "Y%"}
  },
  "top_moments": [
    {
      "rank": 1,
      "timestamp_start": "MM:SS",
      "timestamp_end": "MM:SS",
      "duration_seconds": 0,
      "content_purpose": "evangelization|edification|hybrid",
      "viral_score": 0.0,
      "score_breakdown": {
        "emotional_resonance": {"score": 0.0, "notes": "..."},
        "information_value": {"score": 0.0, "notes": "..."},
        "story_quality": {"score": 0.0, "notes": "..."},
        "shareability": {"score": 0.0, "notes": "..."},
        "controversy_potential": {"score": 0.0, "notes": "..."},
        "hook_strength": {"score": 0.0, "notes": "..."}
      },
      "theological_check": {
        "christ_centered": true,
        "scripture_based": true,
        "grace_focused": true,
        "hope_present": true,
        "authentic": true,
        "red_flags": []
      },
      "cold_open_analysis": {
        "viability_score": 0,
        "decision": "apply_cold_open|keep_linear",
        "peak_moment": {"timestamp": "MM:SS-MM:SS", "why_powerful": "..."}
      },
      "theme": "...",
      "content_category": "testimony|teaching|worship|application",
      "hook_title": "...",
      "key_quote": "...",
      "key_scripture": {"reference": "Salmos 34:18", "text": "...", "when_to_display": "aos 45s"},
      "caption": {"text": "150-300 palavras", "structure_used": "Testemunho|Ensino|...", "word_count": 0},
      "hashtags": {"all": "#jesus #faith #..."},
      "cta": {"primary": "...", "objective": "evangelization|edification|prayer|long_form"},
      "viral_reasoning": "por que viraliza"
    }
  ]
}
</output_schema>`;

// ============================================================================
// TRANSCRIÇÃO DE EXEMPLO
// ============================================================================
const EXAMPLE_URL = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
const EXAMPLE_TRANSCRIPT = `00:00 Bom dia, igreja. Hoje quero falar de algo que mudou completamente a minha forma de ver Deus.
00:12 Eu cresci numa família cristã, conhecia todas as histórias da Bíblia desde criança.
00:25 Mas conhecer histórias sobre Deus não é a mesma coisa que conhecer a Deus.
00:38 Aos 22 anos eu tive uma crise terrível de ansiedade, daquelas que você não consegue nem sair da cama.
00:52 Eu lembro de uma madrugada, três da manhã, deitado no chão do quarto, sem conseguir respirar direito.
01:08 E eu fiz uma oração que mudou tudo. Eu disse: Deus, se Tu és real, eu preciso saber agora.
01:25 E irmãos, eu não sei como explicar isso, mas eu senti uma presença. Uma paz que invadiu o quarto.
01:42 Foi como se Jesus tivesse entrado ali e me dito: filho, eu sempre estive aqui.
01:58 Eu chorei por horas. Mas era um choro diferente. Era um choro de quem encontrou casa.
02:15 Hoje eu olho pra trás e entendo: Deus me deixou chegar no fundo do poço pra eu olhar pra cima.
02:32 Salmos 34 versículo 18 diz: perto está o Senhor dos que têm o coração quebrantado.
02:48 Quebrantamento não é castigo. É convite. É Deus dizendo: vem, eu tô aqui.
03:05 Agora deixa eu falar de algo que muitos cristãos confundem.
03:18 Existe uma diferença gigante entre justificação e santificação.
03:30 Justificação é o que Deus fez por você no momento que você creu em Cristo.
03:45 É um ato único, irreversível. Você foi declarado justo pela fé.
04:00 Romanos 5 versículo 1: justificados pela fé, temos paz com Deus.
04:15 Já santificação é o processo do dia a dia, é o Espírito Santo te moldando.
04:30 É progressivo. É lento. É a jornada inteira da sua vida cristã.
04:48 Quando você confunde os dois, você cai em dois erros graves.
05:02 Primeiro erro: legalismo. Você acha que precisa ser bom o suficiente pra Deus te aceitar.
05:18 Segundo erro: libertinismo. Você acha que já é salvo, então pode pecar à vontade.
05:35 Ambos erros porque ambos perdem o evangelho de vista.
05:48 Justificação te dá a posição. Santificação é sua resposta de amor àquela graça.
06:05 Você já é cem por cento aceito em Cristo. E ao mesmo tempo, Deus tá te transformando.
06:22 Vou contar outra história. Há três anos atrás minha esposa recebeu um diagnóstico de câncer.
06:40 E vou ser bem honesto com vocês: eu briguei com Deus. Eu gritei. Eu chorei. Eu duvidei.
06:58 Não foi aquela fé de Instagram, sabe? Foi fé real, com dúvidas, com lágrimas.
07:15 Durante esse tempo eu aprendi algo que nenhuma faculdade de teologia me ensinou.
07:30 Deus não tem medo das nossas perguntas. Deus não foge da nossa dor.
07:45 Ele se aproxima quando a gente menos espera, e da forma que a gente menos espera.
08:00 Hoje minha esposa tá curada. Mas eu sei que poderia não estar. E eu confiaria em Deus do mesmo jeito.
08:18 Porque a fidelidade de Deus não depende do resultado. Ela depende do caráter dele.
08:35 Última coisa, e essa é pra quem tá sofrendo agora, ouvindo essa pregação.
08:50 Se você tá no meio do vale, lembra disso: Deus não promete tirar você do vale.
09:05 Ele promete caminhar com você dentro do vale. Salmo 23: ainda que eu ande pelo vale.
09:22 A promessa não é ausência do vale. A promessa é presença no vale.
09:38 E essa presença muda tudo. Porque você não tá sozinho. Nunca esteve.
09:55 Vamos orar.`;

// ============================================================================
// RESPOSTA PRÉ-PROCESSADA (5 momentos analisados manualmente desta transcrição)
// ============================================================================
const EXAMPLE_RESPONSE = {
  metadata: {
    total_duration: "09:55",
    overall_topic: "Encontro com Deus no quebrantamento e crescimento espiritual",
    content_type: "pregação",
    primary_scripture_references: ["Salmos 34:18", "Romanos 5:1", "Salmo 23:4", "Romanos 8:28"],
    theological_themes: ["graça", "justificação", "santificação", "presença de Deus no sofrimento"]
  },
  analysis_summary: {
    candidates_above_threshold: 7,
    top_moments_selected: 5,
    balance: { evangelization: "60%", edification: "40%" }
  },
  top_moments: [
    {
      rank: 1,
      timestamp_start: "01:08",
      timestamp_end: "02:15",
      duration_seconds: 67,
      content_purpose: "evangelization",
      viral_score: 8.7,
      score_breakdown: {
        emotional_resonance: { score: 9.8, notes: "Vulnerabilidade extrema (chão do quarto às 3h da manhã) + encontro divino palpável + transformação visível" },
        information_value: { score: 8.0, notes: "Quebrantamento como convite, não castigo — verdade libertadora" },
        story_quality: { score: 9.5, notes: "Arco perfeito: crise → clamor → resposta divina → transformação. Deus como herói." },
        shareability: { score: 9.2, notes: "Ansiedade e crise existencial são universais — não-cristãos se identificam" },
        controversy_potential: { score: 4.0, notes: "Testemunho sincero, baixa controvérsia" },
        hook_strength: { score: 9.5, notes: "3h da manhã + chão do quarto + oração desesperada = imagem thumb-stopper" }
      },
      theological_check: {
        christ_centered: true,
        scripture_based: true,
        grace_focused: true,
        hope_present: true,
        authentic: true,
        red_flags: []
      },
      cold_open_analysis: {
        viability_score: 47,
        decision: "apply_cold_open",
        peak_moment: { timestamp: "01:08-01:25", why_powerful: "Clamor desesperado 'se Tu és real, preciso saber AGORA' cria curiosidade irresistível sobre a resposta" }
      },
      theme: "Encontro com Deus no fundo do poço",
      content_category: "testimony",
      hook_title: "A oração das 3h que mudou minha vida",
      key_quote: "Foi como se Jesus tivesse entrado ali e me dito: filho, eu sempre estive aqui",
      key_scripture: {
        reference: "Salmos 34:18",
        text: "Perto está o Senhor dos que têm o coração quebrantado e salva os contritos de espírito",
        when_to_display: "aos 45s, durante a reflexão sobre quebrantamento"
      },
      caption: {
        text: "Três horas da manhã. Chão do quarto. Sem conseguir respirar.\n\nE eu fiz uma oração que mudou minha vida: 'Deus, se Tu és real, eu preciso saber AGORA.'\n\nNão sei como explicar. Mas eu senti uma presença. Uma paz invadiu o quarto. Foi como se Jesus tivesse entrado ali e me dito: filho, eu sempre estive aqui.\n\nEu chorei por horas. Mas era choro de quem encontrou casa.\n\nHoje entendo: Deus me deixou chegar no fundo do poço pra eu finalmente olhar pra cima.\n\nQuebrantamento não é castigo. É convite.\n\n'Perto está o Senhor dos que têm o coração quebrantado.' — Salmos 34:18\n\nSe você tá no fundo agora, lembra: Ele tá MAIS perto do que nunca. 💙\n\nMe manda DM 'ORAÇÃO' se você precisa desse encontro.",
        structure_used: "Testemunho (Antes-Crise-Encontro-Depois)",
        word_count: 142
      },
      hashtags: { all: "#jesus #testimony #godisgood #faith #jesuslovesyou #faithjourney #godisfaithful #fundodopoco" },
      cta: {
        primary: "Me manda DM 'ORAÇÃO' se você precisa desse encontro com Deus",
        objective: "evangelization"
      },
      viral_reasoning: "Vulnerabilidade autêntica + crise universalmente identificável (3h de ansiedade) + resposta divina visível = arco emocional irresistível. Cold open com a oração desesperada cria curiosity gap impossível de ignorar."
    },
    {
      rank: 2,
      timestamp_start: "06:40",
      timestamp_end: "08:18",
      duration_seconds: 98,
      content_purpose: "evangelization",
      viral_score: 8.2,
      score_breakdown: {
        emotional_resonance: { score: 9.0, notes: "Honestidade rara: pastor admitindo briga com Deus, dúvida, choro" },
        information_value: { score: 8.0, notes: "Verdade contra-intuitiva: fidelidade de Deus não depende do resultado" },
        story_quality: { score: 8.5, notes: "Arco com tensão real (câncer) + descoberta + resolução" },
        shareability: { score: 8.0, notes: "Sofrimento e fé com dúvidas são experiências amplas" },
        controversy_potential: { score: 6.0, notes: "Admitir briga com Deus pode soar problemático para alguns cristãos legalistas" },
        hook_strength: { score: 8.5, notes: "'Câncer + briga com Deus' = pattern interrupt forte" }
      },
      theological_check: {
        christ_centered: true,
        scripture_based: true,
        grace_focused: true,
        hope_present: true,
        authentic: true,
        red_flags: []
      },
      cold_open_analysis: {
        viability_score: 38,
        decision: "apply_cold_open",
        peak_moment: { timestamp: "07:15-07:45", why_powerful: "'Deus não tem medo das nossas perguntas. Deus não foge da nossa dor.' Verdade que choca o estereótipo religioso" }
      },
      theme: "Fé real em meio ao sofrimento",
      content_category: "testimony",
      hook_title: "Pastor confessa: 'Eu briguei com Deus'",
      key_quote: "A fidelidade de Deus não depende do resultado. Ela depende do caráter dele",
      key_scripture: {
        reference: "Romanos 8:28",
        text: "E sabemos que todas as coisas cooperam para o bem daqueles que amam a Deus",
        when_to_display: "aos 55s, na conclusão sobre fidelidade"
      },
      caption: {
        text: "Confissão de pastor: quando minha esposa recebeu o diagnóstico de câncer, eu BRIGUEI com Deus.\n\nGritei. Chorei. Duvidei.\n\nNão era aquela fé de Instagram. Era fé real, com lágrimas, com perguntas, com raiva santa.\n\nE aprendi algo que nenhuma faculdade de teologia me ensinou: Deus não tem medo das nossas perguntas. Deus não foge da nossa dor.\n\nEle se aproxima quando a gente menos espera, da forma que a gente menos espera.\n\nHoje minha esposa tá curada. Mas eu sei que poderia não estar. E eu confiaria em Deus do mesmo jeito.\n\nPorque a fidelidade Dele não depende do resultado. Depende do caráter Dele.\n\nSe você tá no meio de uma tempestade, vem comigo. Comenta AMÉM 🙏",
        structure_used: "Vulnerabilidade Pastoral + Insight",
        word_count: 137
      },
      hashtags: { all: "#faith #jesus #testimony #faithoverfear #godisfaithful #christianlife #godisgood #realfaith" },
      cta: {
        primary: "Comenta AMÉM se você tá no meio de uma tempestade hoje",
        objective: "evangelization"
      },
      viral_reasoning: "Vulnerabilidade pastoral é rara e poderosa — pastor admitindo briga com Deus quebra o template 'fé performática'. A verdade 'fidelidade não depende do resultado' é teologia sólida em formato compartilhável."
    },
    {
      rank: 3,
      timestamp_start: "08:50",
      timestamp_end: "09:55",
      duration_seconds: 65,
      content_purpose: "evangelization",
      viral_score: 7.9,
      score_breakdown: {
        emotional_resonance: { score: 8.0, notes: "Conforto profundo em meio à dor" },
        information_value: { score: 9.0, notes: "Insight contra-intuitivo: Deus promete presença, não ausência do vale" },
        story_quality: { score: 6.0, notes: "Mais reflexão que história" },
        shareability: { score: 9.0, notes: "'Presença no vale, não ausência do vale' é altamente citável" },
        controversy_potential: { score: 5.0, notes: "Refuta sutilmente a teologia da prosperidade" },
        hook_strength: { score: 8.5, notes: "Quebra de expectativa: 'Deus não promete tirar você do vale'" }
      },
      theological_check: {
        christ_centered: true,
        scripture_based: true,
        grace_focused: true,
        hope_present: true,
        authentic: true,
        red_flags: []
      },
      cold_open_analysis: {
        viability_score: 39,
        decision: "apply_cold_open",
        peak_moment: { timestamp: "09:05-09:22", why_powerful: "'Deus não promete tirar você do vale. Ele promete caminhar com você dentro do vale' — reformula expectativa cristã equivocada" }
      },
      theme: "A promessa de Deus no sofrimento",
      content_category: "application",
      hook_title: "Salmo 23 não diz o que você pensa que diz",
      key_quote: "A promessa não é ausência do vale. A promessa é presença no vale",
      key_scripture: {
        reference: "Salmo 23:4",
        text: "Ainda que eu ande pelo vale da sombra da morte, não temerei mal algum, porque tu estás comigo",
        when_to_display: "aos 30s, durante explicação do salmo"
      },
      caption: {
        text: "Tem uma mentira que muita gente acredita: 'Se Deus te ama, Ele vai te tirar do sofrimento.'\n\nMas o Salmo 23 não diz isso.\n\nDiz: 'AINDA QUE eu ande pelo vale.'\n\nDeus não promete tirar você do vale. Ele promete CAMINHAR com você dentro do vale.\n\nA promessa não é ausência do vale. A promessa é presença NO vale.\n\nE essa presença muda tudo. Porque você não tá sozinho. Nunca esteve.\n\n'Ainda que eu ande pelo vale da sombra da morte, não temerei mal algum, porque tu estás comigo.' — Salmo 23:4\n\nSe você tá no vale agora, salva esse vídeo. Volta quando precisar lembrar. 💙",
        structure_used: "Problema-Esperança",
        word_count: 121
      },
      hashtags: { all: "#faith #jesus #godisgood #faithoverfear #trustgod #salmo23 #faithjourney #godisfaithful" },
      cta: {
        primary: "Salva esse vídeo. Volta quando precisar lembrar dessa verdade",
        objective: "evangelization"
      },
      viral_reasoning: "Frase 'presença no vale, não ausência do vale' é altamente memética. Refuta sutilmente a teologia da prosperidade sem confrontação. Aplicação direta para quem está sofrendo agora."
    },
    {
      rank: 4,
      timestamp_start: "05:02",
      timestamp_end: "06:05",
      duration_seconds: 63,
      content_purpose: "edification",
      viral_score: 7.5,
      score_breakdown: {
        emotional_resonance: { score: 6.0, notes: "Mais didático, menor carga emocional" },
        information_value: { score: 9.5, notes: "Diagnóstico claro de dois erros teológicos comuns" },
        story_quality: { score: 5.5, notes: "Conceito, não narrativa" },
        shareability: { score: 8.5, notes: "Cristãos vão se identificar e marcar amigos" },
        controversy_potential: { score: 7.0, notes: "Marca posição teológica sobre graça vs lei" },
        hook_strength: { score: 8.5, notes: "'Dois erros graves' cria gancho forte" }
      },
      theological_check: {
        christ_centered: true,
        scripture_based: true,
        grace_focused: true,
        hope_present: true,
        authentic: true,
        red_flags: []
      },
      cold_open_analysis: {
        viability_score: 28,
        decision: "keep_linear",
        peak_moment: { timestamp: "n/a", why_powerful: "Ensino requer setup lógico — cold open quebraria a compreensão" }
      },
      theme: "Os dois erros que destroem a vida cristã",
      content_category: "teaching",
      hook_title: "Legalismo ou libertinismo: qual o seu erro?",
      key_quote: "Justificação te dá a posição. Santificação é sua resposta de amor àquela graça",
      key_scripture: {
        reference: "Efésios 2:8-9",
        text: "Pela graça sois salvos, por meio da fé; e isto não vem de vós, é dom de Deus. Não vem das obras, para que ninguém se glorie",
        when_to_display: "aos 50s, na conclusão sobre graça"
      },
      caption: {
        text: "Dois erros que destroem a vida cristã:\n\n❌ LEGALISMO: 'Preciso ser bom o suficiente pra Deus me aceitar'\n❌ LIBERTINISMO: 'Já sou salvo, posso pecar à vontade'\n\nAmbos perdem o evangelho de vista.\n\nA verdade que reconcilia:\n\n✅ Justificação te dá a POSIÇÃO em Cristo (100% aceito, agora)\n✅ Santificação é sua RESPOSTA de amor àquela graça\n\nVocê já é completamente aceito. E ao mesmo tempo, Deus está te transformando.\n\nAmbos são verdade. Ambos ao mesmo tempo.\n\n'Pela graça sois salvos, por meio da fé.' — Efésios 2:8\n\nSalva pra revisar. Manda pro irmão que precisa entender isso. 📖",
        structure_used: "Correção Graciosa",
        word_count: 113
      },
      hashtags: { all: "#christian #bibleverse #christianlife #christianliving #gospeltruth #faithjourney #biblequotes" },
      cta: {
        primary: "Salva pra revisar e manda pro irmão que precisa entender",
        objective: "edification"
      },
      viral_reasoning: "Diagnóstico claro de dois erros muito comuns + framework de resolução. Cristãos vão salvar e compartilhar. Conteúdo de edificação que gera saves e discussão teológica saudável."
    },
    {
      rank: 5,
      timestamp_start: "03:30",
      timestamp_end: "04:30",
      duration_seconds: 60,
      content_purpose: "edification",
      viral_score: 7.2,
      score_breakdown: {
        emotional_resonance: { score: 5.0, notes: "Conteúdo didático, baixa carga emocional" },
        information_value: { score: 9.5, notes: "Distinção teológica fundamental clarificada" },
        story_quality: { score: 5.0, notes: "Conceito, não história" },
        shareability: { score: 9.0, notes: "Cristãos em crescimento amam essa clareza" },
        controversy_potential: { score: 6.5, notes: "Pode gerar debate denominacional sobre santificação" },
        hook_strength: { score: 8.5, notes: "'A diferença que muda tudo' funciona bem" }
      },
      theological_check: {
        christ_centered: true,
        scripture_based: true,
        grace_focused: true,
        hope_present: true,
        authentic: true,
        red_flags: []
      },
      cold_open_analysis: {
        viability_score: 22,
        decision: "keep_linear",
        peak_moment: { timestamp: "n/a", why_powerful: "Ensino teológico exige base conceitual antes da aplicação" }
      },
      theme: "Justificação vs Santificação",
      content_category: "teaching",
      hook_title: "Posição vs processo: a confusão que custa caro",
      key_quote: "Justificação é o que Deus fez por você. Santificação é o processo do dia a dia",
      key_scripture: {
        reference: "Romanos 5:1",
        text: "Justificados, pois, pela fé, temos paz com Deus por meio de nosso Senhor Jesus Cristo",
        when_to_display: "aos 30s, ao explicar justificação"
      },
      caption: {
        text: "Você sabe a diferença entre JUSTIFICAÇÃO e SANTIFICAÇÃO?\n\nMuitos cristãos confundem. E essa confusão custa caro.\n\nJUSTIFICAÇÃO:\n• Ato único de Deus\n• Você é declarado justo pela fé em Cristo\n• Passado, completo, irreversível\n• 'Justificados pela fé, temos paz com Deus' — Romanos 5:1\n\nSANTIFICAÇÃO:\n• Processo do Espírito Santo\n• Você é transformado pra ser mais como Jesus\n• Progressivo, diário, contínuo\n• A jornada inteira da vida cristã\n\nVocê já é 100% aceito em Cristo. E ao mesmo tempo, Deus está te moldando.\n\nAmbos verdadeiros. Ambos simultaneamente.\n\nSalva pra estudar com sua célula 📖",
        structure_used: "Ensino (Pergunta-Explicação-Aplicação)",
        word_count: 113
      },
      hashtags: { all: "#christian #bibleverse #christianlife #biblestudytime #christianliving #gospeltruth #faithjourney" },
      cta: {
        primary: "Salva pra estudar com sua célula ou pequeno grupo",
        objective: "edification"
      },
      viral_reasoning: "Distinção teológica fundamental apresentada em formato visual claro. Alto valor de save e share entre cristãos em crescimento. Edificação sólida com referência bíblica chave."
    }
  ]
};

// ============================================================================
// HELPERS
// ============================================================================
function extractVideoId(url) {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /youtube\.com\/shorts\/([^&\n?#]+)/
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

function timestampToSeconds(ts) {
  if (!ts) return 0;
  const parts = ts.split(':').map(Number);
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return 0;
}

function parseJsonFromResponse(text) {
  let cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace === -1 || lastBrace === -1) {
    throw new Error('JSON não encontrado na resposta');
  }
  cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  return JSON.parse(cleaned);
}

function highlightText(text, config) {
  if (!text) return [{ text: '', highlighted: false, type: null }];
  let parts = [{ text, highlighted: false, type: null }];
  if (config.highlightScripture) {
    const scriptureRegex = /\b(?:Gênesis|Êxodo|Levítico|Números|Deuteronômio|Josué|Juízes|Rute|Samuel|Reis|Crônicas|Esdras|Neemias|Ester|Jó|Salmos?|Salmo|Provérbios|Eclesiastes|Cantares|Isaías|Jeremias|Lamentações|Ezequiel|Daniel|Oséias|Joel|Amós|Obadias|Jonas|Miquéias|Naum|Habacuque|Sofonias|Ageu|Zacarias|Malaquias|Mateus|Marcos|Lucas|João|Atos|Romanos|Coríntios|Gálatas|Efésios|Filipenses|Colossenses|Tessalonicenses|Timóteo|Tito|Filemom|Hebreus|Tiago|Pedro|Judas|Apocalipse)\s+\d+(?::\d+(?:-\d+)?)?/gi;
    parts = splitByRegex(parts, scriptureRegex, 'scripture');
  }
  if (config.highlightKeywords) {
    const keywordRegex = /\b(Jesus|Cristo|Deus|Senhor|Espírito Santo|Pai)\b/g;
    parts = splitByRegex(parts, keywordRegex, 'keyword');
  }
  return parts;
}

function splitByRegex(parts, regex, type) {
  const result = [];
  for (const part of parts) {
    if (part.highlighted) {
      result.push(part);
      continue;
    }
    let lastIndex = 0;
    let match;
    const r = new RegExp(regex.source, regex.flags);
    while ((match = r.exec(part.text)) !== null) {
      if (match.index > lastIndex) {
        result.push({ text: part.text.substring(lastIndex, match.index), highlighted: false, type: null });
      }
      result.push({ text: match[0], highlighted: true, type });
      lastIndex = match.index + match[0].length;
    }
    if (lastIndex < part.text.length) {
      result.push({ text: part.text.substring(lastIndex), highlighted: false, type: null });
    }
  }
  return result;
}

function chunkText(text, charsPerScreen, lines) {
  if (!text) return [''];
  const charsPerChunk = charsPerScreen * lines;
  const words = text.split(' ');
  const chunks = [];
  let current = '';
  for (const word of words) {
    if ((current + ' ' + word).trim().length <= charsPerChunk) {
      current = (current + ' ' + word).trim();
    } else {
      if (current) chunks.push(current);
      current = word;
    }
  }
  if (current) chunks.push(current);
  return chunks.length ? chunks : [''];
}

// ============================================================================
// COMPONENTES
// ============================================================================
function CopyButton({ text, label }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      }}
      className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium tracking-wide uppercase rounded-sm border border-stone-300 hover:border-stone-900 hover:bg-stone-900 hover:text-stone-50 transition-all duration-150"
      style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}
    >
      {copied ? <Check size={12} /> : <Copy size={12} />}
      {copied ? 'Copiado' : label}
    </button>
  );
}

function CopyAllButton({ moment }) {
  const [copied, setCopied] = useState(false);

  const fullText = [
    moment.hook_title,
    moment.caption?.text,
    moment.hashtags?.all
  ].filter(Boolean).join('\n\n');

  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(fullText);
        setCopied(true);
        setTimeout(() => setCopied(false), 2400);
      }}
      className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold tracking-[0.1em] uppercase rounded-sm bg-stone-900 text-stone-50 hover:bg-stone-700 transition-all duration-150 shadow-sm whitespace-nowrap"
      style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}
      title="Copia título + legenda + hashtags em um único bloco pronto pra colar no Instagram Reels ou YouTube Shorts"
    >
      {copied ? <Check size={14} /> : <Copy size={14} />}
      {copied ? 'Pronto pra colar' : 'Copiar tudo · Reels/Shorts'}
    </button>
  );
}

function ScoreBar({ label, score, accent }) {
  const pct = (score / 10) * 100;
  return (
    <div className="flex items-center gap-3">
      <div className="text-xs text-stone-500 w-32 shrink-0" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>{label}</div>
      <div className="flex-1 h-1.5 bg-stone-200 rounded-full overflow-hidden">
        <div className="h-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: accent }} />
      </div>
      <div className="text-xs font-medium w-8 text-right tabular-nums" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{score.toFixed(1)}</div>
    </div>
  );
}

function SubtitlePreview({ videoId, moment, subtitleConfig, videoConfig, overlayConfig, onVideoConfigChange, onSubtitleConfigChange }) {
  const config = subtitleConfig;
  const text = moment.key_quote || moment.hook_title || '';
  const chunks = useMemo(() => chunkText(text, config.charsPerScreen, config.lines), [text, config.charsPerScreen, config.lines]);
  const [chunkIndex, setChunkIndex] = useState(0);
  const canvasRef = useRef(null);
  const [canvasSize, setCanvasSize] = useState({ width: 200, height: 356 });
  const [dragState, setDragState] = useState(null);

  // Mede o tamanho real do canvas (preview) para converter px-canvas ↔ px-preview
  useEffect(() => {
    function measure() {
      if (canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect();
        if (rect.width > 0) setCanvasSize({ width: rect.width, height: rect.height });
      }
    }
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  // Canvas de referência (Reels/Shorts): 1080×1920 px
  const CANVAS_REF_WIDTH = 1080;
  const scaleFactor = canvasSize.width / CANVAS_REF_WIDTH;

  useEffect(() => {
    setChunkIndex(0);
    if (chunks.length <= 1) return;
    const interval = setInterval(() => {
      setChunkIndex((i) => (i + 1) % chunks.length);
    }, 2200);
    return () => clearInterval(interval);
  }, [chunks]);

  const currentChunk = chunks[chunkIndex] || '';
  const highlighted = highlightText(currentChunk, config);

  const anchorPercent = { top: 12, center: 50, bottom: 86 }[config.position] || 86;

  const sizeMap = { S: '14px', M: '17px', L: '21px' };

  const textStyle = {
    fontFamily: `'${config.font}', sans-serif`,
    color: config.textColor,
    fontSize: sizeMap[config.size],
    fontWeight: 700,
    lineHeight: 1.25,
    textAlign: 'center',
    letterSpacing: '0.01em',
    textShadow: config.background === 'shadow' ? '0 2px 8px rgba(0,0,0,0.85), 0 0 2px rgba(0,0,0,0.7)' : 'none',
    padding: config.background === 'translucent' || config.background === 'solid' ? '8px 14px' : '0',
    backgroundColor: config.background === 'translucent' ? 'rgba(0,0,0,0.55)' : config.background === 'solid' ? config.bgColor : 'transparent',
    borderRadius: config.background === 'translucent' || config.background === 'solid' ? '4px' : '0',
    display: 'inline-block',
    maxWidth: '92%'
  };

  // Drag handlers no layer do vídeo
  function handlePointerDown(e) {
    if (!onVideoConfigChange) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragState({
      startX: e.clientX,
      startY: e.clientY,
      initialX: videoConfig.x,
      initialY: videoConfig.y
    });
  }
  function handlePointerMove(e) {
    if (!dragState) return;
    const dxScreen = e.clientX - dragState.startX;
    const dyScreen = e.clientY - dragState.startY;
    // Converte movimento em px-preview para px-canvas-referência (1080×1920)
    const dxCanvas = dxScreen / scaleFactor;
    const dyCanvas = dyScreen / scaleFactor;
    onVideoConfigChange({
      ...videoConfig,
      x: Math.round(dragState.initialX + dxCanvas),
      y: Math.round(dragState.initialY + dyCanvas)
    });
  }
  function handlePointerUp(e) {
    if (e.currentTarget.hasPointerCapture && e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    setDragState(null);
  }

  // Posicionamento do vídeo: centralizado no canvas + offset do usuário, escala aplicada
  const vxPreview = videoConfig.x * scaleFactor;
  const vyPreview = videoConfig.y * scaleFactor;

  // Drag da legenda (mesma lógica do vídeo)
  const [subtitleDragState, setSubtitleDragState] = useState(null);
  function handleSubtitleDown(e) {
    if (!onSubtitleConfigChange) return;
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    setSubtitleDragState({
      startX: e.clientX,
      startY: e.clientY,
      initialX: config.x || 0,
      initialY: config.y || 0
    });
  }
  function handleSubtitleMove(e) {
    if (!subtitleDragState) return;
    const dxScreen = e.clientX - subtitleDragState.startX;
    const dyScreen = e.clientY - subtitleDragState.startY;
    const dxCanvas = dxScreen / scaleFactor;
    const dyCanvas = dyScreen / scaleFactor;
    onSubtitleConfigChange({
      ...config,
      x: Math.round(subtitleDragState.initialX + dxCanvas),
      y: Math.round(subtitleDragState.initialY + dyCanvas)
    });
  }
  function handleSubtitleUp(e) {
    if (e.currentTarget.hasPointerCapture && e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    setSubtitleDragState(null);
  }
  const sxPreview = (config.x || 0) * scaleFactor;
  const syPreview = (config.y || 0) * scaleFactor;

  return (
    <div
      ref={canvasRef}
      className="canvas-9-16 relative overflow-hidden rounded-md bg-stone-900 shadow-lg select-none isolate"
    >
      {/* CAMADA 1: vídeo (proxy via thumbnail), 16:9 nativo, transformável */}
      <div
        className="video-16-9 absolute cursor-move"
        style={{
          top: '50%',
          left: '50%',
          transform: `translate(calc(-50% + ${vxPreview}px), calc(-50% + ${vyPreview}px)) scale(${videoConfig.scale})`,
          transformOrigin: 'center center',
          touchAction: 'none'
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <img
          src={`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`}
          alt=""
          draggable={false}
          className="w-full h-full object-cover pointer-events-none"
          onError={(e) => { e.currentTarget.src = `https://img.youtube.com/vi/${videoId}/0.jpg`; }}
        />
      </div>

      {/* CAMADA 2: overlay PNG com área vazada (alpha) */}
      {overlayConfig?.dataURL && (
        <img
          src={overlayConfig.dataURL}
          alt=""
          draggable={false}
          className="absolute inset-0 w-full h-full pointer-events-none z-10"
          style={{
            opacity: overlayConfig.opacity,
            objectFit: 'cover'
          }}
        />
      )}

      {/* Gradiente sutil (só se não houver overlay) */}
      {!overlayConfig?.dataURL && (
        <div className="absolute inset-0 bg-gradient-to-b from-black/15 via-transparent to-black/30 pointer-events-none z-10" />
      )}

      {/* CAMADA 3: legenda (draggable, posicionada via anchor + offset) */}
      <div
        className="absolute flex items-center justify-center"
        style={{
          top: `calc(${anchorPercent}% + ${syPreview}px)`,
          left: `calc(50% + ${sxPreview}px)`,
          transform: 'translate(-50%, -50%)',
          maxWidth: '92%',
          padding: '4px',
          cursor: onSubtitleConfigChange ? 'move' : 'default',
          touchAction: 'none',
          zIndex: 20
        }}
        onPointerDown={handleSubtitleDown}
        onPointerMove={handleSubtitleMove}
        onPointerUp={handleSubtitleUp}
        onPointerCancel={handleSubtitleUp}
      >
        <span style={textStyle}>
          {highlighted.map((part, i) => (
            <span
              key={i}
              style={{
                color: part.type === 'scripture' || part.type === 'keyword' ? '#F4C04A' : config.textColor
              }}
            >
              {part.text}
            </span>
          ))}
        </span>
      </div>

      {/* Contador de chunks */}
      <div className="absolute top-3 left-3 px-2 py-0.5 bg-black/60 backdrop-blur rounded text-[10px] text-white tracking-wider uppercase pointer-events-none z-20" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
        {chunkIndex + 1}/{chunks.length}
      </div>
    </div>
  );
}

function MomentCard({ moment, videoId, subtitleConfig, videoConfig, overlayConfig, onVideoConfigChange, onSubtitleConfigChange, index }) {
  const startSec = timestampToSeconds(moment.timestamp_start);

  const purposeColor = {
    evangelization: '#B95D3F',
    edification: '#3F6BB9',
    hybrid: '#7A6A4F'
  }[moment.content_purpose] || '#3F3F3F';

  const purposeLabel = {
    evangelization: 'Evangelização',
    edification: 'Edificação',
    hybrid: 'Híbrido'
  }[moment.content_purpose] || moment.content_purpose;

  const hasRedFlag = moment.theological_check?.red_flags && moment.theological_check.red_flags.length > 0 && moment.theological_check.red_flags[0] !== 'nenhuma';
  const isColdOpen = moment.cold_open === true || moment.cold_open_analysis?.decision === 'apply_cold_open';

  const getScore = (key) => {
    const dim = moment.score_breakdown?.[key];
    if (typeof dim === 'object' && dim !== null) return dim.score || 0;
    return dim || 0;
  };

  return (
    <article className="bg-white border border-stone-200 rounded-sm overflow-hidden">
      <div className="px-6 py-5 border-b border-stone-200 flex items-start justify-between flex-wrap gap-3">
        <div className="flex items-baseline gap-4">
          <div className="text-4xl italic font-light text-stone-300" style={{ fontFamily: "'Instrument Serif', serif" }}>
            #{String(index + 1).padStart(2, '0')}
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span
                className="text-[10px] font-semibold tracking-[0.15em] uppercase px-2 py-0.5 rounded-sm text-white"
                style={{ backgroundColor: purposeColor, fontFamily: "'IBM Plex Sans', sans-serif" }}
              >
                {purposeLabel}
              </span>
              {isColdOpen && (
                <span className="text-[10px] font-semibold tracking-[0.15em] uppercase px-2 py-0.5 rounded-sm bg-stone-900 text-stone-50 inline-flex items-center gap-1" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>
                  <Flame size={10} /> Cold open
                </span>
              )}
              {hasRedFlag && (
                <span className="text-[10px] font-semibold tracking-[0.15em] uppercase px-2 py-0.5 rounded-sm bg-red-700 text-white inline-flex items-center gap-1" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>
                  <CircleAlert size={10} /> Red flag
                </span>
              )}
            </div>
            <div className="text-xs text-stone-500" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
              {moment.timestamp_start} → {moment.timestamp_end} · {moment.duration_seconds}s
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-light tabular-nums" style={{ fontFamily: "'Instrument Serif', serif" }}>
              {moment.viral_score?.toFixed(1)}
            </span>
            <span className="text-xs text-stone-500 tracking-widest uppercase" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>viral score</span>
          </div>
          <CopyAllButton moment={moment} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 p-6">
        {/* Coluna esquerda (desktop) / topo (mobile): canvas 9:16 */}
        <div className="md:col-span-5 min-w-0">
          <div className="canvas-width-only mb-2 flex items-center justify-between text-[10px] uppercase tracking-[0.15em] text-stone-400" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>
            <span>Preview · 9:16</span>
            <a
              href={`https://youtube.com/watch?v=${videoId}&t=${startSec}s`}
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:text-stone-900 transition-colors normal-case tracking-normal"
            >
              ver no YouTube ↗
            </a>
          </div>
          <SubtitlePreview
            videoId={videoId}
            moment={moment}
            subtitleConfig={subtitleConfig}
            videoConfig={videoConfig}
            overlayConfig={overlayConfig}
            onVideoConfigChange={onVideoConfigChange}
            onSubtitleConfigChange={onSubtitleConfigChange}
          />
        </div>

        {/* Coluna direita (desktop) / embaixo (mobile): assets de texto */}
        <div className="md:col-span-7 min-w-0 space-y-5">
          <div>
            <div className="text-[10px] uppercase tracking-[0.15em] text-stone-400 mb-1.5 flex items-center justify-between" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>
              <span>Hook</span>
              <CopyButton text={moment.hook_title} label="Copiar" />
            </div>
            <h2 className="text-2xl leading-snug" style={{ fontFamily: "'Instrument Serif', serif" }}>
              {moment.hook_title}
            </h2>
          </div>

          {moment.key_scripture && (
            <div className="border-l-2 pl-4 py-1" style={{ borderColor: '#F4C04A' }}>
              <div className="text-[10px] uppercase tracking-[0.15em] text-stone-400 mb-1" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>
                <BookOpen size={10} className="inline mr-1" />
                {moment.key_scripture.reference}
              </div>
              <p className="text-sm italic text-stone-700 leading-relaxed" style={{ fontFamily: "'Instrument Serif', serif" }}>
                "{moment.key_scripture.text}"
              </p>
              <p className="text-[10px] text-stone-400 mt-1" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                exibir {moment.key_scripture.when_to_display}
              </p>
            </div>
          )}

          <div>
            <div className="text-[10px] uppercase tracking-[0.15em] text-stone-400 mb-1.5 flex items-center justify-between" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>
              <span>Legenda do post · {moment.caption?.structure_used}</span>
              <CopyButton text={moment.caption?.text || ''} label="Copiar" />
            </div>
            <div className="bg-stone-50 p-4 rounded-sm border border-stone-200">
              <p className="text-sm leading-relaxed whitespace-pre-line text-stone-800" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>
                {moment.caption?.text}
              </p>
            </div>
          </div>

          <div>
            <div className="text-[10px] uppercase tracking-[0.15em] text-stone-400 mb-1.5 flex items-center justify-between" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>
              <span>Hashtags</span>
              <CopyButton text={moment.hashtags?.all || ''} label="Copiar" />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(moment.hashtags?.all || '').split(' ').filter(Boolean).map((tag, i) => (
                <span key={i} className="text-xs px-2 py-0.5 bg-stone-100 border border-stone-200 rounded-sm text-stone-700" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                  {tag}
                </span>
              ))}
            </div>
          </div>

          <div>
            <div className="text-[10px] uppercase tracking-[0.15em] text-stone-400 mb-1.5 flex items-center justify-between" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>
              <span>Call to action</span>
              <CopyButton text={moment.cta?.primary || ''} label="Copiar" />
            </div>
            <p className="text-sm font-medium text-stone-900" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>
              "{moment.cta?.primary}"
            </p>
          </div>

          <details className="group">
            <summary className="text-[10px] uppercase tracking-[0.15em] text-stone-400 cursor-pointer flex items-center gap-1.5 hover:text-stone-900 transition-colors list-none" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>
              <ChevronDown size={12} className="group-open:hidden" />
              <ChevronUp size={12} className="hidden group-open:block" />
              Score breakdown · theological check
            </summary>
            <div className="mt-3 space-y-2.5 pt-3 border-t border-stone-200">
              <ScoreBar label="Ressonância emocional" score={getScore('emotional_resonance')} accent={purposeColor} />
              <ScoreBar label="Valor informação" score={getScore('information_value')} accent={purposeColor} />
              <ScoreBar label="Qualidade história" score={getScore('story_quality')} accent={purposeColor} />
              <ScoreBar label="Compartilhabilidade" score={getScore('shareability')} accent={purposeColor} />
              <ScoreBar label="Controvérsia" score={getScore('controversy_potential')} accent={purposeColor} />
              <ScoreBar label="Força hook" score={getScore('hook_strength')} accent={purposeColor} />

              <div className="pt-3 mt-3 border-t border-stone-200">
                <div className="text-[10px] uppercase tracking-[0.15em] text-stone-400 mb-2" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>
                  <ShieldCheck size={10} className="inline mr-1" />
                  Checagem teológica
                </div>
                <div className="grid grid-cols-2 gap-1.5 text-xs" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>
                  {[
                    { key: 'christ_centered', label: 'Centrado em Cristo' },
                    { key: 'scripture_based', label: 'Baseado nas Escrituras' },
                    { key: 'grace_focused', label: 'Foco na graça' },
                    { key: 'hope_present', label: 'Esperança presente' },
                    { key: 'authentic', label: 'Autêntico' }
                  ].map(({ key, label }) => (
                    <div key={key} className="flex items-center gap-1.5 text-stone-700">
                      {moment.theological_check?.[key] ? (
                        <Check size={12} className="text-emerald-700" />
                      ) : (
                        <CircleAlert size={12} className="text-red-700" />
                      )}
                      {label}
                    </div>
                  ))}
                </div>
              </div>

              {moment.viral_reasoning && (
                <div className="pt-3 mt-3 border-t border-stone-200">
                  <div className="text-[10px] uppercase tracking-[0.15em] text-stone-400 mb-1.5" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>
                    Por que viral
                  </div>
                  <p className="text-xs leading-relaxed text-stone-600" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>
                    {moment.viral_reasoning}
                  </p>
                </div>
              )}
            </div>
          </details>
        </div>
      </div>
    </article>
  );
}

function NumberField({ label, value, onChange, step = 10, suffix = 'px' }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[10px] uppercase tracking-wider text-stone-400">{label}</label>
      <div className="flex items-center bg-white border border-stone-300 rounded-sm overflow-hidden">
        <input
          type="number"
          value={value}
          step={step}
          onChange={(e) => onChange(parseInt(e.target.value) || 0)}
          className="flex-1 px-2 py-1.5 text-xs tabular-nums focus:outline-none"
          style={{ fontFamily: "'IBM Plex Mono', monospace" }}
        />
        <span className="text-[10px] text-stone-400 pr-2 tracking-wider">{suffix}</span>
      </div>
    </div>
  );
}

function SubtitleControls({ config, setConfig }) {
  const update = (key, value) => setConfig({ ...config, [key]: value });
  const resetPosition = () => setConfig({ ...config, x: 0, y: 0 });
  return (
    <div className="space-y-3" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 text-xs">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] uppercase tracking-wider text-stone-400">Fonte</label>
          <select value={config.font} onChange={(e) => update('font', e.target.value)} className="bg-white border border-stone-300 rounded-sm px-2 py-1.5 text-xs">
            <option value="IBM Plex Sans">Plex Sans</option>
            <option value="Inter Tight">Inter Tight</option>
            <option value="Manrope">Manrope</option>
            <option value="Bebas Neue">Bebas Neue</option>
            <option value="Anton">Anton</option>
            <option value="Archivo Black">Archivo Black</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] uppercase tracking-wider text-stone-400">Cor</label>
          <div className="flex items-center gap-1.5 bg-white border border-stone-300 rounded-sm px-2 py-1">
            <input type="color" value={config.textColor} onChange={(e) => update('textColor', e.target.value)} className="w-5 h-5 cursor-pointer border-0 p-0" />
            <span className="text-[10px] text-stone-500 tabular-nums" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{config.textColor.toUpperCase()}</span>
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] uppercase tracking-wider text-stone-400">Fundo</label>
          <select value={config.background} onChange={(e) => update('background', e.target.value)} className="bg-white border border-stone-300 rounded-sm px-2 py-1.5 text-xs">
            <option value="none">Nenhum</option>
            <option value="shadow">Sombra</option>
            <option value="translucent">Translúcido</option>
            <option value="solid">Sólido</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] uppercase tracking-wider text-stone-400">Âncora</label>
          <select value={config.position} onChange={(e) => { update('position', e.target.value); }} className="bg-white border border-stone-300 rounded-sm px-2 py-1.5 text-xs">
            <option value="top">Topo</option>
            <option value="center">Centro</option>
            <option value="bottom">Inferior</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] uppercase tracking-wider text-stone-400">Tamanho</label>
          <div className="flex bg-white border border-stone-300 rounded-sm overflow-hidden">
            {['S', 'M', 'L'].map((s) => (
              <button key={s} onClick={() => update('size', s)} className={`flex-1 py-1.5 text-xs font-medium ${config.size === s ? 'bg-stone-900 text-stone-50' : 'text-stone-600 hover:bg-stone-100'}`}>{s}</button>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] uppercase tracking-wider text-stone-400">Chars/tela: {config.charsPerScreen}</label>
          <input type="range" min="15" max="60" value={config.charsPerScreen} onChange={(e) => update('charsPerScreen', parseInt(e.target.value))} className="h-1.5" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] uppercase tracking-wider text-stone-400">Linhas</label>
          <div className="flex bg-white border border-stone-300 rounded-sm overflow-hidden">
            {[1, 2, 3].map((n) => (
              <button key={n} onClick={() => update('lines', n)} className={`flex-1 py-1.5 text-xs font-medium ${config.lines === n ? 'bg-stone-900 text-stone-50' : 'text-stone-600 hover:bg-stone-100'}`}>{n}</button>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] uppercase tracking-wider text-stone-400">Destaque</label>
          <div className="flex flex-col gap-0.5">
            <label className="inline-flex items-center gap-1.5 cursor-pointer text-[11px]">
              <input type="checkbox" checked={config.highlightScripture} onChange={(e) => update('highlightScripture', e.target.checked)} className="w-3 h-3 accent-amber-500" />
              Versículos
            </label>
            <label className="inline-flex items-center gap-1.5 cursor-pointer text-[11px]">
              <input type="checkbox" checked={config.highlightKeywords} onChange={(e) => update('highlightKeywords', e.target.checked)} className="w-3 h-3 accent-amber-500" />
              Jesus/Deus
            </label>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-xs items-end border-t border-stone-200 pt-3">
        <NumberField label="Offset X" value={config.x || 0} onChange={(v) => update('x', v)} step={10} suffix="px" />
        <NumberField label="Offset Y" value={config.y || 0} onChange={(v) => update('y', v)} step={10} suffix="px" />
        <button onClick={resetPosition} className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 border border-stone-300 hover:border-stone-900 hover:bg-stone-900 hover:text-stone-50 rounded-sm text-[11px] tracking-wide uppercase font-medium transition-colors">
          <RotateCcw size={11} /> Resetar posição
        </button>
        <div className="col-span-2 md:col-span-2 text-[10px] text-stone-500 flex items-center gap-1.5">
          <Move size={10} />
          Arraste a legenda direto no preview · offset em relação à âncora · canvas 1080×1920
        </div>
      </div>
    </div>
  );
}

function VideoControls({ config, setConfig }) {
  const update = (key, value) => setConfig({ ...config, [key]: value });
  const reset = () => setConfig({ x: 0, y: 0, scale: 1.0 });
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-xs items-end" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>
      <NumberField label="Position X" value={config.x} onChange={(v) => update('x', v)} step={10} suffix="px" />
      <NumberField label="Position Y" value={config.y} onChange={(v) => update('y', v)} step={10} suffix="px" />
      <div className="flex flex-col gap-1 md:col-span-2">
        <label className="text-[10px] uppercase tracking-wider text-stone-400 flex items-center justify-between">
          <span>Escala</span>
          <span className="tabular-nums" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{config.scale.toFixed(2)}×</span>
        </label>
        <input type="range" min="0.1" max="5" step="0.05" value={config.scale} onChange={(e) => update('scale', parseFloat(e.target.value))} className="h-1.5" />
      </div>
      <button onClick={reset} className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 border border-stone-300 hover:border-stone-900 hover:bg-stone-900 hover:text-stone-50 rounded-sm text-[11px] tracking-wide uppercase font-medium transition-colors">
        <RotateCcw size={11} /> Resetar
      </button>
      <div className="col-span-2 md:col-span-5 text-[10px] text-stone-500 flex items-center gap-1.5 pt-1">
        <Move size={10} />
        Arraste o vídeo direto no preview para reposicionar · Canvas de referência: 1080×1920 px (Reels/Shorts)
      </div>
    </div>
  );
}

function OverlayControls({ config, setConfig }) {
  const inputRef = useRef(null);
  function handleUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Selecione um arquivo de imagem (PNG recomendado para áreas vazadas com transparência)');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      setConfig({ dataURL: ev.target.result, opacity: 1.0, filename: file.name });
    };
    reader.readAsDataURL(file);
  }
  function clear() {
    setConfig({ dataURL: null, opacity: 1.0, filename: null });
    if (inputRef.current) inputRef.current.value = '';
  }
  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center text-xs" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>
      <div className="md:col-span-5">
        {!config.dataURL ? (
          <label className="cursor-pointer flex items-center gap-2 px-4 py-3 border-2 border-dashed border-stone-300 hover:border-stone-900 hover:bg-stone-50 rounded-sm transition-colors">
            <Upload size={14} className="text-stone-500" />
            <span className="text-xs text-stone-700">Enviar PNG com área vazada</span>
            <input ref={inputRef} type="file" accept="image/png,image/*" onChange={handleUpload} className="hidden" />
          </label>
        ) : (
          <div className="flex items-center gap-3 px-3 py-2 bg-white border border-stone-300 rounded-sm">
            <div className="w-10 h-[71px] bg-checker rounded-sm overflow-hidden shrink-0 border border-stone-200" style={{ backgroundImage: 'linear-gradient(45deg, #e7e5e4 25%, transparent 25%), linear-gradient(-45deg, #e7e5e4 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e7e5e4 75%), linear-gradient(-45deg, transparent 75%, #e7e5e4 75%)', backgroundSize: '8px 8px', backgroundPosition: '0 0, 0 4px, 4px -4px, -4px 0px' }}>
              <img src={config.dataURL} alt="" className="w-full h-full object-cover" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-stone-700 truncate" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{config.filename}</p>
              <p className="text-[10px] text-stone-400 tracking-wider uppercase">overlay ativo</p>
            </div>
            <button onClick={clear} className="text-[11px] uppercase tracking-wide underline underline-offset-2 text-stone-500 hover:text-stone-900">Remover</button>
          </div>
        )}
      </div>
      <div className="md:col-span-4 flex flex-col gap-1">
        <label className="text-[10px] uppercase tracking-wider text-stone-400 flex items-center justify-between">
          <span>Opacidade</span>
          <span className="tabular-nums" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{Math.round(config.opacity * 100)}%</span>
        </label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={config.opacity}
          onChange={(e) => setConfig({ ...config, opacity: parseFloat(e.target.value) })}
          disabled={!config.dataURL}
          className="h-1.5 disabled:opacity-30"
        />
      </div>
      <div className="md:col-span-3 text-[10px] text-stone-500 flex items-start gap-1.5">
        <ImageIcon size={10} className="mt-0.5 shrink-0" />
        <span>Áreas transparentes do PNG deixam o vídeo aparecer por baixo</span>
      </div>
    </div>
  );
}

function ConfigPanel({ subtitleConfig, setSubtitleConfig, videoConfig, setVideoConfig, overlayConfig, setOverlayConfig, activeTab, setActiveTab, isCollapsed, setIsCollapsed }) {
  const tabs = [
    { id: 'subtitle', label: 'Legenda', icon: Type },
    { id: 'video', label: 'Vídeo', icon: Move },
    { id: 'overlay', label: 'Overlay', icon: ImageIcon }
  ];
  return (
    <div className="bg-stone-50/95 border-b border-stone-200 sticky top-0 z-50 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center gap-1 pt-4">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); if (isCollapsed) setIsCollapsed(false); }}
                className={`inline-flex items-center gap-1.5 px-3 py-2 text-[11px] tracking-[0.15em] uppercase font-medium border-b-2 transition-colors ${active && !isCollapsed ? 'border-stone-900 text-stone-900' : 'border-transparent text-stone-400 hover:text-stone-700'}`}
                style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}
              >
                <Icon size={11} />
                {tab.label}
              </button>
            );
          })}
          <div className="ml-auto flex items-center gap-3 pb-2">
            <div className="text-[10px] uppercase tracking-[0.2em] text-stone-400 hidden lg:block" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>
              Configuração global · aplica aos 5
            </div>
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="inline-flex items-center gap-1 px-2 py-1 text-[10px] tracking-[0.15em] uppercase font-medium text-stone-600 hover:text-stone-900 border border-stone-300 hover:border-stone-900 rounded-sm transition-colors"
              style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}
              title={isCollapsed ? 'Expandir painel' : 'Recolher painel'}
            >
              {isCollapsed ? <ChevronDown size={11} /> : <ChevronUp size={11} />}
              {isCollapsed ? 'Expandir' : 'Recolher'}
            </button>
          </div>
        </div>
        {!isCollapsed && (
          <div className="py-4">
            {activeTab === 'subtitle' && <SubtitleControls config={subtitleConfig} setConfig={setSubtitleConfig} />}
            {activeTab === 'video' && <VideoControls config={videoConfig} setConfig={setVideoConfig} />}
            {activeTab === 'overlay' && <OverlayControls config={overlayConfig} setConfig={setOverlayConfig} />}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// MAIN APP
// ============================================================================
export default function App() {
  const [view, setView] = useState('input');
  const [url, setUrl] = useState('');
  const [transcript, setTranscript] = useState('');
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [loadingStep, setLoadingStep] = useState(0);
  const [exampleVideoId, setExampleVideoId] = useState(null);

  const [config, setConfig] = useState({
    font: 'IBM Plex Sans',
    textColor: '#FFFFFF',
    background: 'shadow',
    bgColor: '#000000',
    charsPerScreen: 30,
    lines: 2,
    position: 'bottom',
    size: 'M',
    highlightScripture: true,
    highlightKeywords: true,
    x: 0,
    y: 0
  });

  const [videoConfig, setVideoConfig] = useState({ x: 0, y: 0, scale: 1.0 });
  const [overlayConfig, setOverlayConfig] = useState({ dataURL: null, opacity: 1.0, filename: null });
  const [activeTab, setActiveTab] = useState('subtitle');
  const [isConfigCollapsed, setIsConfigCollapsed] = useState(false);

  const videoId = useMemo(() => exampleVideoId || extractVideoId(url), [url, exampleVideoId]);

  const loadingMessages = ['Mapeando momentos candidatos…', 'Pontuando 6 dimensões…', 'Aplicando theological check…', 'Decidindo cold open vs linear…', 'Estruturando assets de cada momento…'];

  useEffect(() => {
    if (view !== 'analyzing') return;
    setLoadingStep(0);
    const interval = setInterval(() => {
      setLoadingStep((s) => (s + 1) % loadingMessages.length);
    }, 3500);
    return () => clearInterval(interval);
  }, [view]);

  async function analyze() {
    setError(null);
    if (!videoId) {
      setError('URL do YouTube inválida.');
      return;
    }
    if (!transcript.trim()) {
      setError('Cole a transcrição.');
      return;
    }
    if (!/\d{1,2}:\d{2}/.test(transcript)) {
      setError('A transcrição precisa ter timestamps no formato MM:SS.');
      return;
    }

    setView('analyzing');
    try {
      const fullPrompt = `${OPTIMIZED_PROMPT}\n\n<transcript>\n${transcript}\n</transcript>\n\nExecute análise completa. Retorne EXATAMENTE 5 momentos em top_moments, ordenados por viral_score descendente. APENAS JSON, sem texto adicional.`;

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 8000,
          messages: [{ role: 'user', content: fullPrompt }]
        })
      });

      const data = await response.json();
      console.log('API response:', data);

      if (!response.ok) {
        throw new Error(`API: ${data?.error?.message || response.status}`);
      }
      if (!data.content || !Array.isArray(data.content)) {
        throw new Error(`Resposta inesperada: ${JSON.stringify(data).slice(0, 200)}`);
      }

      const textContent = data.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n');
      if (!textContent) throw new Error('Resposta vazia');

      const parsed = parseJsonFromResponse(textContent);
      if (!parsed.top_moments || !Array.isArray(parsed.top_moments)) {
        throw new Error('JSON sem top_moments');
      }
      parsed.top_moments = parsed.top_moments.slice(0, 5);
      setResults(parsed);
      setView('results');
    } catch (e) {
      console.error('Erro:', e);
      setError(`Falha na análise: ${e.message}`);
      setView('input');
    }
  }

  function loadExample() {
    setUrl(EXAMPLE_URL);
    setTranscript(EXAMPLE_TRANSCRIPT);
    setExampleVideoId(extractVideoId(EXAMPLE_URL));
    setResults(EXAMPLE_RESPONSE);
    setView('results');
  }

  function reset() {
    setView('input');
    setResults(null);
    setError(null);
    setExampleVideoId(null);
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F5F1EA' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=IBM+Plex+Sans:wght@300;400;500;600;700&family=IBM+Plex+Mono:wght@400;500&family=Inter+Tight:wght@500;700&family=Manrope:wght@500;700;800&family=Bebas+Neue&family=Anton&family=Archivo+Black&display=swap');
        body { font-family: 'IBM Plex Sans', sans-serif; }
        details > summary::-webkit-details-marker { display: none; }

        /* Dimensões fixas do canvas (CSS puro pra escapar de qualquer issue com Tailwind arbitrary values) */
        .canvas-9-16 {
          width: 280px;
          height: 498px;
          margin-left: auto;
          margin-right: auto;
        }
        .video-16-9 {
          width: 280px;
          height: 158px;
        }
        .canvas-width-only {
          width: 280px;
          margin-left: auto;
          margin-right: auto;
        }
        @media (min-width: 768px) {
          .canvas-9-16 {
            width: 340px;
            height: 604px;
            margin-left: 0;
            margin-right: 0;
          }
          .video-16-9 {
            width: 340px;
            height: 191px;
          }
          .canvas-width-only {
            width: 340px;
            margin-left: 0;
            margin-right: 0;
          }
        }
      `}</style>

      <header className="border-b border-stone-300 bg-stone-50">
        <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-baseline gap-3">
            <div className="text-2xl tracking-tight" style={{ fontFamily: "'Instrument Serif', serif" }}>
              Momentos Virais<span className="italic text-stone-400"> · cristão</span>
            </div>
            <div className="text-[10px] tracking-[0.2em] uppercase text-stone-400 hidden md:block" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>
              Análise de pregações para Reels & Shorts
            </div>
          </div>
          {view === 'results' && (
            <button onClick={reset} className="inline-flex items-center gap-2 text-xs px-3 py-1.5 border border-stone-300 hover:border-stone-900 hover:bg-stone-900 hover:text-stone-50 transition-colors rounded-sm" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>
              <ArrowLeft size={12} /> Nova análise
            </button>
          )}
        </div>
      </header>

      {view === 'input' && (
        <div className="max-w-3xl mx-auto px-6 py-16">
          <div className="mb-10">
            <p className="text-[10px] tracking-[0.3em] uppercase text-stone-500 mb-3" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>
              Passo 1 — Insira o material
            </p>
            <h1 className="text-5xl leading-tight mb-3" style={{ fontFamily: "'Instrument Serif', serif" }}>
              Cole o vídeo e a <em>transcrição</em>.
            </h1>
            <p className="text-stone-600 leading-relaxed max-w-xl" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>
              A análise extrai os 5 melhores momentos para Reels e Shorts, equilibrando evangelização e edificação, com checagem teológica e estrutura de edição pronta.
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-sm flex items-start gap-2.5">
              <AlertCircle size={16} className="text-red-700 shrink-0 mt-0.5" />
              <p className="text-sm text-red-900" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>{error}</p>
            </div>
          )}

          <div className="space-y-6">
            <div>
              <label className="text-[10px] tracking-[0.2em] uppercase text-stone-500 mb-2 flex items-center gap-1.5" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>
                <Youtube size={11} />
                URL do YouTube
              </label>
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                className="w-full px-4 py-3 bg-white border border-stone-300 rounded-sm focus:outline-none focus:border-stone-900 text-sm"
                style={{ fontFamily: "'IBM Plex Mono', monospace" }}
              />
              {videoId && (
                <p className="text-[10px] mt-1.5 text-emerald-700 tracking-wider" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                  ✓ video_id: {videoId}
                </p>
              )}
            </div>

            <div>
              <label className="text-[10px] tracking-[0.2em] uppercase text-stone-500 mb-2 flex items-center gap-1.5" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>
                <FileText size={11} />
                Transcrição com timestamps
              </label>
              <textarea
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                placeholder="00:00 Texto do primeiro segmento...&#10;00:12 Texto do segundo segmento...&#10;&#10;Formato: MM:SS texto"
                rows={12}
                className="w-full px-4 py-3 bg-white border border-stone-300 rounded-sm focus:outline-none focus:border-stone-900 text-xs leading-relaxed resize-y"
                style={{ fontFamily: "'IBM Plex Mono', monospace" }}
              />
              <p className="text-[10px] text-stone-400 mt-1.5" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>
                Dica: no YouTube, clique em <em>"…"</em> abaixo do vídeo → <em>"Mostrar transcrição"</em> e copie tudo.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2 flex-wrap">
              <button
                onClick={analyze}
                disabled={!url || !transcript}
                className="inline-flex items-center gap-2 px-6 py-3 bg-stone-900 text-stone-50 rounded-sm text-sm font-medium hover:bg-stone-800 disabled:bg-stone-300 disabled:cursor-not-allowed transition-colors"
                style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}
              >
                <Sparkles size={14} />
                Analisar momentos virais
              </button>
              <button
                onClick={loadExample}
                className="inline-flex items-center gap-2 px-4 py-3 border border-stone-400 text-stone-700 hover:bg-stone-900 hover:text-stone-50 hover:border-stone-900 rounded-sm text-sm transition-colors"
                style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}
              >
                Ver exemplo pronto →
              </button>
            </div>

            <div className="text-[10px] text-stone-400 pt-2" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>
              <strong className="text-stone-600">Nota:</strong> "Ver exemplo pronto" usa uma resposta pré-processada para demonstrar a UI sem chamar a API. "Analisar" tenta chamar a API real (funciona quando portado para Claude Code com max_tokens 8000).
            </div>
          </div>
        </div>
      )}

      {view === 'analyzing' && (
        <div className="max-w-3xl mx-auto px-6 py-32 text-center">
          <Loader2 size={32} className="animate-spin text-stone-900 mx-auto mb-6" />
          <h2 className="text-3xl mb-2" style={{ fontFamily: "'Instrument Serif', serif" }}>
            Analisando…
          </h2>
          <p className="text-stone-600 text-sm transition-opacity duration-500" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>
            {loadingMessages[loadingStep]}
          </p>
          <p className="text-[10px] tracking-[0.2em] uppercase text-stone-400 mt-12" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>
            Costuma levar 30–60 segundos
          </p>
        </div>
      )}

      {view === 'results' && results && (
        <>
          <ConfigPanel
            subtitleConfig={config}
            setSubtitleConfig={setConfig}
            videoConfig={videoConfig}
            setVideoConfig={setVideoConfig}
            overlayConfig={overlayConfig}
            setOverlayConfig={setOverlayConfig}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            isCollapsed={isConfigCollapsed}
            setIsCollapsed={setIsConfigCollapsed}
          />

          <div className="max-w-7xl mx-auto px-6 pt-8 pb-4">
            <p className="text-[10px] tracking-[0.3em] uppercase text-stone-500 mb-2" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>
              Resultado da análise
            </p>
            <h2 className="text-3xl leading-tight mb-3" style={{ fontFamily: "'Instrument Serif', serif" }}>
              Top 5 momentos · <em className="text-stone-400">{results.metadata?.overall_topic}</em>
            </h2>
            <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-stone-600" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>
              <span>Duração: <span className="tabular-nums" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{results.metadata?.total_duration}</span></span>
              <span>Tipo: <span className="text-stone-900">{results.metadata?.content_type}</span></span>
              <span>Candidatos ≥ 6.5: <span className="tabular-nums" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{results.analysis_summary?.candidates_above_threshold}</span></span>
              <span>Balance: <span className="tabular-nums" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{results.analysis_summary?.balance?.evangelization} / {results.analysis_summary?.balance?.edification}</span></span>
            </div>
          </div>

          <main className="max-w-7xl mx-auto px-6 pb-16 space-y-6">
            {results.top_moments.map((moment, i) => (
              <MomentCard
                key={i}
                moment={moment}
                videoId={videoId}
                subtitleConfig={config}
                videoConfig={videoConfig}
                overlayConfig={overlayConfig}
                onVideoConfigChange={setVideoConfig}
                onSubtitleConfigChange={setConfig}
                index={i}
              />
            ))}
          </main>
        </>
      )}

      <footer className="border-t border-stone-300 mt-16 py-8 text-center text-[10px] tracking-[0.2em] uppercase text-stone-400" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>
        Protótipo · Built with Claude
      </footer>
    </div>
  );
}
