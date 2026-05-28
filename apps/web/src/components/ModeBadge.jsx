import { useState } from 'react';
import { ChevronDown, Cpu, KeyRound, CircleSlash, RefreshCcw } from 'lucide-react';

const LABELS = {
  cli: 'via Claude Code CLI',
  api: 'via API key',
  none: 'sem runtime',
};

const ICONS = { cli: Cpu, api: KeyRound, none: CircleSlash };

function ModeOption({ value, label, current, onPick }) {
  return (
    <label className="flex items-center gap-2 px-2 py-1 text-xs cursor-pointer hover:bg-stone-100 rounded-sm">
      <input
        type="radio"
        name="mode"
        value={value}
        checked={current === value}
        onChange={() => onPick(value)}
        className="accent-stone-900"
      />
      <span>{label}</span>
    </label>
  );
}

export default function ModeBadge({
  currentMode,
  forcedMode,
  setForcedMode,
  refresh,
  loading,
}) {
  const [open, setOpen] = useState(false);
  const Icon = ICONS[currentMode] ?? CircleSlash;
  const label = LABELS[currentMode] ?? LABELS.none;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Alternar runtime"
        className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] tracking-[0.15em] uppercase font-medium border border-stone-300 hover:border-stone-900 rounded-sm transition-colors"
        style={{ fontFamily: "'IBM Plex Mono', monospace" }}
      >
        <Icon size={11} />
        <span>{label}</span>
        <ChevronDown size={10} />
      </button>
      {open && (
        <div
          className="absolute right-0 mt-2 w-56 rounded-sm border border-stone-300 bg-paper shadow-lg p-2 z-50"
          style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}
        >
          <p className="text-[10px] tracking-[0.15em] uppercase text-stone-500 px-2 py-1">
            Runtime para esta sessão
          </p>
          <ModeOption value="auto" label="Automático" current={forcedMode} onPick={setForcedMode} />
          <ModeOption value="cli" label="Claude Code CLI" current={forcedMode} onPick={setForcedMode} />
          <ModeOption value="api" label="API key" current={forcedMode} onPick={setForcedMode} />
          <button
            onClick={refresh}
            className="mt-2 w-full inline-flex items-center justify-center gap-1.5 px-2 py-1 text-[10px] tracking-[0.15em] uppercase font-medium text-stone-600 hover:text-stone-900 border border-stone-300 hover:border-stone-900 rounded-sm"
            disabled={loading}
          >
            <RefreshCcw size={10} /> Re-detectar
          </button>
        </div>
      )}
    </div>
  );
}
