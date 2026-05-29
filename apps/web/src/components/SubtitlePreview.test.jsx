import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import SubtitlePreview from './SubtitlePreview.jsx';
import { EXAMPLE_RESPONSE } from '@gospelviral/shared';

const MOMENT = EXAMPLE_RESPONSE.top_moments[0];

const BASE_SUB = {
  font: 'IBM Plex Sans',
  textColor: '#ffffff',
  background: 'shadow',
  bgColor: '#000000',
  position: 'bottom',
  size: 'M',
  charsPerScreen: 28,
  lines: 2,
  highlightScripture: false,
  highlightKeywords: false,
  x: 0,
  y: 0,
};

const VIDEO_SOURCE = {
  id: 'vid-123',
  filename: 'pregacao.mp4',
  sizeBytes: 1024,
  mimeType: 'video/mp4',
  uploadedAt: '2026-05-29T00:00:00Z',
};

// Two tiled cues inside the moment's range (MOMENT[0] starts at 01:08 = 68s).
const CUES = [
  { text: 'primeira cue falada', start: 68, end: 85 },
  { text: 'segunda cue falada', start: 85, end: 102 },
];

function mockCanvasSize(width) {
  Element.prototype.getBoundingClientRect = vi.fn().mockReturnValue({
    width,
    height: width * (1920 / 1080),
    top: 0,
    left: 0,
    right: width,
    bottom: width * (1920 / 1080),
    x: 0,
    y: 0,
    toJSON: () => ({}),
  });
}

function renderPreview(props = {}) {
  return render(
    <SubtitlePreview
      videoId="abc123"
      moment={MOMENT}
      subtitleConfig={BASE_SUB}
      videoConfig={{ x: 0, y: 0, scale: 1 }}
      overlayConfig={{ dataURL: null, opacity: 1, filename: null }}
      {...props}
    />,
  );
}

beforeEach(() => {
  mockCanvasSize(280);
  Element.prototype.setPointerCapture = vi.fn();
  Element.prototype.releasePointerCapture = vi.fn();
  Element.prototype.hasPointerCapture = vi.fn().mockReturnValue(true);
  window.HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined);
  window.HTMLMediaElement.prototype.pause = vi.fn();
  Object.defineProperty(window.HTMLMediaElement.prototype, 'currentTime', {
    configurable: true,
    writable: true,
    value: 0,
  });
});

describe('SubtitlePreview — video layer', () => {
  it('renders a <video> with the stream URL when videoSource is present and mode is player', () => {
    // Arrange + Act
    renderPreview({ videoSource: VIDEO_SOURCE, cues: CUES, mode: 'player' });

    // Assert
    const video = screen.getByTestId('video-el');
    expect(video).toBeInTheDocument();
    expect(video.getAttribute('src')).toBe('/api/upload/video/vid-123/stream');
  });

  it('renders the static YouTube thumbnail when there is no videoSource (no regression)', () => {
    // Arrange + Act
    const { container } = renderPreview({ mode: 'player' });

    // Assert
    expect(screen.queryByTestId('video-el')).not.toBeInTheDocument();
    expect(container.querySelector('img[src*="img.youtube.com"]')).toBeInTheDocument();
  });

  it('renders the static thumbnail in edit mode even with a videoSource', () => {
    // Arrange + Act
    const { container } = renderPreview({ videoSource: VIDEO_SOURCE, cues: CUES, mode: 'edit' });

    // Assert
    expect(screen.queryByTestId('video-el')).not.toBeInTheDocument();
    expect(container.querySelector('img[src*="img.youtube.com"]')).toBeInTheDocument();
  });
});

describe('SubtitlePreview — play button', () => {
  it('shows a play button when there is a video and this card is not the active player; clicking plays + requests play', () => {
    // Arrange
    const onRequestPlay = vi.fn();
    renderPreview({
      videoSource: VIDEO_SOURCE,
      cues: CUES,
      mode: 'player',
      isActivePlayer: false,
      onRequestPlay,
    });
    const button = screen.getByTestId('play-button');

    // Act
    act(() => fireEvent.click(button));

    // Assert — play() called synchronously in the gesture + global request raised
    expect(window.HTMLMediaElement.prototype.play).toHaveBeenCalled();
    expect(onRequestPlay).toHaveBeenCalledTimes(1);
  });

  it('hides the play button while this card is the active player', () => {
    // Arrange + Act
    renderPreview({ videoSource: VIDEO_SOURCE, cues: CUES, mode: 'player', isActivePlayer: true });

    // Assert
    expect(screen.queryByTestId('play-button')).not.toBeInTheDocument();
  });

  it('shows no play button when there is no videoSource', () => {
    // Arrange + Act
    renderPreview({ mode: 'player' });

    // Assert
    expect(screen.queryByTestId('play-button')).not.toBeInTheDocument();
  });
});

describe('SubtitlePreview — subtitle source', () => {
  it('shows the representative first cue (cueAt at startSec) in edit mode', () => {
    // Arrange + Act
    renderPreview({ videoSource: VIDEO_SOURCE, cues: CUES, mode: 'edit' });

    // Assert — static cue[0], not a rotation
    expect(screen.getByTestId('subtitle-layer')).toHaveTextContent('primeira cue falada');
  });

  it('advances the subtitle with the video currentTime while actively playing', () => {
    // Arrange — active player; drive currentTime into the second cue
    renderPreview({
      videoSource: VIDEO_SOURCE,
      cues: CUES,
      mode: 'player',
      isActivePlayer: true,
    });
    const video = screen.getByTestId('video-el');

    // Act — currentTime 90 falls in cue[1] [85, 102)
    video.currentTime = 90;
    act(() => fireEvent(video, new Event('timeupdate')));

    // Assert
    expect(screen.getByTestId('subtitle-layer')).toHaveTextContent('segunda cue falada');
  });

  it('falls back to the moment key_quote when there are no cues', () => {
    // Arrange + Act
    renderPreview({ videoSource: VIDEO_SOURCE, cues: [], mode: 'player' });

    // Assert
    expect(screen.getByTestId('subtitle-layer')).toHaveTextContent(MOMENT.key_quote);
  });

  it('no longer renders the N/M chunk badge', () => {
    // Arrange + Act
    renderPreview({ videoSource: VIDEO_SOURCE, cues: CUES, mode: 'player' });

    // Assert — the rotation badge is gone
    expect(screen.queryByText(/^\d+\/\d+$/)).not.toBeInTheDocument();
  });
});

describe('SubtitlePreview — overlay + drag gating', () => {
  it('renders the overlay layer when overlayConfig.dataURL is provided', () => {
    // Arrange + Act
    const { container } = renderPreview({
      overlayConfig: { dataURL: 'data:image/png;base64,AAAA', opacity: 0.6, filename: 'a.png' },
      mode: 'edit',
    });

    // Assert
    const overlay = container.querySelector('img[src^="data:image/png"]');
    expect(overlay).toBeInTheDocument();
    expect(overlay).toHaveStyle({ opacity: '0.6' });
  });

  it('translates a video-layer drag into canvas-px deltas in edit mode', () => {
    // Arrange
    const onVideoConfigChange = vi.fn();
    renderPreview({ mode: 'edit', onVideoConfigChange });
    const videoLayer = screen.getByTestId('video-layer');

    // Act
    fireEvent.pointerDown(videoLayer, { clientX: 0, clientY: 0, pointerId: 1 });
    fireEvent.pointerMove(videoLayer, { clientX: 14, clientY: 0, pointerId: 1 });
    fireEvent.pointerUp(videoLayer, { pointerId: 1 });

    // Assert — 14 preview px / (280/1080) ≈ 54 canvas px
    expect(onVideoConfigChange).toHaveBeenCalled();
    const lastCall = onVideoConfigChange.mock.calls.at(-1)[0];
    expect(lastCall.x).toBeGreaterThan(50);
    expect(lastCall.x).toBeLessThan(58);
  });

  it('drags the subtitle layer independently in edit mode', () => {
    // Arrange
    const onSubtitleConfigChange = vi.fn();
    renderPreview({ mode: 'edit', onSubtitleConfigChange });
    const subtitleLayer = screen.getByTestId('subtitle-layer');

    // Act
    fireEvent.pointerDown(subtitleLayer, { clientX: 0, clientY: 0, pointerId: 2 });
    fireEvent.pointerMove(subtitleLayer, { clientX: 0, clientY: 28, pointerId: 2 });
    fireEvent.pointerUp(subtitleLayer, { pointerId: 2 });

    // Assert — 28 preview-px down ≈ 108 canvas-px
    expect(onSubtitleConfigChange).toHaveBeenCalled();
    const lastCall = onSubtitleConfigChange.mock.calls.at(-1)[0];
    expect(lastCall.y).toBeGreaterThan(100);
    expect(lastCall.y).toBeLessThan(115);
  });

  it('disables dragging in player mode', () => {
    // Arrange
    const onVideoConfigChange = vi.fn();
    renderPreview({ videoSource: VIDEO_SOURCE, cues: CUES, mode: 'player', onVideoConfigChange });
    const videoLayer = screen.getByTestId('video-layer');

    // Act
    fireEvent.pointerDown(videoLayer, { clientX: 0, clientY: 0, pointerId: 3 });
    fireEvent.pointerMove(videoLayer, { clientX: 40, clientY: 0, pointerId: 3 });
    fireEvent.pointerUp(videoLayer, { pointerId: 3 });

    // Assert — drag is gated off in player mode
    expect(onVideoConfigChange).not.toHaveBeenCalled();
  });
});
