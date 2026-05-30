import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, within, act } from '@testing-library/react';
import App from './App.jsx';

const VIDEO_SOURCE = {
  id: '22222222-2222-2222-2222-222222222222',
  filename: 'sermao.mp4',
  sizeBytes: 4096,
  mimeType: 'video/mp4',
  uploadedAt: '2026-05-29T00:00:00.000Z',
};

vi.mock('./lib/upload.js', () => ({
  uploadVideo: vi.fn(() => Promise.resolve(VIDEO_SOURCE)),
  UploadError: class UploadError extends Error {},
}));

beforeEach(() => {
  Element.prototype.getBoundingClientRect = vi.fn().mockReturnValue({
    width: 280,
    height: 498,
    top: 0,
    left: 0,
    right: 280,
    bottom: 498,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  });
  Element.prototype.setPointerCapture = vi.fn();
  Element.prototype.releasePointerCapture = vi.fn();
  Element.prototype.hasPointerCapture = vi.fn().mockReturnValue(true);
  // play/pause DISPATCH the matching media events (mirroring a real element) so
  // the hook's event-driven `isPlaying` — and the play/pause affordance keyed
  // off it — updates synchronously within the click gesture. Pausing an
  // already-paused element fires NO 'pause' event (real behavior), so the
  // mount-time reactive pause on never-played cards is a silent no-op.
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

// Load the example results, upload a (mocked) video, leaving the panel OPEN (edit).
async function loadResultsWithVideo() {
  render(<App />);
  fireEvent.click(screen.getByRole('button', { name: /Ver exemplo pronto/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Vídeo Fonte' }));
  fireEvent.change(document.querySelector('input[type="file"]'), {
    target: { files: [new File([new Blob(['x'])], 'sermao.mp4', { type: 'video/mp4' })] },
  });
  await waitFor(() => expect(screen.getByTestId('video-source-badge')).toBeInTheDocument());
}

describe('App — playback orchestration', () => {
  it('shows no play button in EDIÇÃO (panel open) and one per card in PLAYER (collapsed)', async () => {
    // Arrange — uploaded video, panel open (edit)
    await loadResultsWithVideo();

    // Assert edit: no play buttons (static thumbnails, drag enabled)
    expect(screen.queryAllByTestId('play-button')).toHaveLength(0);

    // Act — collapse → PLAYER mode
    fireEvent.click(screen.getByRole('button', { name: /Recolher/ }));

    // Assert — a play button on each of the 5 cards
    expect(screen.getAllByTestId('play-button')).toHaveLength(5);
  });

  it('plays one card at a time — playing card 2 restores card 1 button and hides card 2', async () => {
    // Arrange
    await loadResultsWithVideo();
    fireEvent.click(screen.getByRole('button', { name: /Recolher/ }));
    const cards = screen.getAllByRole('article');

    // Act — play card 1
    fireEvent.click(within(cards[0]).getByTestId('play-button'));

    // Assert — card 1 active (no button), card 2 still idle (button present)
    expect(within(cards[0]).queryByTestId('play-button')).not.toBeInTheDocument();
    expect(within(cards[1]).getByTestId('play-button')).toBeInTheDocument();

    // Act — play card 2
    fireEvent.click(within(cards[1]).getByTestId('play-button'));

    // Assert — card 1 restored, card 2 now active (one-at-a-time)
    expect(within(cards[0]).getByTestId('play-button')).toBeInTheDocument();
    expect(within(cards[1]).queryByTestId('play-button')).not.toBeInTheDocument();
  });

  it('calls play() on the active card video (synchronous in the gesture)', async () => {
    // Arrange
    await loadResultsWithVideo();
    fireEvent.click(screen.getByRole('button', { name: /Recolher/ }));
    window.HTMLMediaElement.prototype.play.mockClear();
    const cards = screen.getAllByRole('article');

    // Act
    fireEvent.click(within(cards[0]).getByTestId('play-button'));

    // Assert
    expect(window.HTMLMediaElement.prototype.play).toHaveBeenCalled();
  });

  it('opening a config tab pauses everything and returns to EDIÇÃO (no play buttons)', async () => {
    // Arrange — playing card 1 in PLAYER mode
    await loadResultsWithVideo();
    fireEvent.click(screen.getByRole('button', { name: /Recolher/ }));
    const cards = screen.getAllByRole('article');
    fireEvent.click(within(cards[0]).getByTestId('play-button'));

    // Act — open a config tab (forces edit + clears playingIndex)
    fireEvent.click(screen.getByRole('button', { name: 'Legenda' }));

    // Assert — edit mode, nothing playing
    expect(screen.queryAllByTestId('play-button')).toHaveLength(0);
  });

  it('pauses at the cut end — the play button reappears when playback ends (D6 cold-open sequence)', async () => {
    // Arrange — moment[0] is apply_cold_open: peak 01:08–01:25 (68–85), cut
    // 01:08–02:15 (68–135). Playback runs the peak, then the full cut.
    await loadResultsWithVideo();
    fireEvent.click(screen.getByRole('button', { name: /Recolher/ }));
    const cards = screen.getAllByRole('article');
    fireEvent.click(within(cards[0]).getByTestId('play-button'));
    expect(within(cards[0]).queryByTestId('play-button')).not.toBeInTheDocument();
    const video = within(cards[0]).getByTestId('video-el');

    // Act — peak end (85) advances to the cut start (no end yet)…
    video.currentTime = 85;
    act(() => fireEvent(video, new Event('timeupdate')));
    expect(video.currentTime).toBe(68); // seeked back to the full-cut start
    expect(within(cards[0]).queryByTestId('play-button')).not.toBeInTheDocument();
    // …then the cut end (135) finishes the sequence
    video.currentTime = 135;
    act(() => fireEvent(video, new Event('timeupdate')));

    // Assert — paused at end → card 1 is no longer the active player, button back
    expect(window.HTMLMediaElement.prototype.pause).toHaveBeenCalled();
    expect(within(cards[0]).getByTestId('play-button')).toBeInTheDocument();
  });

  it('pauses a playing card in place and resumes it (paused-but-active, one-at-a-time) (D2)', async () => {
    // Arrange — play card 1
    await loadResultsWithVideo();
    fireEvent.click(screen.getByRole('button', { name: /Recolher/ }));
    const cards = screen.getAllByRole('article');
    fireEvent.click(within(cards[0]).getByTestId('play-button'));

    // Act — pause card 1 in place (click its pause control)
    fireEvent.click(within(cards[0]).getByTestId('pause-button'));

    // Assert — card 1 shows the resume button again; the other cards still
    // show their play button (card 1 stayed the active card — one-at-a-time).
    expect(within(cards[0]).getByTestId('play-button')).toBeInTheDocument();
    expect(within(cards[1]).getByTestId('play-button')).toBeInTheDocument();

    // Act — resume card 1
    window.HTMLMediaElement.prototype.play.mockClear();
    fireEvent.click(within(cards[0]).getByTestId('play-button'));

    // Assert — plays again, pause control back
    expect(window.HTMLMediaElement.prototype.play).toHaveBeenCalled();
    expect(within(cards[0]).getByTestId('pause-button')).toBeInTheDocument();
  });

  it('flips PLAYER↔EDIÇÃO with the collapse control', async () => {
    // Arrange — open (edit)
    await loadResultsWithVideo();
    expect(screen.queryAllByTestId('play-button')).toHaveLength(0);

    // Act + Assert — collapse → player
    fireEvent.click(screen.getByRole('button', { name: /Recolher/ }));
    expect(screen.getAllByTestId('play-button')).toHaveLength(5);

    // Act + Assert — expand → edit
    fireEvent.click(screen.getByRole('button', { name: /Expandir/ }));
    expect(screen.queryAllByTestId('play-button')).toHaveLength(0);
  });
});
