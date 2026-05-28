import { Move, RotateCcw } from 'lucide-react';
import NumberField from './NumberField.jsx';

export default function VideoControls({ config, setConfig }) {
  const update = (key, value) => setConfig({ ...config, [key]: value });
  const reset = () => setConfig({ x: 0, y: 0, scale: 1 });
  return (
    <div
      className="grid grid-cols-2 md:grid-cols-5 gap-3 text-xs items-end"
      style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}
    >
      <NumberField
        label="Position X"
        value={config.x}
        onChange={(v) => update('x', v)}
        step={10}
        suffix="px"
      />
      <NumberField
        label="Position Y"
        value={config.y}
        onChange={(v) => update('y', v)}
        step={10}
        suffix="px"
      />
      <div className="flex flex-col gap-1 md:col-span-2">
        <label className="text-[10px] uppercase tracking-wider text-stone-400 flex items-center justify-between">
          <span>Escala</span>
          <span
            className="tabular-nums"
            style={{ fontFamily: "'IBM Plex Mono', monospace" }}
          >
            {config.scale.toFixed(2)}×
          </span>
        </label>
        <input
          type="range"
          min="0.1"
          max="5"
          step="0.05"
          value={config.scale}
          onChange={(e) => update('scale', Number.parseFloat(e.target.value))}
          className="h-1.5"
          aria-label="Escala do vídeo"
        />
      </div>
      <button
        onClick={reset}
        className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 border border-stone-300 hover:border-stone-900 hover:bg-stone-900 hover:text-stone-50 rounded-sm text-[11px] tracking-wide uppercase font-medium transition-colors"
      >
        <RotateCcw size={11} /> Resetar
      </button>
      <div className="col-span-2 md:col-span-5 text-[10px] text-stone-500 flex items-center gap-1.5 pt-1">
        <Move size={10} />
        Arraste o vídeo direto no preview para reposicionar · Canvas de referência: 1080×1920 px
        (Reels/Shorts)
      </div>
    </div>
  );
}
