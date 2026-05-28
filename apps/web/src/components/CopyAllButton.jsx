import { useState } from 'react';
import { Check, Copy } from 'lucide-react';

export default function CopyAllButton({ moment }) {
  const [copied, setCopied] = useState(false);

  const fullText = [moment.hook_title, moment.caption?.text, moment.hashtags?.all]
    .filter(Boolean)
    .join('\n\n');

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
