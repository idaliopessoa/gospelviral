import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ConfigPanel from './ConfigPanel.jsx';

const VIDEO_SOURCE = {
  id: '11111111-1111-1111-1111-111111111111',
  filename: 'pregacao.mp4',
  sizeBytes: 1234,
  mimeType: 'video/mp4',
  uploadedAt: '2026-05-29T00:00:00.000Z',
};

const BASE_PROPS = {
  subtitleConfig: {
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
  },
  setSubtitleConfig: () => {},
  videoConfig: { x: 0, y: 0, scale: 1 },
  setVideoConfig: () => {},
  overlayConfig: { dataURL: null, opacity: 1, filename: null },
  setOverlayConfig: () => {},
  videoSource: null,
  setVideoSource: vi.fn(),
  activeTab: 'subtitle',
  setActiveTab: vi.fn(),
  isCollapsed: false,
  setIsCollapsed: vi.fn(),
};

describe('ConfigPanel', () => {
  it('renders the four tabs and the global config caption', () => {
    // Arrange + Act
    render(<ConfigPanel {...BASE_PROPS} />);

    // Assert
    expect(screen.getByRole('button', { name: 'Legenda' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Vídeo' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Overlay' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Vídeo Fonte' })).toBeInTheDocument();
    expect(screen.getByText(/aplica aos 5/)).toBeInTheDocument();
  });

  it('shows SubtitleControls under the subtitle tab', () => {
    // Arrange + Act
    render(<ConfigPanel {...BASE_PROPS} activeTab="subtitle" />);

    // Assert — a Subtitle-only label
    expect(screen.getByText(/Versículos/)).toBeInTheDocument();
  });

  it('switches to the video tab when the Vídeo tab button is pressed', () => {
    // Arrange
    const setActiveTab = vi.fn();
    render(<ConfigPanel {...BASE_PROPS} setActiveTab={setActiveTab} />);

    // Act — exact name so it does not also match "Vídeo Fonte"
    fireEvent.click(screen.getByRole('button', { name: 'Vídeo' }));

    // Assert
    expect(setActiveTab).toHaveBeenCalledWith('video');
  });

  it('switches to the video-source tab when the Vídeo Fonte tab button is pressed', () => {
    // Arrange
    const setActiveTab = vi.fn();
    render(<ConfigPanel {...BASE_PROPS} setActiveTab={setActiveTab} />);

    // Act
    fireEvent.click(screen.getByRole('button', { name: 'Vídeo Fonte' }));

    // Assert
    expect(setActiveTab).toHaveBeenCalledWith('video-source');
  });

  it('renders the VideoUploadButton (EMPTY) under the video-source tab', () => {
    // Arrange + Act
    render(<ConfigPanel {...BASE_PROPS} activeTab="video-source" />);

    // Assert
    expect(screen.getByText(/Subir vídeo do trecho/i)).toBeInTheDocument();
  });

  it('shows the video badge in the header strip when a videoSource is present', () => {
    // Arrange + Act
    render(<ConfigPanel {...BASE_PROPS} videoSource={VIDEO_SOURCE} />);

    // Assert — badge names the active file
    expect(screen.getByTestId('video-source-badge')).toHaveTextContent('pregacao.mp4');
  });

  it('omits the video badge when there is no videoSource', () => {
    // Arrange + Act
    render(<ConfigPanel {...BASE_PROPS} videoSource={null} />);

    // Assert
    expect(screen.queryByTestId('video-source-badge')).not.toBeInTheDocument();
  });

  it('expands the panel when a tab is pressed while collapsed', () => {
    // Arrange
    const setIsCollapsed = vi.fn();
    render(
      <ConfigPanel {...BASE_PROPS} isCollapsed setIsCollapsed={setIsCollapsed} />,
    );

    // Act
    fireEvent.click(screen.getByRole('button', { name: 'Legenda' }));

    // Assert
    expect(setIsCollapsed).toHaveBeenCalledWith(false);
  });

  it('toggles collapsed state when the collapse button is pressed', () => {
    // Arrange
    const setIsCollapsed = vi.fn();
    render(<ConfigPanel {...BASE_PROPS} setIsCollapsed={setIsCollapsed} />);

    // Act
    fireEvent.click(screen.getByRole('button', { name: /Recolher/ }));

    // Assert
    expect(setIsCollapsed).toHaveBeenCalledWith(true);
  });

  it('hides the controls body when collapsed', () => {
    // Arrange + Act
    render(<ConfigPanel {...BASE_PROPS} isCollapsed />);

    // Assert — subtitle-specific label gone
    expect(screen.queryByText(/Versículos/)).not.toBeInTheDocument();
  });

  it('keeps the header badge visible even when collapsed', () => {
    // Arrange + Act
    render(<ConfigPanel {...BASE_PROPS} videoSource={VIDEO_SOURCE} isCollapsed />);

    // Assert — the badge is in the always-visible header strip
    expect(screen.getByTestId('video-source-badge')).toHaveTextContent('pregacao.mp4');
  });
});
