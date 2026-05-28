import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
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
  highlightScripture: true,
  highlightKeywords: true,
  x: 0,
  y: 0,
};

function mockCanvasSize(width) {
  // jsdom returns 0×0 from getBoundingClientRect; stub it so the canvas
  // measurement hook reports a non-zero size and the scaleFactor is finite.
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

describe('SubtitlePreview', () => {
  beforeEach(() => {
    mockCanvasSize(280);
    Element.prototype.setPointerCapture = vi.fn();
    Element.prototype.releasePointerCapture = vi.fn();
    Element.prototype.hasPointerCapture = vi.fn().mockReturnValue(true);
  });

  it('renders the chunk counter and the active chunk text', () => {
    // Arrange + Act
    render(
      <SubtitlePreview
        videoId="abc123"
        moment={MOMENT}
        subtitleConfig={BASE_SUB}
        videoConfig={{ x: 0, y: 0, scale: 1 }}
        overlayConfig={{ dataURL: null, opacity: 1, filename: null }}
        onVideoConfigChange={() => {}}
        onSubtitleConfigChange={() => {}}
      />,
    );

    // Assert — counter present, total >= 1
    const counter = screen.getByText(/^\d+\/\d+$/);
    expect(counter).toBeInTheDocument();
  });

  it('renders the overlay layer when overlayConfig.dataURL is provided', () => {
    // Arrange + Act
    const { container } = render(
      <SubtitlePreview
        videoId="abc123"
        moment={MOMENT}
        subtitleConfig={BASE_SUB}
        videoConfig={{ x: 0, y: 0, scale: 1 }}
        overlayConfig={{ dataURL: 'data:image/png;base64,AAAA', opacity: 0.6, filename: 'a.png' }}
      />,
    );

    // Assert
    const overlay = container.querySelector('img[src^="data:image/png"]');
    expect(overlay).toBeInTheDocument();
    expect(overlay).toHaveStyle({ opacity: '0.6' });
  });

  it('translates a pointer drag on the video layer into canvas-px deltas', () => {
    // Arrange
    const onVideoConfigChange = vi.fn();
    render(
      <SubtitlePreview
        videoId="abc123"
        moment={MOMENT}
        subtitleConfig={BASE_SUB}
        videoConfig={{ x: 0, y: 0, scale: 1 }}
        overlayConfig={{ dataURL: null, opacity: 1, filename: null }}
        onVideoConfigChange={onVideoConfigChange}
      />,
    );
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
    expect(lastCall.scale).toBe(1);
  });

  it('drags the subtitle layer independently of the video layer', () => {
    // Arrange
    const onSubtitleConfigChange = vi.fn();
    render(
      <SubtitlePreview
        videoId="abc123"
        moment={MOMENT}
        subtitleConfig={BASE_SUB}
        videoConfig={{ x: 0, y: 0, scale: 1 }}
        overlayConfig={{ dataURL: null, opacity: 1, filename: null }}
        onSubtitleConfigChange={onSubtitleConfigChange}
      />,
    );
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
    expect(lastCall.x).toBe(0);
  });
});
