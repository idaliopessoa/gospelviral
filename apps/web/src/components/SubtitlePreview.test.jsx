import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act, within } from '@testing-library/react';
import SubtitlePreview from './SubtitlePreview.jsx';
import { EXAMPLE_RESPONSE } from '@gospelviral/shared';
import { chunkText } from '../lib/helpers.js';

// Default to a single-segment (keep_linear) moment so the cue/chunk tests are
// isolated from cold-open segment transitions. The cold-open sequence has its
// own describe below.
const RAW_MOMENT = EXAMPLE_RESPONSE.top_moments[0];
const MOMENT = {
  ...RAW_MOMENT,
  cold_open_analysis: { ...RAW_MOMENT.cold_open_analysis, decision: 'keep_linear' },
};

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
  // Mock play/pause to DISPATCH the matching media events, mirroring a real
  // element so the hook's event-driven `isPlaying` (and the play/pause
  // affordance keyed off it) updates synchronously in the click gesture.
  // Pausing an already-paused element fires NO 'pause' event (real behavior).
  window.HTMLMediaElement.prototype.play = vi.fn(function play() {
    this._playing = true;
    this.dispatchEvent(new Event('play'));
    return Promise.resolve();
  });
  window.HTMLMediaElement.prototype.pause = vi.fn(function pause() {
    if (!this._playing) return;
    this._playing = false;
    this.dispatchEvent(new Event('pause'));
  });
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

  it('renders the uploaded <video> in EDIT mode too — not the YouTube cover (D1)', () => {
    // Arrange + Act — this rewrites the old test that encoded the bug
    const { container } = renderPreview({ videoSource: VIDEO_SOURCE, cues: CUES, mode: 'edit' });

    // Assert — the uploaded clip is the canvas source while editing
    expect(screen.getByTestId('video-el')).toBeInTheDocument();
    expect(container.querySelector('img[src*="img.youtube.com"]')).not.toBeInTheDocument();
  });

  it('renders the YouTube thumbnail in edit when there is NO videoSource (D1 fallback)', () => {
    // Arrange + Act
    const { container } = renderPreview({ mode: 'edit' });

    // Assert
    expect(screen.queryByTestId('video-el')).not.toBeInTheDocument();
    expect(container.querySelector('img[src*="img.youtube.com"]')).toBeInTheDocument();
  });

  it('seeks the edit-mode poster frame to startSec on loadedmetadata (D1)', () => {
    // Arrange — MOMENT[0] starts at 01:08 = 68s
    renderPreview({ videoSource: VIDEO_SOURCE, cues: CUES, mode: 'edit' });
    const video = screen.getByTestId('video-el');

    // Act
    act(() => fireEvent(video, new Event('loadedmetadata')));

    // Assert — paused poster seeked to the cut start (no autoplay in edit)
    expect(video.currentTime).toBe(68);
    expect(window.HTMLMediaElement.prototype.play).not.toHaveBeenCalled();
  });

  it('shows NO play button in edit even with a videoSource (poster is drag-only) (D1)', () => {
    // Arrange + Act
    renderPreview({ videoSource: VIDEO_SOURCE, cues: CUES, mode: 'edit' });

    // Assert
    expect(screen.queryByTestId('play-button')).not.toBeInTheDocument();
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

  it('while actively PLAYING, hides the play button and shows the pause control (D2)', () => {
    // Arrange — active player
    renderPreview({ videoSource: VIDEO_SOURCE, cues: CUES, mode: 'player', isActivePlayer: true });

    // Act — start playback via the real gesture (play() → 'play' event)
    act(() => fireEvent.click(screen.getByTestId('play-button')));

    // Assert — play glyph gone, transparent pause control present
    expect(screen.queryByTestId('play-button')).not.toBeInTheDocument();
    expect(screen.getByTestId('pause-button')).toBeInTheDocument();
  });

  it('clicking the pause control pauses (D2)', () => {
    // Arrange — playing
    renderPreview({ videoSource: VIDEO_SOURCE, cues: CUES, mode: 'player', isActivePlayer: true });
    act(() => fireEvent.click(screen.getByTestId('play-button')));
    window.HTMLMediaElement.prototype.pause.mockClear();

    // Act
    act(() => fireEvent.click(screen.getByTestId('pause-button')));

    // Assert
    expect(window.HTMLMediaElement.prototype.pause).toHaveBeenCalled();
  });

  it('a paused-but-active card shows the play/resume button again (D2)', () => {
    // Arrange — active + playing, then paused (still the active card)
    const onRequestPlay = vi.fn();
    renderPreview({
      videoSource: VIDEO_SOURCE,
      cues: CUES,
      mode: 'player',
      isActivePlayer: true,
      onRequestPlay,
    });
    act(() => fireEvent.click(screen.getByTestId('play-button'))); // start
    act(() => fireEvent.click(screen.getByTestId('pause-button'))); // → pause event → isPlaying false

    // Assert — resume affordance is back
    const resume = screen.getByTestId('play-button');
    expect(resume).toBeInTheDocument();

    // Act — resume re-claims the slot and plays in place
    onRequestPlay.mockClear();
    act(() => fireEvent.click(resume));
    expect(window.HTMLMediaElement.prototype.play).toHaveBeenCalled();
    expect(onRequestPlay).toHaveBeenCalled();
  });

  it('shows no play button when there is no videoSource', () => {
    // Arrange + Act
    renderPreview({ mode: 'player' });

    // Assert
    expect(screen.queryByTestId('play-button')).not.toBeInTheDocument();
    expect(screen.queryByTestId('pause-button')).not.toBeInTheDocument();
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

  it('falls back to the moment key_quote, chunked by the panel shape (D3)', () => {
    // Arrange — no cues → key_quote fallback; BASE_SUB chars 28 × lines 2 = 56 chars/chunk
    renderPreview({ videoSource: VIDEO_SOURCE, cues: [], mode: 'player' });
    const expectedChunk = chunkText(MOMENT.key_quote, BASE_SUB.charsPerScreen, BASE_SUB.lines)[0];

    // Assert — renders the FIRST chunk (panel SSOT), not the whole 77-char quote
    const layer = screen.getByTestId('subtitle-layer');
    expect(layer).toHaveTextContent(expectedChunk);
    expect(layer.textContent.length).toBeLessThan(MOMENT.key_quote.length);
  });

  it('no longer renders the N/M chunk badge', () => {
    // Arrange + Act
    renderPreview({ videoSource: VIDEO_SOURCE, cues: CUES, mode: 'player' });

    // Assert — the rotation badge is gone
    expect(screen.queryByText(/^\d+\/\d+$/)).not.toBeInTheDocument();
  });
});

describe('SubtitlePreview — chunked subtitle, panel as SSOT (D3)', () => {
  // One long cue spanning a wide window so chunking is observable.
  const LONG_TEXT =
    'Salmos 23:1 o Senhor é o meu pastor e nada me faltará em verdes pastos me faz repousar guia me mansamente';
  const LONG_CUE = [{ text: LONG_TEXT, start: 0, end: 100 }];

  it('chunks the cue text and pins chunk[0] in edit mode (not the whole cue)', () => {
    // Arrange — narrow shape so the long cue splits into many chunks
    const sub = { ...BASE_SUB, charsPerScreen: 14, lines: 1 };
    const expectedChunk0 = chunkText(LONG_TEXT, 14, 1)[0];

    // Act
    renderPreview({ videoSource: VIDEO_SOURCE, cues: LONG_CUE, mode: 'edit', subtitleConfig: sub });

    // Assert — only chunk[0] renders; not the full cue
    const layer = screen.getByTestId('subtitle-layer');
    expect(layer.textContent).toBe(expectedChunk0);
    expect(layer.textContent).not.toBe(LONG_TEXT);
  });

  it('advances to a later chunk as the video currentTime moves through the cue window', () => {
    // Arrange
    const sub = { ...BASE_SUB, charsPerScreen: 14, lines: 1 };
    const chunks = chunkText(LONG_TEXT, 14, 1);
    renderPreview({
      videoSource: VIDEO_SOURCE,
      cues: LONG_CUE,
      mode: 'player',
      isActivePlayer: true,
      subtitleConfig: sub,
    });
    const video = screen.getByTestId('video-el');

    // Act — currentTime near the end of the [0,100) window → the last chunk
    video.currentTime = 99;
    act(() => fireEvent(video, new Event('timeupdate')));

    // Assert
    expect(screen.getByTestId('subtitle-layer').textContent).toBe(chunks[chunks.length - 1]);
  });

  it('changing charsPerScreen changes what renders (preview reflects the panel)', () => {
    // Arrange + Act — narrow vs wide screen, same cue + edit (chunk[0])
    const { unmount } = renderPreview({
      cues: LONG_CUE,
      mode: 'edit',
      subtitleConfig: { ...BASE_SUB, charsPerScreen: 10, lines: 1 },
    });
    const narrowText = screen.getByTestId('subtitle-layer').textContent;
    unmount();
    renderPreview({
      cues: LONG_CUE,
      mode: 'edit',
      subtitleConfig: { ...BASE_SUB, charsPerScreen: 60, lines: 1 },
    });
    const wideText = screen.getByTestId('subtitle-layer').textContent;

    // Assert — wider screen packs more of the cue into chunk[0]
    expect(wideText.length).toBeGreaterThan(narrowText.length);
  });

  it('runs the highlight on the VISIBLE chunk only', () => {
    // Arrange — scripture ref lands in chunk[0]; a later chunk has no ref
    const sub = {
      ...BASE_SUB,
      charsPerScreen: 14,
      lines: 1,
      highlightScripture: true,
    };
    const chunks = chunkText(LONG_TEXT, 14, 1);

    // Act — edit pins chunk[0] (which contains "Salmos 23:1")
    renderPreview({ videoSource: VIDEO_SOURCE, cues: LONG_CUE, mode: 'edit', subtitleConfig: sub });

    // Assert — the ref renders highlighted in the visible chunk[0]
    const layer = screen.getByTestId('subtitle-layer');
    expect(chunks[0]).toContain('Salmos 23:1');
    const ref = within(layer).getByText('Salmos 23:1');
    expect(ref).toHaveStyle({ color: 'rgb(244, 192, 74)' });
    // and the highlight is NOT applied to the whole cue — later chunks aren't even rendered
    expect(layer.textContent).toBe(chunks[0]);
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

  it('still translates a video-layer drag with a <video> child present in edit (D1)', () => {
    // Arrange — with a videoSource the layer now holds a <video>, not an <img>;
    // drag lives on the wrapper div so it must still commit canvas-px deltas.
    const onVideoConfigChange = vi.fn();
    renderPreview({ videoSource: VIDEO_SOURCE, cues: CUES, mode: 'edit', onVideoConfigChange });
    const videoLayer = screen.getByTestId('video-layer');
    expect(within(videoLayer).getByTestId('video-el')).toBeInTheDocument();

    // Act
    fireEvent.pointerDown(videoLayer, { clientX: 0, clientY: 0, pointerId: 7 });
    fireEvent.pointerMove(videoLayer, { clientX: 14, clientY: 0, pointerId: 7 });
    fireEvent.pointerUp(videoLayer, { pointerId: 7 });

    // Assert
    expect(onVideoConfigChange).toHaveBeenCalled();
    expect(onVideoConfigChange.mock.calls.at(-1)[0].x).toBeGreaterThan(50);
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

describe('SubtitlePreview — cold-open playback sequence (D6)', () => {
  // cut [100,120], peak [105,110] → segments [peak, cut]
  const COLD_OPEN_MOMENT = {
    ...RAW_MOMENT,
    timestamp_start: '00:01:40',
    timestamp_end: '00:02:00',
    cold_open_analysis: {
      ...RAW_MOMENT.cold_open_analysis,
      decision: 'apply_cold_open',
      peak_moment: { timestamp: '00:01:45-00:01:50', why_powerful: 'x' },
    },
  };

  it('plays the peak, then seeks BACK to the full-cut start at the peak end', () => {
    // Arrange
    const onPlaybackEnd = vi.fn();
    renderPreview({
      videoSource: VIDEO_SOURCE,
      cues: [],
      mode: 'player',
      isActivePlayer: true,
      moment: COLD_OPEN_MOMENT,
      onPlaybackEnd,
    });
    const video = screen.getByTestId('video-el');

    // Act — reach the peak end (110) → advance to the cut start (100)
    video.currentTime = 110;
    act(() => fireEvent(video, new Event('timeupdate')));

    // Assert — peak replays in context; not the end of playback yet
    expect(video.currentTime).toBe(100);
    expect(onPlaybackEnd).not.toHaveBeenCalled();
  });

  it('ends (onPlaybackEnd once) only at the full-cut end, not the peak end', () => {
    // Arrange
    const onPlaybackEnd = vi.fn();
    renderPreview({
      videoSource: VIDEO_SOURCE,
      cues: [],
      mode: 'player',
      isActivePlayer: true,
      moment: COLD_OPEN_MOMENT,
      onPlaybackEnd,
    });
    const video = screen.getByTestId('video-el');

    // Act — peak end advances; cut end finishes
    video.currentTime = 110;
    act(() => fireEvent(video, new Event('timeupdate')));
    video.currentTime = 120;
    act(() => fireEvent(video, new Event('timeupdate')));

    // Assert
    expect(onPlaybackEnd).toHaveBeenCalledTimes(1);
  });

  it('a keep_linear moment plays a single cut (no backward seek)', () => {
    // Arrange — same cut, linear
    const linear = { ...COLD_OPEN_MOMENT, cold_open_analysis: { ...COLD_OPEN_MOMENT.cold_open_analysis, decision: 'keep_linear' } };
    const onPlaybackEnd = vi.fn();
    renderPreview({
      videoSource: VIDEO_SOURCE,
      cues: [],
      mode: 'player',
      isActivePlayer: true,
      moment: linear,
      onPlaybackEnd,
    });
    const video = screen.getByTestId('video-el');

    // Act — at 110 (mid-cut) nothing special happens; at 120 it ends
    video.currentTime = 110;
    act(() => fireEvent(video, new Event('timeupdate')));
    expect(video.currentTime).toBe(110); // no backward seek
    video.currentTime = 120;
    act(() => fireEvent(video, new Event('timeupdate')));

    // Assert
    expect(onPlaybackEnd).toHaveBeenCalledTimes(1);
  });
});
