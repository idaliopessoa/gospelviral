import { useMemo } from 'react';
import { Play, Pause } from 'lucide-react';
import {
  SUBTITLE_ANCHOR_PERCENT,
  parseColdOpenRange,
  buildPlaybackSegments,
} from '@gospelviral/shared';
import { timestampToSeconds, selectVisibleChunk } from '../lib/helpers.js';
import { cueAt } from '../lib/cueAt.js';
import { highlightText } from '../lib/text-highlight.js';
import { useCanvasMeasurement } from '../hooks/useCanvasMeasurement.js';
import { useVideoPlayback } from '../hooks/useVideoPlayback.js';
import { usePointerDrag } from '../hooks/usePointerDrag.js';

const SIZE_MAP = { S: '14px', M: '17px', L: '21px' };
const HIGHLIGHT_COLOR = '#F4C04A';

function resolveBackgroundColor(background, bgColor) {
  if (background === 'translucent') return 'rgba(0,0,0,0.55)';
  if (background === 'solid') return bgColor;
  return 'transparent';
}

function buildTextStyle(config) {
  const hasFill = config.background === 'translucent' || config.background === 'solid';
  return {
    fontFamily: `'${config.font}', sans-serif`,
    color: config.textColor,
    fontSize: SIZE_MAP[config.size],
    fontWeight: 700,
    lineHeight: 1.25,
    textAlign: 'center',
    letterSpacing: '0.01em',
    textShadow:
      config.background === 'shadow'
        ? '0 2px 8px rgba(0,0,0,0.85), 0 0 2px rgba(0,0,0,0.7)'
        : 'none',
    padding: hasFill ? '8px 14px' : '0',
    backgroundColor: resolveBackgroundColor(config.background, config.bgColor),
    borderRadius: hasFill ? '4px' : '0',
    display: 'inline-block',
    // `lines` is a HARD visual cap (D3, decision #7): the chunk holds
    // charsPerScreen×lines chars and the width is bounded to ~charsPerScreen
    // `ch`, so the text wraps to roughly `lines` rows. `min(92%, …)` keeps it
    // inside the 9:16 canvas on narrow screens.
    maxWidth: `min(92%, ${config.charsPerScreen}ch)`,
  };
}

function VideoLayer({
  hasVideo,
  streamUrl,
  videoRef,
  videoId,
  videoConfig,
  vxPreview,
  vyPreview,
  editable,
  dragHandlers,
}) {
  return (
    <div
      className={`video-16-9 absolute ${editable ? 'cursor-move' : ''}`}
      style={{
        top: '50%',
        left: '50%',
        transform: `translate(calc(-50% + ${vxPreview}px), calc(-50% + ${vyPreview}px)) scale(${videoConfig.scale})`,
        transformOrigin: 'center center',
        touchAction: 'none',
      }}
      {...dragHandlers}
      data-testid="video-layer"
    >
      {hasVideo ? (
        <video
          ref={videoRef}
          src={streamUrl}
          preload="metadata"
          playsInline
          className="w-full h-full object-cover pointer-events-none"
          data-testid="video-el"
        />
      ) : (
        <img
          src={`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`}
          alt=""
          draggable={false}
          className="w-full h-full object-cover pointer-events-none"
          onError={(e) => {
            e.currentTarget.src = `https://img.youtube.com/vi/${videoId}/0.jpg`;
          }}
        />
      )}
    </div>
  );
}

function OverlayLayer({ overlayConfig }) {
  if (overlayConfig?.dataURL) {
    return (
      <img
        src={overlayConfig.dataURL}
        alt=""
        draggable={false}
        className="absolute inset-0 w-full h-full pointer-events-none z-10"
        style={{ opacity: overlayConfig.opacity, objectFit: 'cover' }}
      />
    );
  }
  return (
    <div className="absolute inset-0 bg-gradient-to-b from-black/15 via-transparent to-black/30 pointer-events-none z-10" />
  );
}

function SubtitleLayer({
  parts,
  textStyle,
  textColor,
  anchorPercent,
  sxPreview,
  syPreview,
  dragHandlers,
  draggable,
}) {
  return (
    <div
      className="absolute flex items-center justify-center"
      style={{
        top: `calc(${anchorPercent}% + ${syPreview}px)`,
        left: `calc(50% + ${sxPreview}px)`,
        transform: 'translate(-50%, -50%)',
        maxWidth: '92%',
        padding: '4px',
        cursor: draggable ? 'move' : 'default',
        touchAction: 'none',
        zIndex: 20,
      }}
      {...dragHandlers}
      data-testid="subtitle-layer"
    >
      <span style={textStyle}>
        {parts.map((part, i) => (
          <span
            key={`${part.type ?? 'plain'}-${i}-${part.text}`}
            style={{
              color:
                part.type === 'scripture' || part.type === 'keyword'
                  ? HIGHLIGHT_COLOR
                  : textColor,
            }}
          >
            {part.text}
          </span>
        ))}
      </span>
    </div>
  );
}

function PlayButton({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-testid="play-button"
      aria-label="Reproduzir trecho"
      className="absolute inset-0 z-30 flex items-center justify-center bg-black/25 hover:bg-black/10 transition-colors group"
    >
      <span className="w-14 h-14 rounded-full bg-white/90 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
        <Play size={24} className="text-stone-900 translate-x-0.5" fill="currentColor" />
      </span>
    </button>
  );
}

// While the cut is rolling: a transparent full-bleed pause control (z-30, above
// the overlay). The <video> stays pointer-events-none; a real <button> avoids
// the iOS "tap video → native controls" trap. The pause glyph appears on hover
// so it never obscures the playing frame (D2 — paused-but-active model).
function PauseButton({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-testid="pause-button"
      aria-label="Pausar trecho"
      className="absolute inset-0 z-30 flex items-center justify-center bg-transparent hover:bg-black/10 transition-colors group"
    >
      <span className="w-14 h-14 rounded-full bg-white/0 group-hover:bg-white/90 flex items-center justify-center transition-colors">
        <Pause
          size={24}
          className="text-stone-900 opacity-0 group-hover:opacity-100 transition-opacity"
          fill="currentColor"
        />
      </span>
    </button>
  );
}

export default function SubtitlePreview({
  videoId,
  moment,
  subtitleConfig,
  videoConfig,
  overlayConfig,
  onVideoConfigChange,
  onSubtitleConfigChange,
  videoSource = null,
  cues = [],
  mode = 'edit',
  isActivePlayer = false,
  onRequestPlay,
  onPlaybackEnd,
}) {
  const config = subtitleConfig;
  const startSec = timestampToSeconds(moment.timestamp_start);
  const endSec = timestampToSeconds(moment.timestamp_end);
  const { canvasRef, scaleFactor } = useCanvasMeasurement();

  // Playback segments (D6): an apply_cold_open moment plays [peak, fullCut] so
  // the peak teaser replays in context; otherwise the single full cut (= pre-D6
  // behavior). Memoized on the stable string inputs so the hook's listeners are
  // not re-attached every render. The cold-open peak is a RANGE string — parse
  // it via parseColdOpenRange (split-first, never timestampToSeconds(whole)).
  const peakTimestamp = moment.cold_open_analysis?.peak_moment?.timestamp;
  const segments = useMemo(
    () => buildPlaybackSegments(moment, parseColdOpenRange(peakTimestamp)),
    [moment, peakTimestamp],
  );

  // Playback hook is always called (rules of hooks); it no-ops without a <video>.
  // (The hook also returns `toggle`; the two-affordance UI below drives play/
  // pause directly so the play button stays a pure "not playing" signal.)
  const { videoRef, currentTime, play, pause, isPlaying } = useVideoPlayback({
    segments,
    isActivePlayer,
    onReachEnd: onPlaybackEnd,
  });

  // D1: an uploaded video is the canvas source in BOTH modes — a paused poster
  // frame (seeked to startSec) while editing, live playback in player mode. The
  // YouTube thumbnail is only the no-videoSource fallback. Drag stays gated to
  // edit (on the wrapper div; the <video> is pointer-events-none).
  const hasVideo = Boolean(videoSource);
  const editable = mode === 'edit';

  // Subtitle text is DERIVED from currentTime — the active cue, or cue[0] when
  // paused / in edit (cueAt clamps), or the moment key_quote when no cues exist.
  // The cue text is then chunked by the panel's charsPerScreen/lines (D3 — the
  // panel is the SSOT for on-screen text shape; preview == export), and the
  // visible chunk advances with currentTime inside the cue window. Edit mode
  // pins chunk[0] (clock = window start). Highlight runs on the VISIBLE chunk.
  const cue = cueAt(cues, currentTime);
  const sourceText = cue?.text ?? moment.key_quote ?? moment.hook_title ?? '';
  const cueWindow = cue ? { start: cue.start, end: cue.end } : { start: startSec, end: endSec };
  const clock = editable ? cueWindow.start : currentTime;
  const subtitleText = selectVisibleChunk(sourceText, clock, cueWindow, config);
  const highlighted = highlightText(subtitleText, config);
  const anchorPercent = SUBTITLE_ANCHOR_PERCENT[config.position] ?? SUBTITLE_ANCHOR_PERCENT.bottom;
  const textStyle = buildTextStyle(config);

  // Drag is gated to EDIÇÃO mode: in PLAYER mode onCommit is undefined, so
  // usePointerDrag's pointerdown short-circuits and the layers are static.
  const { handlers: videoDragHandlers } = usePointerDrag({
    getInitialPosition: () => ({ x: videoConfig.x, y: videoConfig.y }),
    scaleFactor,
    onCommit: editable ? (next) => onVideoConfigChange?.({ ...videoConfig, ...next }) : undefined,
  });

  const { handlers: subtitleDragHandlers } = usePointerDrag({
    getInitialPosition: () => ({ x: config.x || 0, y: config.y || 0 }),
    scaleFactor,
    onCommit: editable ? (next) => onSubtitleConfigChange?.({ ...config, ...next }) : undefined,
    stopPropagation: true,
  });

  const vxPreview = videoConfig.x * scaleFactor;
  const vyPreview = videoConfig.y * scaleFactor;
  const sxPreview = (config.x || 0) * scaleFactor;
  const syPreview = (config.y || 0) * scaleFactor;

  const streamUrl = videoSource ? `/api/upload/video/${videoSource.id}/stream` : null;
  // Affordances are PLAYER-mode only: edit shows the poster frame for
  // positioning (drag-only, never playable). While NOT playing (fresh,
  // paused-but-active, or paused-at-end) the play/resume button shows; while
  // playing, a transparent pause control covers the surface (D2).
  const showPlayButton = hasVideo && mode === 'player' && !isPlaying;
  const showPauseButton = hasVideo && mode === 'player' && isPlaying;

  function handlePlayClick() {
    play(); // synchronous within the click gesture — autoplay-safe
    onRequestPlay?.(); // claim the global player slot (idempotent on resume)
  }

  return (
    <div
      ref={canvasRef}
      className="canvas-9-16 relative overflow-hidden rounded-md bg-stone-900 shadow-lg select-none isolate"
    >
      <VideoLayer
        hasVideo={hasVideo}
        streamUrl={streamUrl}
        videoRef={videoRef}
        videoId={videoId}
        videoConfig={videoConfig}
        vxPreview={vxPreview}
        vyPreview={vyPreview}
        editable={editable}
        dragHandlers={videoDragHandlers}
      />
      <OverlayLayer overlayConfig={overlayConfig} />
      <SubtitleLayer
        parts={highlighted}
        textStyle={textStyle}
        textColor={config.textColor}
        anchorPercent={anchorPercent}
        sxPreview={sxPreview}
        syPreview={syPreview}
        dragHandlers={subtitleDragHandlers}
        draggable={editable && Boolean(onSubtitleConfigChange)}
      />
      {showPlayButton && <PlayButton onClick={handlePlayClick} />}
      {showPauseButton && <PauseButton onClick={pause} />}
    </div>
  );
}
