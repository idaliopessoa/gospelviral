import { useMemo, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { EXAMPLE_RESPONSE, EXAMPLE_TRANSCRIPT, EXAMPLE_URL } from '@gospelviral/shared';
import { extractVideoId } from './lib/helpers.js';
import {
  DEFAULT_OVERLAY_CONFIG,
  DEFAULT_SUBTITLE_CONFIG,
  DEFAULT_VIDEO_CONFIG,
  LOADING_MESSAGES,
  LOADING_ROTATION_MS,
} from './config/defaults.js';
import { useAnalyze } from './hooks/useAnalyze.js';
import { useLoadingRotation } from './hooks/useLoadingRotation.js';
import { useRuntime } from './hooks/useRuntime.js';
import InputView from './views/InputView.jsx';
import AnalyzingView from './views/AnalyzingView.jsx';
import ResultsView from './views/ResultsView.jsx';
import ModeBadge from './components/ModeBadge.jsx';

function Header({ showBack, onBack, badge }) {
  return (
    <header className="border-b border-stone-300 bg-stone-50">
      <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between gap-3">
        <div className="flex items-baseline gap-3 min-w-0">
          <div
            className="text-2xl tracking-tight truncate"
            style={{ fontFamily: "'Instrument Serif', serif" }}
          >
            Momentos Virais<span className="italic text-stone-400"> · cristão</span>
          </div>
          <div
            className="text-[10px] tracking-[0.2em] uppercase text-stone-400 hidden md:block"
            style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}
          >
            Análise de pregações para Reels & Shorts
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {badge}
          {showBack && (
            <button
              onClick={onBack}
              className="inline-flex items-center gap-2 text-xs px-3 py-1.5 border border-stone-300 hover:border-stone-900 hover:bg-stone-900 hover:text-stone-50 transition-colors rounded-sm"
              style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}
            >
              <ArrowLeft size={12} /> Nova análise
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer
      className="border-t border-stone-300 mt-16 py-8 text-center text-[10px] tracking-[0.2em] uppercase text-stone-400"
      style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}
    >
      Protótipo · Built with Claude
    </footer>
  );
}

export default function App() {
  const [url, setUrl] = useState('');
  const [transcript, setTranscript] = useState('');
  const [exampleVideoId, setExampleVideoId] = useState(null);
  const [subtitleConfig, setSubtitleConfig] = useState(DEFAULT_SUBTITLE_CONFIG);
  const [videoConfig, setVideoConfig] = useState(DEFAULT_VIDEO_CONFIG);
  const [overlayConfig, setOverlayConfig] = useState(DEFAULT_OVERLAY_CONFIG);
  const [activeTab, setActiveTab] = useState('subtitle');
  const [isConfigCollapsed, setIsConfigCollapsed] = useState(false);

  const runtime = useRuntime();
  const { view, results, error, analyze, showExample, reset } = useAnalyze();
  const videoId = useMemo(
    () => exampleVideoId || extractVideoId(url),
    [url, exampleVideoId],
  );
  const loadingStep = useLoadingRotation(
    LOADING_MESSAGES,
    view === 'analyzing',
    LOADING_ROTATION_MS,
  );

  function loadExample() {
    setUrl(EXAMPLE_URL);
    setTranscript(EXAMPLE_TRANSCRIPT);
    setExampleVideoId(extractVideoId(EXAMPLE_URL));
    showExample(EXAMPLE_RESPONSE);
  }

  function handleReset() {
    setExampleVideoId(null);
    reset();
  }

  function handleAnalyze() {
    analyze({ url, transcript, mode: runtime.forcedMode });
  }

  const badge = (
    <ModeBadge
      currentMode={runtime.currentMode}
      forcedMode={runtime.forcedMode}
      setForcedMode={runtime.setForcedMode}
      refresh={runtime.refresh}
      loading={runtime.loading}
    />
  );

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F5F1EA' }}>
      <Header showBack={view === 'results'} onBack={handleReset} badge={badge} />

      {view === 'input' && (
        <InputView
          url={url}
          setUrl={setUrl}
          transcript={transcript}
          setTranscript={setTranscript}
          videoId={videoId}
          onAnalyze={handleAnalyze}
          onLoadExample={loadExample}
          error={error}
        />
      )}

      {view === 'analyzing' && <AnalyzingView message={LOADING_MESSAGES[loadingStep]} />}

      {view === 'results' && results && (
        <ResultsView
          results={results}
          videoId={videoId}
          subtitleConfig={subtitleConfig}
          setSubtitleConfig={setSubtitleConfig}
          videoConfig={videoConfig}
          setVideoConfig={setVideoConfig}
          overlayConfig={overlayConfig}
          setOverlayConfig={setOverlayConfig}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          isCollapsed={isConfigCollapsed}
          setIsCollapsed={setIsConfigCollapsed}
        />
      )}

      <Footer />
    </div>
  );
}
