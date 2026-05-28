import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import CopyButton from './CopyButton.jsx';

describe('CopyButton', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn() },
      configurable: true,
    });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders the provided label initially', () => {
    // Arrange + Act
    render(<CopyButton text="hello" label="Copiar tudo" />);

    // Assert
    expect(screen.getByRole('button', { name: /Copiar tudo/ })).toBeInTheDocument();
  });

  it('writes the text to clipboard on click and flips to Copiado, then reverts', () => {
    // Arrange
    render(<CopyButton text="hello" label="Copiar" />);
    const btn = screen.getByRole('button');

    // Act
    fireEvent.click(btn);

    // Assert — wrote to clipboard
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('hello');
    expect(btn).toHaveTextContent('Copiado');

    // Act — advance past the 1800 ms revert timer
    act(() => {
      vi.advanceTimersByTime(1800);
    });

    // Assert — label restored
    expect(btn).toHaveTextContent('Copiar');
  });
});
