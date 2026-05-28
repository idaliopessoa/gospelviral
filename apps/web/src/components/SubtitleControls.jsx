import { Move, RotateCcw } from 'lucide-react';
import NumberField from './NumberField.jsx';

const FONTS = [
  'IBM Plex Sans',
  'Inter Tight',
  'Manrope',
  'Bebas Neue',
  'Anton',
  'Archivo Black',
];

const BACKGROUND_OPTIONS = [
  { value: 'none', label: 'Nenhum' },
  { value: 'shadow', label: 'Sombra' },
  { value: 'translucent', label: 'Translúcido' },
  { value: 'solid', label: 'Sólido' },
];

const ANCHOR_OPTIONS = [
  { value: 'top', label: 'Topo' },
  { value: 'center', label: 'Centro' },
  { value: 'bottom', label: 'Inferior' },
];

export default function SubtitleControls({ config, setConfig }) {
  const update = (key, value) => setConfig({ ...config, [key]: value });
  const resetPosition = () => setConfig({ ...config, x: 0, y: 0 });

  return (
    <div className="space-y-3" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 text-xs">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] uppercase tracking-wider text-stone-400">Fonte</label>
          <select
            value={config.font}
            onChange={(e) => update('font', e.target.value)}
            className="bg-white border border-stone-300 rounded-sm px-2 py-1.5 text-xs"
          >
            {FONTS.map((font) => (
              <option key={font} value={font === 'IBM Plex Sans' ? 'IBM Plex Sans' : font}>
                {font === 'IBM Plex Sans' ? 'Plex Sans' : font}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] uppercase tracking-wider text-stone-400">Cor</label>
          <div className="flex items-center gap-1.5 bg-white border border-stone-300 rounded-sm px-2 py-1">
            <input
              type="color"
              value={config.textColor}
              onChange={(e) => update('textColor', e.target.value)}
              className="w-5 h-5 cursor-pointer border-0 p-0"
              aria-label="Cor do texto"
            />
            <span
              className="text-[10px] text-stone-500 tabular-nums"
              style={{ fontFamily: "'IBM Plex Mono', monospace" }}
            >
              {config.textColor.toUpperCase()}
            </span>
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] uppercase tracking-wider text-stone-400">Fundo</label>
          <select
            value={config.background}
            onChange={(e) => update('background', e.target.value)}
            className="bg-white border border-stone-300 rounded-sm px-2 py-1.5 text-xs"
          >
            {BACKGROUND_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] uppercase tracking-wider text-stone-400">Âncora</label>
          <select
            value={config.position}
            onChange={(e) => update('position', e.target.value)}
            className="bg-white border border-stone-300 rounded-sm px-2 py-1.5 text-xs"
          >
            {ANCHOR_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] uppercase tracking-wider text-stone-400">Tamanho</label>
          <div className="flex bg-white border border-stone-300 rounded-sm overflow-hidden">
            {['S', 'M', 'L'].map((s) => (
              <button
                key={s}
                onClick={() => update('size', s)}
                className={`flex-1 py-1.5 text-xs font-medium ${
                  config.size === s
                    ? 'bg-stone-900 text-stone-50'
                    : 'text-stone-600 hover:bg-stone-100'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] uppercase tracking-wider text-stone-400">
            Chars/tela: {config.charsPerScreen}
          </label>
          <input
            type="range"
            min="15"
            max="60"
            value={config.charsPerScreen}
            onChange={(e) => update('charsPerScreen', Number.parseInt(e.target.value, 10))}
            className="h-1.5"
            aria-label="Caracteres por tela"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] uppercase tracking-wider text-stone-400">Linhas</label>
          <div className="flex bg-white border border-stone-300 rounded-sm overflow-hidden">
            {[1, 2, 3].map((n) => (
              <button
                key={n}
                onClick={() => update('lines', n)}
                className={`flex-1 py-1.5 text-xs font-medium ${
                  config.lines === n
                    ? 'bg-stone-900 text-stone-50'
                    : 'text-stone-600 hover:bg-stone-100'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] uppercase tracking-wider text-stone-400">Destaque</label>
          <div className="flex flex-col gap-0.5">
            <label className="inline-flex items-center gap-1.5 cursor-pointer text-[11px]">
              <input
                type="checkbox"
                checked={config.highlightScripture}
                onChange={(e) => update('highlightScripture', e.target.checked)}
                className="w-3 h-3 accent-amber-500"
              />
              <span>Versículos</span>
            </label>
            <label className="inline-flex items-center gap-1.5 cursor-pointer text-[11px]">
              <input
                type="checkbox"
                checked={config.highlightKeywords}
                onChange={(e) => update('highlightKeywords', e.target.checked)}
                className="w-3 h-3 accent-amber-500"
              />
              <span>Jesus/Deus</span>
            </label>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-xs items-end border-t border-stone-200 pt-3">
        <NumberField
          label="Offset X"
          value={config.x || 0}
          onChange={(v) => update('x', v)}
          step={10}
          suffix="px"
        />
        <NumberField
          label="Offset Y"
          value={config.y || 0}
          onChange={(v) => update('y', v)}
          step={10}
          suffix="px"
        />
        <button
          onClick={resetPosition}
          className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 border border-stone-300 hover:border-stone-900 hover:bg-stone-900 hover:text-stone-50 rounded-sm text-[11px] tracking-wide uppercase font-medium transition-colors"
        >
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
