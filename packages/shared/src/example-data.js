export const EXAMPLE_URL = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";

export const EXAMPLE_TRANSCRIPT = `00:00 Bom dia, igreja. Hoje quero falar de algo que mudou completamente a minha forma de ver Deus.
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

export const EXAMPLE_RESPONSE = {
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
        information_value: { score: 8, notes: "Quebrantamento como convite, não castigo — verdade libertadora" },
        story_quality: { score: 9.5, notes: "Arco perfeito: crise → clamor → resposta divina → transformação. Deus como herói." },
        shareability: { score: 9.2, notes: "Ansiedade e crise existencial são universais — não-cristãos se identificam" },
        controversy_potential: { score: 4, notes: "Testemunho sincero, baixa controvérsia" },
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
        emotional_resonance: { score: 9, notes: "Honestidade rara: pastor admitindo briga com Deus, dúvida, choro" },
        information_value: { score: 8, notes: "Verdade contra-intuitiva: fidelidade de Deus não depende do resultado" },
        story_quality: { score: 8.5, notes: "Arco com tensão real (câncer) + descoberta + resolução" },
        shareability: { score: 8, notes: "Sofrimento e fé com dúvidas são experiências amplas" },
        controversy_potential: { score: 6, notes: "Admitir briga com Deus pode soar problemático para alguns cristãos legalistas" },
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
        emotional_resonance: { score: 8, notes: "Conforto profundo em meio à dor" },
        information_value: { score: 9, notes: "Insight contra-intuitivo: Deus promete presença, não ausência do vale" },
        story_quality: { score: 6, notes: "Mais reflexão que história" },
        shareability: { score: 9, notes: "'Presença no vale, não ausência do vale' é altamente citável" },
        controversy_potential: { score: 5, notes: "Refuta sutilmente a teologia da prosperidade" },
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
        emotional_resonance: { score: 6, notes: "Mais didático, menor carga emocional" },
        information_value: { score: 9.5, notes: "Diagnóstico claro de dois erros teológicos comuns" },
        story_quality: { score: 5.5, notes: "Conceito, não narrativa" },
        shareability: { score: 8.5, notes: "Cristãos vão se identificar e marcar amigos" },
        controversy_potential: { score: 7, notes: "Marca posição teológica sobre graça vs lei" },
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
        emotional_resonance: { score: 5, notes: "Conteúdo didático, baixa carga emocional" },
        information_value: { score: 9.5, notes: "Distinção teológica fundamental clarificada" },
        story_quality: { score: 5, notes: "Conceito, não história" },
        shareability: { score: 9, notes: "Cristãos em crescimento amam essa clareza" },
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
