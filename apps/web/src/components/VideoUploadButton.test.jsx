import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import VideoUploadButton from './VideoUploadButton.jsx';
import { UploadError } from '../lib/upload.js';

const VIDEO_SOURCE = {
  id: '11111111-1111-1111-1111-111111111111',
  filename: 'pregacao-domingo.mp4',
  sizeBytes: 847_300_000,
  mimeType: 'video/mp4',
  uploadedAt: '2026-05-29T00:00:00.000Z',
};

function makeFile(name = 'pregacao.avi', type = 'video/x-msvideo') {
  return new File([new Blob(['bytes'])], name, { type });
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('VideoUploadButton', () => {
  it('EMPTY state renders the CTA, supporting copy, and a file input', () => {
    // Arrange + Act
    const { container } = render(
      <VideoUploadButton videoSource={null} onChange={vi.fn()} />,
    );

    // Assert
    expect(screen.getByText(/Subir vídeo do trecho/i)).toBeInTheDocument();
    expect(container.querySelector('input[type="file"]')).toBeTruthy();
    // EMPTY container carries a min-height token (action-first surface)
    const emptyZone = container.querySelector('[data-upload-state="empty"]');
    expect(emptyZone).toBeTruthy();
    expect(emptyZone.className).toMatch(/min-h-\[160px\]/);
  });

  it('FILLED state shows filename + adaptive size + Remover, and hides the CTA', () => {
    // Arrange + Act
    const { container } = render(
      <VideoUploadButton videoSource={VIDEO_SOURCE} onChange={vi.fn()} />,
    );

    // Assert — adaptive size: 847_300_000 B < 1 GiB → MB
    expect(screen.getByText(/pregacao-domingo\.mp4/)).toBeInTheDocument();
    expect(screen.getByText(/808\.[0-9] MB/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /remover/i })).toBeInTheDocument();
    expect(screen.queryByText(/Subir vídeo do trecho/i)).not.toBeInTheDocument();
    // FILLED container does NOT carry the big min-height token
    const filledLine = container.querySelector('[data-upload-state="filled"]');
    expect(filledLine).toBeTruthy();
    expect(filledLine.className).not.toMatch(/min-h-\[160px\]/);
  });

  it('size display switches to GB at or above 1 GiB', () => {
    // Arrange
    const big = { ...VIDEO_SOURCE, sizeBytes: 1_503_238_553 }; // ~1.4 GiB

    // Act
    render(<VideoUploadButton videoSource={big} onChange={vi.fn()} />);

    // Assert
    expect(screen.getByText(/1\.[0-9] GB/)).toBeInTheDocument();
  });

  it('clicking Remover calls onChange(null)', () => {
    // Arrange
    const onChange = vi.fn();
    render(<VideoUploadButton videoSource={VIDEO_SOURCE} onChange={onChange} />);

    // Act
    fireEvent.click(screen.getByRole('button', { name: /remover/i }));

    // Assert
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it('picking a file uploads it, shows real progress, then calls onChange(videoSource)', async () => {
    // Arrange — uploadImpl reports 50% then stays pending until we resolve
    let resolveUpload;
    const uploadImpl = vi.fn((file, { onProgress }) => {
      onProgress(0.5);
      return new Promise((r) => {
        resolveUpload = () => r(VIDEO_SOURCE);
      });
    });
    const onChange = vi.fn();
    const { container } = render(
      <VideoUploadButton videoSource={null} onChange={onChange} uploadImpl={uploadImpl} />,
    );

    // Act — pick a valid mp4
    const input = container.querySelector('input[type="file"]');
    fireEvent.change(input, {
      target: { files: [makeFile('ok.mp4', 'video/mp4')] },
    });

    // Assert — progress readout visible while pending
    expect(await screen.findByText(/Enviando.*50%/)).toBeInTheDocument();
    expect(uploadImpl).toHaveBeenCalledTimes(1);

    // Act — settle
    resolveUpload();

    // Assert
    await waitFor(() => expect(onChange).toHaveBeenCalledWith(VIDEO_SOURCE));
  });

  it('on a rejected upload shows an inline error naming the file and does NOT call onChange', async () => {
    // Arrange
    const uploadImpl = vi.fn(() =>
      Promise.reject(new UploadError('invalid_mime_type', 'mime not allowed')),
    );
    const onChange = vi.fn();
    const { container } = render(
      <VideoUploadButton videoSource={null} onChange={onChange} uploadImpl={uploadImpl} />,
    );

    // Act
    const input = container.querySelector('input[type="file"]');
    fireEvent.change(input, { target: { files: [makeFile('pregacao.avi')] } });

    // Assert
    expect(
      await screen.findByText(/pregacao\.avi não é suportado\. Use MP4, MOV ou WebM\./i),
    ).toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('dropping a file behaves identically to picking via the input', async () => {
    // Arrange
    const uploadImpl = vi.fn(() => Promise.resolve(VIDEO_SOURCE));
    const onChange = vi.fn();
    const { container } = render(
      <VideoUploadButton videoSource={null} onChange={onChange} uploadImpl={uploadImpl} />,
    );
    const zone = container.querySelector('[data-upload-state="empty"]');

    // Act — simulate a drop
    fireEvent.drop(zone, {
      dataTransfer: { files: [makeFile('dropped.mp4', 'video/mp4')] },
    });

    // Assert
    await waitFor(() => expect(onChange).toHaveBeenCalledWith(VIDEO_SOURCE));
    expect(uploadImpl).toHaveBeenCalledTimes(1);
  });
});
