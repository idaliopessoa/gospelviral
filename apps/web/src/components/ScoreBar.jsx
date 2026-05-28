export default function ScoreBar({ label, score, accent }) {
  const pct = (score / 10) * 100;
  return (
    <div className="flex items-center gap-3">
      <div
        className="text-xs text-stone-500 w-32 shrink-0"
        style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}
      >
        {label}
      </div>
      <div className="flex-1 h-1.5 bg-stone-200 rounded-full overflow-hidden">
        <div
          className="h-full transition-all duration-700"
          style={{ width: `${pct}%`, backgroundColor: accent }}
        />
      </div>
      <div
        className="text-xs font-medium w-8 text-right tabular-nums"
        style={{ fontFamily: "'IBM Plex Mono', monospace" }}
      >
        {score.toFixed(1)}
      </div>
    </div>
  );
}
