import { Loader2 } from 'lucide-react';

export default function AnalyzingView({ message }) {
  return (
    <div className="max-w-3xl mx-auto px-6 py-32 text-center">
      <Loader2 size={32} className="animate-spin text-stone-900 mx-auto mb-6" />
      <h2 className="text-3xl mb-2" style={{ fontFamily: "'Instrument Serif', serif" }}>
        Analisando…
      </h2>
      <p
        className="text-stone-600 text-sm transition-opacity duration-500"
        style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}
      >
        {message}
      </p>
      <p
        className="text-[10px] tracking-[0.2em] uppercase text-stone-400 mt-12"
        style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}
      >
        Costuma levar 30–60 segundos
      </p>
    </div>
  );
}
