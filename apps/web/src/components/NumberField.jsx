export default function NumberField({ label, value, onChange, step = 10, suffix = 'px' }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[10px] uppercase tracking-wider text-stone-400">{label}</label>
      <div className="flex items-center bg-white border border-stone-300 rounded-sm overflow-hidden">
        <input
          type="number"
          value={value}
          step={step}
          onChange={(e) => onChange(Number.parseInt(e.target.value, 10) || 0)}
          className="flex-1 px-2 py-1.5 text-xs tabular-nums focus:outline-none"
          style={{ fontFamily: "'IBM Plex Mono', monospace" }}
        />
        <span className="text-[10px] text-stone-400 pr-2 tracking-wider">{suffix}</span>
      </div>
    </div>
  );
}
