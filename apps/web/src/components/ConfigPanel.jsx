import { ChevronDown, ChevronUp, Film, Image as ImageIcon, Move, Type } from 'lucide-react';
import SubtitleControls from './SubtitleControls.jsx';
import VideoControls from './VideoControls.jsx';
import OverlayControls from './OverlayControls.jsx';
import VideoUploadButton from './VideoUploadButton.jsx';

const TABS = [
  { id: 'subtitle', label: 'Legenda', icon: Type },
  { id: 'video', label: 'Vídeo', icon: Move },
  { id: 'overlay', label: 'Overlay', icon: ImageIcon },
  { id: 'video-source', label: 'Vídeo Fonte', icon: Film },
];

function VideoSourceBadge({ videoSource }) {
  if (!videoSource) return null;
  return (
    <span
      data-testid="video-source-badge"
      className="inline-flex items-center gap-1 max-w-[160px] text-[10px] text-stone-600 px-2 py-0.5 bg-stone-100 border border-stone-300 rounded-sm"
      style={{ fontFamily: "'IBM Plex Mono', monospace" }}
      title={videoSource.filename}
    >
      <Film size={10} className="shrink-0 text-stone-400" />
      <span className="truncate">{videoSource.filename}</span>
    </span>
  );
}

function TabButton({ tab, active, isCollapsed, onClick }) {
  const Icon = tab.icon;
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3 py-2 text-[11px] tracking-[0.15em] uppercase font-medium border-b-2 transition-colors ${
        active && !isCollapsed
          ? 'border-stone-900 text-stone-900'
          : 'border-transparent text-stone-400 hover:text-stone-700'
      }`}
      style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}
    >
      <Icon size={11} />
      {tab.label}
    </button>
  );
}

export default function ConfigPanel({
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
  isCollapsed,
  setIsCollapsed,
}) {
  return (
    <div className="bg-stone-50/95 border-b border-stone-200 sticky top-0 z-50 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center gap-1 pt-4">
          {TABS.map((tab) => (
            <TabButton
              key={tab.id}
              tab={tab}
              active={activeTab === tab.id}
              isCollapsed={isCollapsed}
              onClick={() => {
                setActiveTab(tab.id);
                if (isCollapsed) setIsCollapsed(false);
              }}
            />
          ))}
          <div className="ml-auto flex items-center gap-3 pb-2">
            <VideoSourceBadge videoSource={videoSource} />
            <div
              className="text-[10px] uppercase tracking-[0.2em] text-stone-400 hidden lg:block"
              style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}
            >
              Configuração global · aplica aos 5
            </div>
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="inline-flex items-center gap-1 px-2 py-1 text-[10px] tracking-[0.15em] uppercase font-medium text-stone-600 hover:text-stone-900 border border-stone-300 hover:border-stone-900 rounded-sm transition-colors"
              style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}
              title={isCollapsed ? 'Expandir painel' : 'Recolher painel'}
            >
              {isCollapsed ? <ChevronDown size={11} /> : <ChevronUp size={11} />}
              {isCollapsed ? 'Expandir' : 'Recolher'}
            </button>
          </div>
        </div>
        {!isCollapsed && (
          <div className="py-4">
            {activeTab === 'subtitle' && (
              <SubtitleControls config={subtitleConfig} setConfig={setSubtitleConfig} />
            )}
            {activeTab === 'video' && (
              <VideoControls config={videoConfig} setConfig={setVideoConfig} />
            )}
            {activeTab === 'overlay' && (
              <OverlayControls config={overlayConfig} setConfig={setOverlayConfig} />
            )}
            {activeTab === 'video-source' && (
              <VideoUploadButton videoSource={videoSource} onChange={setVideoSource} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
