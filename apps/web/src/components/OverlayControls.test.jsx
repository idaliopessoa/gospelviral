import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import OverlayControls from './OverlayControls.jsx';

const EMPTY = { dataURL: null, opacity: 1.0, filename: null };
const LOADED = { dataURL: 'data:image/png;base64,AAA', opacity: 0.5, filename: 'overlay.png' };

describe('OverlayControls', () => {
  it('shows the upload dropzone when no overlay is loaded', () => {
    // Arrange + Act
    render(<OverlayControls config={EMPTY} setConfig={() => {}} />);

    // Assert
    expect(screen.getByText(/Enviar PNG com área vazada/)).toBeInTheDocument();
  });

  it('shows the active overlay summary when one is loaded', () => {
    // Arrange + Act
    render(<OverlayControls config={LOADED} setConfig={() => {}} />);

    // Assert
    expect(screen.getByText('overlay.png')).toBeInTheDocument();
    expect(screen.getByText('overlay ativo')).toBeInTheDocument();
    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  it('clears the config when "Remover" is pressed', () => {
    // Arrange
    const setConfig = vi.fn();
    render(<OverlayControls config={LOADED} setConfig={setConfig} />);

    // Act
    fireEvent.click(screen.getByRole('button', { name: 'Remover' }));

    // Assert
    expect(setConfig).toHaveBeenCalledWith({ dataURL: null, opacity: 1.0, filename: null });
  });

  it('emits float opacity on slider change', () => {
    // Arrange
    const setConfig = vi.fn();
    render(<OverlayControls config={LOADED} setConfig={setConfig} />);

    // Act
    fireEvent.change(screen.getByLabelText('Opacidade do overlay'), { target: { value: '0.25' } });

    // Assert
    expect(setConfig).toHaveBeenCalledWith({ ...LOADED, opacity: 0.25 });
  });
});
