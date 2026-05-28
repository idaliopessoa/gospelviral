import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import VideoControls from './VideoControls.jsx';

const BASE = { x: 0, y: 0, scale: 1.0 };

describe('VideoControls', () => {
  it('displays the current scale with two decimals', () => {
    // Arrange + Act
    render(<VideoControls config={{ ...BASE, scale: 1.25 }} setConfig={() => {}} />);

    // Assert
    expect(screen.getByText('1.25×')).toBeInTheDocument();
  });

  it('emits parsed float scale on slider change', () => {
    // Arrange
    const setConfig = vi.fn();
    render(<VideoControls config={BASE} setConfig={setConfig} />);

    // Act
    fireEvent.change(screen.getByLabelText('Escala do vídeo'), { target: { value: '2.5' } });

    // Assert
    expect(setConfig).toHaveBeenCalledWith({ ...BASE, scale: 2.5 });
  });

  it('resets x/y/scale on "Resetar" click', () => {
    // Arrange
    const setConfig = vi.fn();
    render(
      <VideoControls config={{ x: 100, y: -50, scale: 2.0 }} setConfig={setConfig} />,
    );

    // Act
    fireEvent.click(screen.getByRole('button', { name: /Resetar/ }));

    // Assert
    expect(setConfig).toHaveBeenCalledWith({ x: 0, y: 0, scale: 1.0 });
  });
});
