import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import App from './App.jsx';

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
});

describe('App', () => {
  it('starts on the input view with the artifact heading and CTA buttons', () => {
    // Arrange + Act
    render(<App />);

    // Assert
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      /Cole o vídeo e a/,
    );
    expect(
      screen.getByRole('button', { name: /Analisar momentos virais/ }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Ver exemplo pronto/ })).toBeInTheDocument();
  });

  it('"Ver exemplo pronto" populates inputs and transitions to results', () => {
    // Arrange
    render(<App />);

    // Act
    fireEvent.click(screen.getByRole('button', { name: /Ver exemplo pronto/ }));

    // Assert — header has the "Nova análise" back button (results view only)
    expect(screen.getByRole('button', { name: /Nova análise/ })).toBeInTheDocument();
    // And the results header is present
    expect(screen.getByText('Resultado da análise')).toBeInTheDocument();
  });

  it('"Nova análise" returns to the input view and clears results', () => {
    // Arrange
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /Ver exemplo pronto/ }));

    // Act
    fireEvent.click(screen.getByRole('button', { name: /Nova análise/ }));

    // Assert
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      /Cole o vídeo e a/,
    );
    expect(screen.queryByText('Resultado da análise')).not.toBeInTheDocument();
  });

  it('clicking "Legenda do Vídeo" tab on one card switches all 5 cards (global lift)', () => {
    // Arrange — example load brings 5 moments into the results view
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /Ver exemplo pronto/ }));

    // Initial state: 5 "Redes Sociais" tabs selected, 5 "Legenda do Vídeo" tabs unselected
    const initialRedes = screen.getAllByRole('tab', { name: /Redes Sociais/ });
    const initialLegenda = screen.getAllByRole('tab', { name: /Legenda do Vídeo/ });
    expect(initialRedes).toHaveLength(5);
    expect(initialLegenda).toHaveLength(5);
    for (const t of initialRedes) expect(t).toHaveAttribute('aria-selected', 'true');
    for (const t of initialLegenda) expect(t).toHaveAttribute('aria-selected', 'false');

    // Act — click Legenda tab on the FIRST card only
    fireEvent.click(initialLegenda[0]);

    // Assert — ALL five cards now show Legenda as selected (proves global lift)
    const afterRedes = screen.getAllByRole('tab', { name: /Redes Sociais/ });
    const afterLegenda = screen.getAllByRole('tab', { name: /Legenda do Vídeo/ });
    for (const t of afterRedes) expect(t).toHaveAttribute('aria-selected', 'false');
    for (const t of afterLegenda) expect(t).toHaveAttribute('aria-selected', 'true');
  });
});
