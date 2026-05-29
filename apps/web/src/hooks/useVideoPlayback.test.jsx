import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { useVideoPlayback } from './useVideoPlayback.js';

const START = 10;
const END = 20;
const SINGLE = [{ start: START, end: END }];
// Cold-open sequence: peak [15,18] then full cut [10,25] (peak ⊆ cut).
const COLD_OPEN = [
  { start: 15, end: 18 },
  { start: 10, end: 25 },
];

// Harness: mounts the hook against a real <video> ref and exposes the full API
// + currentTime + isPlaying. `mounted` toggles the <video> in/out to model the
// card flipping EDIÇÃO↔PLAYER.
function Harness({ segments = SINGLE, isActivePlayer = false, onReachEnd, api, mounted = true }) {
  const hook = useVideoPlayback({ segments, isActivePlayer, onReachEnd });
  if (api) api.current = hook;
  return (
    <>
      {mounted && <video ref={hook.videoRef} data-testid="video" />}
      <span data-testid="ct">{hook.currentTime}</span>
      <span data-testid="playing">{String(hook.isPlaying)}</span>
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

describe('useVideoPlayback — single segment (pre-D6 back-compat)', () => {
  it('initializes currentTime to the first segment start', () => {
    // Arrange + Act
    render(<Harness />);

    // Assert
    expect(screen.getByTestId('ct')).toHaveTextContent(String(START));
  });

  it('play() seeks to the start when currentTime is before the cut, then plays', () => {
    // Arrange
    const api = { current: null };
    render(<Harness api={api} />);
    const video = screen.getByTestId('video');
    video.currentTime = 0; // before start

    // Act
    act(() => api.current.play());

    // Assert
    expect(video.currentTime).toBe(START);
    expect(window.HTMLMediaElement.prototype.play).toHaveBeenCalled();
  });

  it('play() does NOT reseek when currentTime is already inside the segment', () => {
    // Arrange
    const api = { current: null };
    render(<Harness api={api} />);
    const video = screen.getByTestId('video');
    video.currentTime = 12; // inside [10, 20)

    // Act
    act(() => api.current.play());

    // Assert
    expect(video.currentTime).toBe(12);
    expect(window.HTMLMediaElement.prototype.play).toHaveBeenCalled();
  });

  it('play() RESTARTS from the start when currentTime is at/after the end (replay)', () => {
    // Arrange
    const api = { current: null };
    render(<Harness api={api} />);
    const video = screen.getByTestId('video');
    video.currentTime = END; // paused at the end

    // Act
    act(() => api.current.play());

    // Assert — restart, not a no-op resume
    expect(video.currentTime).toBe(START);
  });

  it('seeks to the start on loadedmetadata (paints the start frame)', () => {
    // Arrange
    render(<Harness />);
    const video = screen.getByTestId('video');
    video.currentTime = 0;

    // Act
    fireEvent(video, new Event('loadedmetadata'));

    // Assert
    expect(video.currentTime).toBe(START);
  });

  it('on timeupdate inside the segment, exposes currentTime and does not pause or end', () => {
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

  it('pauses and calls onReachEnd once when timeupdate reaches the end', () => {
    // Arrange
    const onReachEnd = vi.fn();
    render(<Harness onReachEnd={onReachEnd} />);
    const video = screen.getByTestId('video');
    window.HTMLMediaElement.prototype.pause.mockClear();
    video.currentTime = END;

    // Act
    fireEvent(video, new Event('timeupdate'));

    // Assert
    expect(window.HTMLMediaElement.prototype.pause).toHaveBeenCalled();
    expect(onReachEnd).toHaveBeenCalledTimes(1);
  });

  it('resets currentTime to the start when the <video> unmounts (edit shows cue[0])', () => {
    // Arrange
    const { rerender } = render(<Harness mounted />);
    const video = screen.getByTestId('video');
    video.currentTime = 95;
    act(() => fireEvent(video, new Event('timeupdate')));
    expect(screen.getByTestId('ct')).toHaveTextContent('95');

    // Act
    rerender(<Harness mounted={false} />);

    // Assert
    expect(screen.getByTestId('ct')).toHaveTextContent(String(START));
  });

  it('swallows a rejected play() promise (no uncaught rejection)', () => {
    // Arrange
    window.HTMLMediaElement.prototype.play = vi.fn().mockRejectedValue(new Error('NotAllowed'));
    const api = { current: null };
    render(<Harness api={api} />);

    // Act + Assert
    expect(() => act(() => api.current.play())).not.toThrow();
    expect(window.HTMLMediaElement.prototype.play).toHaveBeenCalled();
  });

  it('attaches media listeners when the <video> mounts AFTER the first render (edit→player)', () => {
    // Arrange
    const onReachEnd = vi.fn();
    const { rerender } = render(<Harness mounted={false} onReachEnd={onReachEnd} />);

    // Act
    rerender(<Harness mounted onReachEnd={onReachEnd} />);
    const video = screen.getByTestId('video');
    video.currentTime = END;
    act(() => fireEvent(video, new Event('timeupdate')));

    // Assert
    expect(onReachEnd).toHaveBeenCalledTimes(1);
  });

  it('pauses reactively when this card stops being the active player', () => {
    // Arrange
    const { rerender } = render(<Harness isActivePlayer />);
    window.HTMLMediaElement.prototype.pause.mockClear();

    // Act
    rerender(<Harness isActivePlayer={false} />);

    // Assert
    expect(window.HTMLMediaElement.prototype.pause).toHaveBeenCalled();
  });
});

describe('useVideoPlayback — pause/toggle/isPlaying (D2)', () => {
  it('isPlaying is false initially (not optimistic)', () => {
    // Arrange + Act
    render(<Harness />);

    // Assert
    expect(screen.getByTestId('playing')).toHaveTextContent('false');
  });

  it('mirrors isPlaying from the element play/pause events', () => {
    // Arrange
    render(<Harness />);
    const video = screen.getByTestId('video');

    // Act + Assert — play event → true
    act(() => fireEvent(video, new Event('play')));
    expect(screen.getByTestId('playing')).toHaveTextContent('true');

    // Act + Assert — pause event → false
    act(() => fireEvent(video, new Event('pause')));
    expect(screen.getByTestId('playing')).toHaveTextContent('false');
  });

  it('pause() pauses the element', () => {
    // Arrange
    const api = { current: null };
    render(<Harness api={api} />);
    window.HTMLMediaElement.prototype.pause.mockClear();

    // Act
    act(() => api.current.pause());

    // Assert
    expect(window.HTMLMediaElement.prototype.pause).toHaveBeenCalled();
  });

  it('toggle() from paused calls play()', () => {
    // Arrange
    const api = { current: null };
    render(<Harness api={api} />);

    // Act
    act(() => api.current.toggle());

    // Assert
    expect(window.HTMLMediaElement.prototype.play).toHaveBeenCalled();
  });

  it('toggle() while playing calls pause()', () => {
    // Arrange — drive isPlaying true via the play event
    const api = { current: null };
    render(<Harness api={api} />);
    const video = screen.getByTestId('video');
    act(() => fireEvent(video, new Event('play')));
    window.HTMLMediaElement.prototype.pause.mockClear();

    // Act
    act(() => api.current.toggle());

    // Assert
    expect(window.HTMLMediaElement.prototype.pause).toHaveBeenCalled();
  });

  it('resume after a user pause does NOT reseek (resumes in place)', () => {
    // Arrange — playing mid-segment at t=14, then paused there
    const api = { current: null };
    render(<Harness api={api} />);
    const video = screen.getByTestId('video');
    video.currentTime = 14;
    act(() => fireEvent(video, new Event('timeupdate')));
    act(() => api.current.pause());
    act(() => fireEvent(video, new Event('pause')));

    // Act — resume
    act(() => api.current.play());

    // Assert — stays at 14 (no restart)
    expect(video.currentTime).toBe(14);
  });

  it('end-of-cut leaves isPlaying false (pause event after reaching the end)', () => {
    // Arrange
    const onReachEnd = vi.fn();
    render(<Harness onReachEnd={onReachEnd} />);
    const video = screen.getByTestId('video');
    act(() => fireEvent(video, new Event('play')));
    video.currentTime = END;

    // Act — reaching the end pauses; a real element then emits 'pause'
    act(() => fireEvent(video, new Event('timeupdate')));
    act(() => fireEvent(video, new Event('pause')));

    // Assert
    expect(onReachEnd).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('playing')).toHaveTextContent('false');
  });
});

describe('useVideoPlayback — cold-open segment sequence (D6)', () => {
  it('advances from the peak to the full cut at the peak end (seek, no pause/onReachEnd)', () => {
    // Arrange — peak [15,18], cut [10,25]
    const onReachEnd = vi.fn();
    render(<Harness segments={COLD_OPEN} onReachEnd={onReachEnd} />);
    const video = screen.getByTestId('video');
    window.HTMLMediaElement.prototype.pause.mockClear();

    // Act — reach the peak end
    video.currentTime = 18;
    act(() => fireEvent(video, new Event('timeupdate')));

    // Assert — seek BACK to the cut start, keep playing
    expect(video.currentTime).toBe(10);
    expect(window.HTMLMediaElement.prototype.pause).not.toHaveBeenCalled();
    expect(onReachEnd).not.toHaveBeenCalled();
  });

  it('pauses + fires onReachEnd ONCE only at the LAST segment end', () => {
    // Arrange
    const onReachEnd = vi.fn();
    render(<Harness segments={COLD_OPEN} onReachEnd={onReachEnd} />);
    const video = screen.getByTestId('video');

    // Act — peak end → advance to cut
    video.currentTime = 18;
    act(() => fireEvent(video, new Event('timeupdate')));
    // play through the cut to its end
    window.HTMLMediaElement.prototype.pause.mockClear();
    video.currentTime = 25;
    act(() => fireEvent(video, new Event('timeupdate')));

    // Assert — only the final segment ends the sequence
    expect(window.HTMLMediaElement.prototype.pause).toHaveBeenCalledTimes(1);
    expect(onReachEnd).toHaveBeenCalledTimes(1);
  });

  it('play() restarts the sequence from the peak (segments[0].start)', () => {
    // Arrange — sit past the active segment
    const api = { current: null };
    render(<Harness segments={COLD_OPEN} api={api} />);
    const video = screen.getByTestId('video');
    video.currentTime = 30; // beyond the peak [15,18)

    // Act
    act(() => api.current.play());

    // Assert — restarts at the peak start
    expect(video.currentTime).toBe(15);
  });
});
