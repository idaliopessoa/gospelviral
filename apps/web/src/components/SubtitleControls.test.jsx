import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import SubtitleControls from './SubtitleControls.jsx';

const BASE = {
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

describe('SubtitleControls', () => {
  it('emits the patched config when the user toggles a checkbox', () => {
    // Arrange
    const setConfig = vi.fn();
    render(<SubtitleControls config={BASE} setConfig={setConfig} />);

    // Act — toggle "Versículos" off
    const scriptureToggle = screen.getByLabelText(/Versículos/);
    fireEvent.click(scriptureToggle);

    // Assert
    expect(setConfig).toHaveBeenCalledWith({ ...BASE, highlightScripture: false });
  });

  it('resets x and y to 0 when "Resetar posição" is pressed', () => {
    // Arrange
    const setConfig = vi.fn();
    render(<SubtitleControls config={{ ...BASE, x: 50, y: -20 }} setConfig={setConfig} />);

    // Act
    fireEvent.click(screen.getByRole('button', { name: /Resetar posição/ }));

    // Assert
    expect(setConfig).toHaveBeenCalledWith(
      expect.objectContaining({ x: 0, y: 0, position: 'bottom' }),
    );
  });

  it('updates the size when an S/M/L button is clicked', () => {
    // Arrange
    const setConfig = vi.fn();
    render(<SubtitleControls config={BASE} setConfig={setConfig} />);

    // Act
    fireEvent.click(screen.getByRole('button', { name: 'L' }));

    // Assert
    expect(setConfig).toHaveBeenCalledWith(expect.objectContaining({ size: 'L' }));
  });
});
