/**
 * Real video-editor timecode transcript slices (D4 — TASK_019), lifted verbatim
 * from `memory_bank/tasks/evidence/local-smoke/analyze-60-request.network-request`
 * (the genuine 68 KB sermon export that produced "Transcript indisponível").
 *
 * Format per block (`HH:MM:SS:FF - HH:MM:SS:FF` 30fps range / speaker label /
 * spoken text / blank separator) — the shape the strict `MM:SS` parser rejected.
 * Fixtures live under `__tests__/` so they are test code (no coverage burden)
 * and are shared by transcript-lines + subtitle-cues suites.
 */

/** One real block — minimal slice for frames-drop / speaker-skip assertions. */
export const EDITOR_SINGLE_BLOCK =
  '00:00:00:26 - 00:00:17:24\nUnknown\nSantidade.';

/** Three consecutive real blocks — multi-anchor, no cross-bleed. */
export const EDITOR_THREE_BLOCKS = [
  '00:00:00:26 - 00:00:17:24\nUnknown\nSantidade.',
  '00:00:17:26 - 00:00:22:21\nUnknown\nOi? Os irmãos.',
  '00:00:22:24 - 00:00:30:12\nUnknown\nProcurar em seus lugares, sentar, se acalmar.',
].join('\n\n');

/**
 * Real blocks covering all 5 moment ranges of analyze-60 (the smoke sermon),
 * concatenated in file order. Proves cues populate for every covered range.
 */
export const EDITOR_MOMENT_TRANSCRIPT = [
  '01:19:11:12 - 01:19:44:00\nUnknown\nGênesis capítulo 39, versículo de número 12. Então ela pegou as vestes e lhe disse Deita te comigo. Ele, porém, deixando as vestes nas mão dela, saiu fugindo para fora. Ele seguiu o ponto de Paulo Fuja! Não tente enfrentar de frente. Temos também o mesmo conselho dado a Timóteo em segunda Timóteo, capítulo dois, versículo 22 Foge das paixões da mocidade.',
  '01:19:44:03 - 01:20:26:01\nUnknown\nFoge. Pecado sexual não deve ser. Não deve ser enfrentado com autoconfiança, mas uma vigilância, uma fuga. Não devemos brincar com as tentações, não devemos alimentar flertes pecaminosos, não devemos manter relacionamentos impróprios, não devemos viver uma vida dupla escondida atrás da aparência. Ministerial Meus irmãos, o Senhor através da Sua Palavra, nos fala hoje o nosso corpo. Meu irmão, você que é casado, o seu corpo pertence ao Senhor exclusivamente a sua esposa.',
  '01:22:15:18 - 01:22:52:24\nUnknown\nEle diz Primeiro, qualquer que olhar, veja, qualquer que olhar não é um olhar involuntário ou momentâneo. A ideia é de um olhar contínuo, um olhar deliberado, um olhar contemplativo. Jesus não condena reconhecer a beleza, mas o olhar cultivado para alimentar desejos pecaminosos. O problema não é a visão natural. O problema é a intenção do meu olhar. Qualquer que olhar, vejo com intenção impura, algo pecaminoso.',
  '01:22:52:24 - 01:23:29:28\nUnknown\nO desejo de cobiçar. Há uma limitação do coração, um desejo voluntário que está ligado à fonte. A fonte é o coração, portanto, o homem de uma só mulher. Ele controla os seus pensamentos, Ele controla as suas emoções. Ele vigia os seus olhos, Ele guarda a sua imaginação. Meus irmãos, eu lembro aqui de Jó, capítulo 31 O homem tão antigo para muitos, o primeiro livro da Bíblia.',
  '01:25:42:19 - 01:26:12:06\nUnknown\nNão é algo frio, não é algo negligente, não é algo egoísta, indiferente? Não. Pelo contrário, é um amor sacrificial, honrando a, valorizando a, investindo de alguma forma, colocando as minhas emoções ou cuidando das suas emoções, de não deixarmos muitas vezes elas sozinhas, mas estarmos atentos às preocupações do lar. Muitas vezes, meus irmãos, posso dizer que isso é chocante para você, mas há momentos que você precisa dizer a minha esposa descanse porque?',
  '01:26:12:13 - 01:26:19:09\nUnknown\nPorque hoje eu vou ficar na cozinha cuidando dos afazeres para você descansar.',
  '01:26:19:12 - 01:26:41:01\nUnknown\nEu vou tratar, eu vou cuidar de você também, Porque às vezes nós colocamos um peso muito grande, como se a esposa ela tivesse que fazer tudo dentro do lar. Mas nós precisamos equilibrar isso para que ela também seja assistida. Não tem problema muitas vezes nós ajudarmos a nossa esposa. Isso não lhe desvaloriza, pelo contrário, você cuida e valoriza a sua esposa.',
  '01:28:25:10 - 01:28:59:13\nUnknown\nVocê colocou essa aliança no dedo da sua esposa e você disse Prometo ser fiel a você na alegria e na tristeza, na saúde, na doença, na riqueza, amando a, amando a todos os dias da minha vida. E quando você colocou essa aliança no dedo, você fechou o pacto, o pacto do amor diante de Deus, que iremos perseverar até que a morte nos separe.',
  '01:28:59:15 - 01:29:31:09\nUnknown\nPrecisamos ser fieis nas crises, nas dificuldades, nas enfermidades, nas lutas, nas estações difíceis da vida conjugal. Sua fidelidade não depende, não depende apenas dos sentimentos momentâneos, mas a fidelidade de Deus. Olhe para o padrão de Deus no Antigo Testamento. Deus não desistiu do seu povo. Foi um amor leal, um amor fiel a Ele mesmo. Ele sempre buscou o povo e da mesma forma deve ser o nosso amor, fidelidade, fidelidade.',
  '01:32:32:14 - 01:33:13:06\nUnknown\nO Evangelho não apenas expõe o nosso pecado. O Evangelho também oferece perdão. O Evangelho também oferece purificação. O Evangelho oferece transformação. Cristo restaura homens caídos. Cristo fortalece casamentos, Cristo purifica corações. Cristo concede poder para vivenciarmos o poder da ressurreição de Cristo Jesus. O pecado sexual continua sendo algo sério, Entretanto, a graça de Deus é maior do que qualquer pecado.',
].join('\n\n');

/** The 5 real moment ranges (timestamp_start/end) from analyze-60-response. */
export const EDITOR_MOMENT_RANGES = Object.freeze([
  { rank: 1, start: '01:28:25', end: '01:29:13' },
  { rank: 2, start: '01:19:11', end: '01:20:00' },
  { rank: 3, start: '01:22:15', end: '01:23:00' },
  { rank: 4, start: '01:32:14', end: '01:32:55' },
  { rank: 5, start: '01:25:42', end: '01:26:41' },
]);
