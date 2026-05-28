import { useState } from 'react';
import { Check, Copy } from 'lucide-react';

export default function CopyButton({ text, label }) {
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
