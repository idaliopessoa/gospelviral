import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import CopyAllButton from './CopyAllButton.jsx';

const MOMENT = {
  hook_title: 'O título',
  caption: { text: 'O corpo da legenda.' },
  hashtags: { all: '#a #b #c' },
};

describe('CopyAllButton', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn() },
      configurable: true,
    });
  });
  afterEach(() => vi.useRealTimers());

  it('concatenates hook + caption + hashtags with double-newline separators', () => {
    // Arrange
    render(<CopyAllButton moment={MOMENT} />);

    // Act
    fireEvent.click(screen.getByRole('button'));

    // Assert
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      'O título\n\nO corpo da legenda.\n\n#a #b #c',
    );
  });

  it('drops missing fields rather than emitting "undefined"', () => {
    // Arrange
    const partial = { hook_title: 'Só o título', caption: undefined, hashtags: undefined };
    render(<CopyAllButton moment={partial} />);

    // Act
    fireEvent.click(screen.getByRole('button'));

    // Assert
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('Só o título');
  });

  it('shows confirmation state for 2400ms then reverts', () => {
    // Arrange
    render(<CopyAllButton moment={MOMENT} />);
    const btn = screen.getByRole('button');

    // Act
    fireEvent.click(btn);

    // Assert — flipped
    expect(btn).toHaveTextContent('Pronto pra colar');

    // Act — advance timer
    act(() => vi.advanceTimersByTime(2400));

    // Assert — reverted
    expect(btn).toHaveTextContent('Copiar tudo · Reels/Shorts');
  });
});
