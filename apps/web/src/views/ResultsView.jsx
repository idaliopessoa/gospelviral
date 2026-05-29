import ConfigPanel from '../components/ConfigPanel.jsx';
import MomentCard from '../components/MomentCard.jsx';

function ResultsHeader({ results }) {
  return (
    <div className="max-w-7xl mx-auto px-6 pt-8 pb-4">
      <p
        className="text-[10px] tracking-[0.3em] uppercase text-stone-500 mb-2"
        style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}
      >
        Resultado da análise
      </p>
      <h2
        className="text-3xl leading-tight mb-3"
        style={{ fontFamily: "'Instrument Serif', serif" }}
      >
        Top 5 momentos · <em className="text-stone-400">{results.metadata?.overall_topic}</em>
      </h2>
      <div
        className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-stone-600"
        style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}
      >
        <span>
          Duração:{' '}
          <span
            className="tabular-nums"
            style={{ fontFamily: "'IBM Plex Mono', monospace" }}
          >
            {results.metadata?.total_duration}
          </span>
        </span>
        <span>
          Tipo: <span className="text-stone-900">{results.metadata?.content_type}</span>
        </span>
        <span>
          Candidatos ≥ 6.5:{' '}
          <span
            className="tabular-nums"
            style={{ fontFamily: "'IBM Plex Mono', monospace" }}
          >
            {results.analysis_summary?.candidates_above_threshold}
          </span>
        </span>
        <span>
          Balance:{' '}
          <span
            className="tabular-nums"
            style={{ fontFamily: "'IBM Plex Mono', monospace" }}
          >
            {results.analysis_summary?.balance?.evangelization} /{' '}
            {results.analysis_summary?.balance?.edification}
          </span>
        </span>
      </div>
    </div>
  );
}

export default function ResultsView({
  results,
  videoId,
  transcript,
  subtitleConfig,
  setSubtitleConfig,
  videoConfig,
  setVideoConfig,
  overlayConfig,
  setOverlayConfig,
  videoSource,
  setVideoSource,
  activeTab,
  setActiveTab,
  activeCardTab,
  setActiveCardTab,
  isCollapsed,
  setIsCollapsed,
}) {
  return (
    <>
      <ConfigPanel
        subtitleConfig={subtitleConfig}
        setSubtitleConfig={setSubtitleConfig}
        videoConfig={videoConfig}
        setVideoConfig={setVideoConfig}
        overlayConfig={overlayConfig}
        setOverlayConfig={setOverlayConfig}
        videoSource={videoSource}
        setVideoSource={setVideoSource}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isCollapsed={isCollapsed}
        setIsCollapsed={setIsCollapsed}
      />
      <ResultsHeader results={results} />
      <main className="max-w-7xl mx-auto px-6 pb-16 space-y-6">
        {results.top_moments.map((moment, i) => (
          <MomentCard
            key={`${moment.rank ?? i}-${moment.hook_title}`}
            moment={moment}
            videoId={videoId}
            transcript={transcript}
            subtitleConfig={subtitleConfig}
            videoConfig={videoConfig}
            overlayConfig={overlayConfig}
            onVideoConfigChange={setVideoConfig}
            onSubtitleConfigChange={setSubtitleConfig}
            activeCardTab={activeCardTab}
            onActiveCardTabChange={setActiveCardTab}
            index={i}
          />
        ))}
      </main>
    </>
  );
}
