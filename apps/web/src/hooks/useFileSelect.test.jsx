import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { useFileSelect } from './useFileSelect.js';

function makeFile(name = 'a.png', type = 'image/png') {
  return new File([new Blob(['bytes'])], name, { type });
}

// Minimal harness exercising the hook's public surface.
function Harness({ accept, onFile }) {
  const { isDragging, open, inputProps, zoneProps } = useFileSelect({ accept, onFile });
  return (
    <div>
      <button type="button" data-testid="zone" {...zoneProps}>
        zone {isDragging ? 'dragging' : 'idle'}
      </button>
      <button type="button" data-testid="open" onClick={open}>
        open
      </button>
      <input data-testid="input" {...inputProps} />
    </div>
  );
}

describe('useFileSelect', () => {
  it('open() clicks the underlying file input (reliable picker, not a label)', () => {
    // Arrange
    render(<Harness onFile={vi.fn()} />);
    const input = screen.getByTestId('input');
    const clickSpy = vi.spyOn(input, 'click').mockImplementation(() => {});

    // Act
    fireEvent.click(screen.getByTestId('open'));

    // Assert
    expect(clickSpy).toHaveBeenCalledTimes(1);
  });

  it('passes accept through to the input', () => {
    // Arrange + Act
    render(<Harness accept="image/png,image/*" onFile={vi.fn()} />);

    // Assert
    expect(screen.getByTestId('input')).toHaveAttribute('accept', 'image/png,image/*');
  });

  it('change fires onFile with the picked file and resets the input value', () => {
    // Arrange
    const onFile = vi.fn();
    render(<Harness onFile={onFile} />);
    const input = screen.getByTestId('input');

    // Act
    fireEvent.change(input, { target: { files: [makeFile('x.png')] } });

    // Assert
    expect(onFile).toHaveBeenCalledTimes(1);
    expect(onFile.mock.calls[0][0].name).toBe('x.png');
    expect(input.value).toBe(''); // reset → re-selecting the same file fires again
  });

  it('change with no file does not call onFile', () => {
    // Arrange
    const onFile = vi.fn();
    render(<Harness onFile={onFile} />);

    // Act
    fireEvent.change(screen.getByTestId('input'), { target: { files: [] } });

    // Assert
    expect(onFile).not.toHaveBeenCalled();
  });

  it('drop forwards the file and prevents the browser default (no navigation)', () => {
    // Arrange
    const onFile = vi.fn();
    render(<Harness onFile={onFile} />);
    const zone = screen.getByTestId('zone');
    const preventDefault = vi.fn();

    // Act
    fireEvent.drop(zone, {
      preventDefault,
      dataTransfer: { files: [makeFile('dropped.png')] },
    });

    // Assert
    expect(onFile).toHaveBeenCalledTimes(1);
    expect(onFile.mock.calls[0][0].name).toBe('dropped.png');
  });

  it('dragover sets isDragging true; dragleave resets it', () => {
    // Arrange
    render(<Harness onFile={vi.fn()} />);
    const zone = screen.getByTestId('zone');

    // Act + Assert — dragover
    fireEvent.dragOver(zone);
    expect(zone).toHaveTextContent('dragging');

    // Act + Assert — dragleave
    fireEvent.dragLeave(zone);
    expect(zone).toHaveTextContent('idle');
  });

  it('a drop with no files does not call onFile', () => {
    // Arrange
    const onFile = vi.fn();
    render(<Harness onFile={onFile} />);

    // Act
    fireEvent.drop(screen.getByTestId('zone'), { dataTransfer: { files: [] } });

    // Assert
    expect(onFile).not.toHaveBeenCalled();
  });
});
