import { useMemo } from 'react';
import { SUBTITLE_ANCHOR_PERCENT } from '@gospelviral/shared';
import { chunkText } from '../lib/helpers.js';
import { highlightText } from '../lib/text-highlight.js';
import { useCanvasMeasurement } from '../hooks/useCanvasMeasurement.js';
import { useChunkRotation } from '../hooks/useChunkRotation.js';
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
    maxWidth: '92%',
  };
}

function VideoLayer({ videoId, videoConfig, vxPreview, vyPreview, dragHandlers }) {
  return (
    <div
      className="video-16-9 absolute cursor-move"
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
      <img
        src={`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`}
        alt=""
        draggable={false}
        className="w-full h-full object-cover pointer-events-none"
        onError={(e) => {
          e.currentTarget.src = `https://img.youtube.com/vi/${videoId}/0.jpg`;
        }}
      />
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

export default function SubtitlePreview({
  videoId,
  moment,
  subtitleConfig,
  videoConfig,
  overlayConfig,
  onVideoConfigChange,
  onSubtitleConfigChange,
}) {
  const config = subtitleConfig;
  const text = moment.key_quote || moment.hook_title || '';
  const chunks = useMemo(
    () => chunkText(text, config.charsPerScreen, config.lines),
    [text, config.charsPerScreen, config.lines],
  );
  const { canvasRef, scaleFactor } = useCanvasMeasurement();
  const chunkIndex = useChunkRotation(chunks);

  const currentChunk = chunks[chunkIndex] || '';
  const highlighted = highlightText(currentChunk, config);
  const anchorPercent = SUBTITLE_ANCHOR_PERCENT[config.position] ?? SUBTITLE_ANCHOR_PERCENT.bottom;
  const textStyle = buildTextStyle(config);

  const { handlers: videoDragHandlers } = usePointerDrag({
    getInitialPosition: () => ({ x: videoConfig.x, y: videoConfig.y }),
    scaleFactor,
    onCommit: (next) => onVideoConfigChange?.({ ...videoConfig, ...next }),
  });

  const { handlers: subtitleDragHandlers } = usePointerDrag({
    getInitialPosition: () => ({ x: config.x || 0, y: config.y || 0 }),
    scaleFactor,
    onCommit: (next) => onSubtitleConfigChange?.({ ...config, ...next }),
    stopPropagation: true,
  });

  const vxPreview = videoConfig.x * scaleFactor;
  const vyPreview = videoConfig.y * scaleFactor;
  const sxPreview = (config.x || 0) * scaleFactor;
  const syPreview = (config.y || 0) * scaleFactor;

  return (
    <div
      ref={canvasRef}
      className="canvas-9-16 relative overflow-hidden rounded-md bg-stone-900 shadow-lg select-none isolate"
    >
      <VideoLayer
        videoId={videoId}
        videoConfig={videoConfig}
        vxPreview={vxPreview}
        vyPreview={vyPreview}
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
        draggable={Boolean(onSubtitleConfigChange)}
      />
      <div
        className="absolute top-3 left-3 px-2 py-0.5 bg-black/60 backdrop-blur rounded text-[10px] text-white tracking-wider uppercase pointer-events-none z-20"
        style={{ fontFamily: "'IBM Plex Mono', monospace" }}
      >
        {chunkIndex + 1}/{chunks.length}
      </div>
    </div>
  );
}
