import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { useVideoPlayback } from './useVideoPlayback.js';

const START = 10;
const END = 20;

// Harness: mounts the hook against a real <video> ref and exposes play() + currentTime.
// `mounted` toggles the <video> in/out to model the card flipping EDIÇÃO↔PLAYER.
function Harness({ isActivePlayer = false, onReachEnd, playRef, mounted = true }) {
  const { videoRef, currentTime, play } = useVideoPlayback({
    startSec: START,
    endSec: END,
    isActivePlayer,
    onReachEnd,
  });
  if (playRef) playRef.current = play;
  return (
    <>
      {mounted && <video ref={videoRef} data-testid="video" />}
      <span data-testid="ct">{currentTime}</span>
    </>
  );
}

beforeEach(() => {
  // jsdom does not implement HTMLMediaElement play/pause/currentTime — stub them.
  window.HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined);
  window.HTMLMediaElement.prototype.pause = vi.fn();
  Object.defineProperty(window.HTMLMediaElement.prototype, 'currentTime', {
    configurable: true,
    writable: true,
    value: 0,
  });
});

describe('useVideoPlayback', () => {
  it('initializes currentTime to startSec', () => {
    // Arrange + Act
    render(<Harness />);

    // Assert
    expect(screen.getByTestId('ct')).toHaveTextContent(String(START));
  });

  it('play() seeks to startSec when currentTime is before the cut, then plays', () => {
    // Arrange
    const playRef = { current: null };
    render(<Harness playRef={playRef} />);
    const video = screen.getByTestId('video');
    video.currentTime = 0; // before startSec

    // Act
    act(() => playRef.current());

    // Assert
    expect(video.currentTime).toBe(START);
    expect(window.HTMLMediaElement.prototype.play).toHaveBeenCalled();
  });

  it('play() does NOT reseek when currentTime is already inside the cut', () => {
    // Arrange
    const playRef = { current: null };
    render(<Harness playRef={playRef} />);
    const video = screen.getByTestId('video');
    video.currentTime = 12; // inside [10, 20)

    // Act
    act(() => playRef.current());

    // Assert
    expect(video.currentTime).toBe(12);
    expect(window.HTMLMediaElement.prototype.play).toHaveBeenCalled();
  });

  it('play() RESTARTS from startSec when currentTime is at/after endSec (replay)', () => {
    // Arrange
    const playRef = { current: null };
    render(<Harness playRef={playRef} />);
    const video = screen.getByTestId('video');
    video.currentTime = END; // paused at the end

    // Act
    act(() => playRef.current());

    // Assert — restart, not a no-op resume
    expect(video.currentTime).toBe(START);
    expect(window.HTMLMediaElement.prototype.play).toHaveBeenCalled();
  });

  it('seeks to startSec on loadedmetadata (paints the start frame)', () => {
    // Arrange
    render(<Harness />);
    const video = screen.getByTestId('video');
    video.currentTime = 0;

    // Act
    fireEvent(video, new Event('loadedmetadata'));

    // Assert
    expect(video.currentTime).toBe(START);
  });

  it('on timeupdate inside the cut, exposes currentTime and does not pause or end', () => {
    // Arrange
    const onReachEnd = vi.fn();
    render(<Harness onReachEnd={onReachEnd} />);
    const video = screen.getByTestId('video');
    window.HTMLMediaElement.prototype.pause.mockClear();
    video.currentTime = 14;

    // Act
    fireEvent(video, new Event('timeupdate'));

    // Assert
    expect(screen.getByTestId('ct')).toHaveTextContent('14');
    expect(onReachEnd).not.toHaveBeenCalled();
    expect(window.HTMLMediaElement.prototype.pause).not.toHaveBeenCalled();
  });

  it('pauses and calls onReachEnd when timeupdate reaches endSec', () => {
    // Arrange
    const onReachEnd = vi.fn();
    render(<Harness onReachEnd={onReachEnd} />);
    const video = screen.getByTestId('video');
    window.HTMLMediaElement.prototype.pause.mockClear();
    video.currentTime = END; // reached the cut end

    // Act
    fireEvent(video, new Event('timeupdate'));

    // Assert
    expect(window.HTMLMediaElement.prototype.pause).toHaveBeenCalled();
    expect(onReachEnd).toHaveBeenCalledTimes(1);
  });

  it('attaches media listeners when the <video> mounts AFTER the first render (edit→player)', () => {
    // Arrange — first render has no <video> (EDIÇÃO mode: nothing to wire)
    const onReachEnd = vi.fn();
    const { rerender } = render(<Harness mounted={false} onReachEnd={onReachEnd} />);

    // Act — the video mounts later (collapse → PLAYER), then playback reaches the end
    rerender(<Harness mounted onReachEnd={onReachEnd} />);
    const video = screen.getByTestId('video');
    video.currentTime = END;
    act(() => fireEvent(video, new Event('timeupdate')));

    // Assert — listeners were (re)attached to the freshly mounted element
    expect(onReachEnd).toHaveBeenCalledTimes(1);
  });

  it('pauses reactively when this card stops being the active player', () => {
    // Arrange — start active, then flip to inactive
    const { rerender } = render(<Harness isActivePlayer />);
    window.HTMLMediaElement.prototype.pause.mockClear();

    // Act
    rerender(<Harness isActivePlayer={false} />);

    // Assert
    expect(window.HTMLMediaElement.prototype.pause).toHaveBeenCalled();
  });
});
