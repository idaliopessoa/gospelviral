import { AlertCircle, FileText, Sparkles, Youtube } from 'lucide-react';

export default function InputView({
  url,
  setUrl,
  transcript,
  setTranscript,
  videoId,
  onAnalyze,
  onLoadExample,
  error,
}) {
  return (
    <div className="max-w-3xl mx-auto px-6 py-16">
      <div className="mb-10">
        <p
          className="text-[10px] tracking-[0.3em] uppercase text-stone-500 mb-3"
          style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}
        >
          Passo 1 — Insira o material
        </p>
        <h1
          className="text-5xl leading-tight mb-3"
          style={{ fontFamily: "'Instrument Serif', serif" }}
        >
          Cole o vídeo e a <em>transcrição</em>.
        </h1>
        <p
          className="text-stone-600 leading-relaxed max-w-xl"
          style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}
        >
          A análise extrai os 5 melhores momentos para Reels e Shorts, equilibrando evangelização e
          edificação, com checagem teológica e estrutura de edição pronta.
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-sm flex items-start gap-2.5">
          <AlertCircle size={16} className="text-red-700 shrink-0 mt-0.5" />
          <p
            className="text-sm text-red-900"
            style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}
          >
            {error}
          </p>
        </div>
      )}

      <div className="space-y-6">
        <div>
          <label
            className="text-[10px] tracking-[0.2em] uppercase text-stone-500 mb-2 flex items-center gap-1.5"
            style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}
          >
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
            <p
              className="text-[10px] mt-1.5 text-emerald-700 tracking-wider"
              style={{ fontFamily: "'IBM Plex Mono', monospace" }}
            >
              ✓ video_id: {videoId}
            </p>
          )}
        </div>

        <div>
          <label
            className="text-[10px] tracking-[0.2em] uppercase text-stone-500 mb-2 flex items-center gap-1.5"
            style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}
          >
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
          <p
            className="text-[10px] text-stone-400 mt-1.5"
            style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}
          >
            Dica: no YouTube, clique em <em>{'"…"'}</em> abaixo do vídeo →{' '}
            <em>{'"Mostrar transcrição"'}</em> e copie tudo.
          </p>
        </div>

        <div className="flex items-center gap-3 pt-2 flex-wrap">
          <button
            onClick={onAnalyze}
            disabled={!url || !transcript}
            className="inline-flex items-center gap-2 px-6 py-3 bg-stone-900 text-stone-50 rounded-sm text-sm font-medium hover:bg-stone-800 disabled:bg-stone-300 disabled:cursor-not-allowed transition-colors"
            style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}
          >
            <Sparkles size={14} />
            Analisar momentos virais
          </button>
          <button
            onClick={onLoadExample}
            className="inline-flex items-center gap-2 px-4 py-3 border border-stone-400 text-stone-700 hover:bg-stone-900 hover:text-stone-50 hover:border-stone-900 rounded-sm text-sm transition-colors"
            style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}
          >
            Ver exemplo pronto →
          </button>
        </div>

        <div
          className="text-[10px] text-stone-400 pt-2"
          style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}
        >
          <strong className="text-stone-600">Nota:</strong> {'"Ver exemplo pronto"'} usa uma
          resposta pré-processada para demonstrar a UI sem chamar a API. {'"Analisar"'} aciona o
          backend (placeholder até TASK_010; depois disso fala com a API ou com o Claude Code CLI
          conforme o modo escolhido).
        </div>
      </div>
    </div>
  );
}
