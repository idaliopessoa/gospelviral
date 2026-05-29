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
  window.HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined);
  window.HTMLMediaElement.prototype.pause = vi.fn();
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

  it('pauses at the cut end — the play button reappears when playback reaches endSec', async () => {
    // Arrange — play card 1 (moment[0] ends at 02:15 = 135s)
    await loadResultsWithVideo();
    fireEvent.click(screen.getByRole('button', { name: /Recolher/ }));
    const cards = screen.getAllByRole('article');
    fireEvent.click(within(cards[0]).getByTestId('play-button'));
    expect(within(cards[0]).queryByTestId('play-button')).not.toBeInTheDocument();
    const video = within(cards[0]).getByTestId('video-el');

    // Act — playback reaches the cut end
    video.currentTime = 135;
    act(() => fireEvent(video, new Event('timeupdate')));

    // Assert — paused at end → card 1 is no longer the active player, button back
    expect(window.HTMLMediaElement.prototype.pause).toHaveBeenCalled();
    expect(within(cards[0]).getByTestId('play-button')).toBeInTheDocument();
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
