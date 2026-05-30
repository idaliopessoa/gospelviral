import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import OverlayControls from './OverlayControls.jsx';

const EMPTY = { dataURL: null, opacity: 1.0, filename: null };
const LOADED = { dataURL: 'data:image/png;base64,AAA', opacity: 0.5, filename: 'overlay.png' };

function makeFile(name = 'overlay.png', type = 'image/png') {
  return new File([new Blob(['bytes'])], name, { type });
}

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

  it('clicking the dropzone opens the OS file picker (ref.click, not label fall-through) (TASK_021)', () => {
    // Arrange
    const { container } = render(<OverlayControls config={EMPTY} setConfig={() => {}} />);
    const input = container.querySelector('input[type="file"]');
    const clickSpy = vi.spyOn(input, 'click').mockImplementation(() => {});

    // Act
    fireEvent.click(screen.getByRole('button', { name: /Enviar PNG/i }));

    // Assert
    expect(clickSpy).toHaveBeenCalledTimes(1);
  });

  it('picking a PNG applies it as the overlay', async () => {
    // Arrange
    const setConfig = vi.fn();
    const { container } = render(<OverlayControls config={EMPTY} setConfig={setConfig} />);

    // Act
    fireEvent.change(container.querySelector('input[type="file"]'), {
      target: { files: [makeFile('cutout.png')] },
    });

    // Assert — FileReader is async
    await waitFor(() =>
      expect(setConfig).toHaveBeenCalledWith(
        expect.objectContaining({ filename: 'cutout.png', opacity: 1, dataURL: expect.stringMatching(/^data:/) }),
      ),
    );
  });

  it('dropping a PNG applies it as the overlay (no browser navigation)', async () => {
    // Arrange
    const setConfig = vi.fn();
    render(<OverlayControls config={EMPTY} setConfig={setConfig} />);

    // Act
    fireEvent.drop(screen.getByRole('button', { name: /Enviar PNG|Solte o PNG/i }), {
      dataTransfer: { files: [makeFile('dropped.png')] },
    });

    // Assert
    await waitFor(() =>
      expect(setConfig).toHaveBeenCalledWith(
        expect.objectContaining({ filename: 'dropped.png', opacity: 1 }),
      ),
    );
  });

  it('rejects a non-image with an inline error and does not apply', () => {
    // Arrange
    const setConfig = vi.fn();
    const { container } = render(<OverlayControls config={EMPTY} setConfig={setConfig} />);

    // Act
    fireEvent.change(container.querySelector('input[type="file"]'), {
      target: { files: [makeFile('notes.pdf', 'application/pdf')] },
    });

    // Assert
    expect(screen.getByText(/Selecione uma imagem/i)).toBeInTheDocument();
    expect(setConfig).not.toHaveBeenCalled();
  });

  it('highlights the dropzone while dragging a file over it', () => {
    // Arrange
    render(<OverlayControls config={EMPTY} setConfig={() => {}} />);
    const zone = screen.getByRole('button', { name: /Enviar PNG/i });

    // Act
    fireEvent.dragOver(zone);

    // Assert — copy flips to the drop prompt
    expect(screen.getByText(/Solte o PNG aqui/i)).toBeInTheDocument();
  });
});
