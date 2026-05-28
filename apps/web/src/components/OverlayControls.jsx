import { useRef } from 'react';
import { Image as ImageIcon, Upload } from 'lucide-react';

export default function OverlayControls({ config, setConfig }) {
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
      setConfig({ dataURL: ev.target.result, opacity: 1, filename: file.name });
    };
    reader.readAsDataURL(file);
  }

  function clear() {
    setConfig({ dataURL: null, opacity: 1, filename: null });
    if (inputRef.current) inputRef.current.value = '';
  }

  return (
    <div
      className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center text-xs"
      style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}
    >
      <div className="md:col-span-5">
        {config.dataURL ? (
          <div className="flex items-center gap-3 px-3 py-2 bg-white border border-stone-300 rounded-sm">
            <div
              className="w-10 h-[71px] bg-checker rounded-sm overflow-hidden shrink-0 border border-stone-200"
              style={{
                backgroundImage:
                  'linear-gradient(45deg, #e7e5e4 25%, transparent 25%), linear-gradient(-45deg, #e7e5e4 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e7e5e4 75%), linear-gradient(-45deg, transparent 75%, #e7e5e4 75%)',
                backgroundSize: '8px 8px',
                backgroundPosition: '0 0, 0 4px, 4px -4px, -4px 0px',
              }}
            >
              <img src={config.dataURL} alt="" className="w-full h-full object-cover" />
            </div>
            <div className="flex-1 min-w-0">
              <p
                className="text-xs text-stone-700 truncate"
                style={{ fontFamily: "'IBM Plex Mono', monospace" }}
              >
                {config.filename}
              </p>
              <p className="text-[10px] text-stone-400 tracking-wider uppercase">overlay ativo</p>
            </div>
            <button
              onClick={clear}
              className="text-[11px] uppercase tracking-wide underline underline-offset-2 text-stone-500 hover:text-stone-900"
            >
              Remover
            </button>
          </div>
        ) : (
          <label className="cursor-pointer flex items-center gap-2 px-4 py-3 border-2 border-dashed border-stone-300 hover:border-stone-900 hover:bg-stone-50 rounded-sm transition-colors">
            <Upload size={14} className="text-stone-500" />
            <span className="text-xs text-stone-700">Enviar PNG com área vazada</span>
            <input
              ref={inputRef}
              type="file"
              accept="image/png,image/*"
              onChange={handleUpload}
              className="hidden"
            />
          </label>
        )}
      </div>
      <div className="md:col-span-4 flex flex-col gap-1">
        <label className="text-[10px] uppercase tracking-wider text-stone-400 flex items-center justify-between">
          <span>Opacidade</span>
          <span
            className="tabular-nums"
            style={{ fontFamily: "'IBM Plex Mono', monospace" }}
          >
            {Math.round(config.opacity * 100)}%
          </span>
        </label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={config.opacity}
          onChange={(e) => setConfig({ ...config, opacity: Number.parseFloat(e.target.value) })}
          disabled={!config.dataURL}
          className="h-1.5 disabled:opacity-30"
          aria-label="Opacidade do overlay"
        />
      </div>
      <div className="md:col-span-3 text-[10px] text-stone-500 flex items-start gap-1.5">
        <ImageIcon size={10} className="mt-0.5 shrink-0" />
        <span>Áreas transparentes do PNG deixam o vídeo aparecer por baixo</span>
      </div>
    </div>
  );
}
