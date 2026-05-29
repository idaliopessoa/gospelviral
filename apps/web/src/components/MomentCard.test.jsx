import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import MomentCard from './MomentCard.jsx';
import { EXAMPLE_RESPONSE, EXAMPLE_TRANSCRIPT } from '@gospelviral/shared';

const MOMENT = EXAMPLE_RESPONSE.top_moments[0];

const SUB = {
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

const BASE_PROPS = {
  moment: MOMENT,
  videoId: 'abc123',
  subtitleConfig: SUB,
  videoConfig: { x: 0, y: 0, scale: 1 },
  overlayConfig: { dataURL: null, opacity: 1, filename: null },
  transcript: EXAMPLE_TRANSCRIPT,
  activeCardTab: 'redes-sociais',
  onActiveCardTabChange: vi.fn(),
  index: 0,
};

beforeEach(() => {
  BASE_PROPS.onActiveCardTabChange = vi.fn();
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

describe('MomentCard', () => {
  it('renders the moment hook title, viral score and caption text (default tab)', () => {
    // Arrange + Act
    const { container } = render(<MomentCard {...BASE_PROPS} />);

    // Assert
    expect(screen.getByText(MOMENT.hook_title)).toBeInTheDocument();
    expect(screen.getByText('8.7')).toBeInTheDocument();
    expect(container.textContent).toContain('Três horas da manhã. Chão do quarto.');
    expect(container.textContent).toContain(MOMENT.cta.primary);
  });

  it('renders hashtags split into individual tags (default tab)', () => {
    // Arrange + Act
    const { container } = render(<MomentCard {...BASE_PROPS} />);

    // Assert
    const expected = MOMENT.hashtags.all.split(' ').filter(Boolean);
    for (const tag of expected) {
      expect(container.textContent).toContain(tag);
    }
  });

  it('marks the moment as cold open when cold_open_analysis.decision === "apply_cold_open"', () => {
    // Arrange + Act
    render(<MomentCard {...BASE_PROPS} />);

    // Assert
    expect(screen.getAllByText(/Cold open/).length).toBeGreaterThanOrEqual(1);
  });

  it('formats the YouTube deep-link with start-second offset', () => {
    // Arrange + Act
    render(<MomentCard {...BASE_PROPS} />);

    // Assert — moment 1 starts at 01:08 = 68 s
    const link = screen.getByRole('link', { name: /ver no YouTube/ });
    expect(link).toHaveAttribute('href', 'https://youtube.com/watch?v=abc123&t=68s');
  });

  it('renders a red-flag badge when theological_check.red_flags is non-empty and != "nenhuma"', () => {
    // Arrange
    const flagged = {
      ...MOMENT,
      theological_check: { ...MOMENT.theological_check, red_flags: ['heresia'] },
    };

    // Act
    render(<MomentCard {...BASE_PROPS} moment={flagged} />);

    // Assert
    expect(screen.getByText(/Red flag/)).toBeInTheDocument();
  });

  it('tolerates score_breakdown entries as raw numbers (readScore fallback)', () => {
    // Arrange
    const flat = {
      ...MOMENT,
      score_breakdown: {
        emotional_resonance: 7.5,
        information_value: 8,
        story_quality: 6,
        shareability: 7,
        controversy_potential: 3,
        hook_strength: 9,
      },
    };

    // Act — should not throw
    expect(() => render(<MomentCard {...BASE_PROPS} moment={flat} index={1} />)).not.toThrow();

    // Assert
    expect(screen.getAllByText('7.5').length).toBeGreaterThan(0);
  });

  it('renders the two card tabs above the score breakdown details', () => {
    // Arrange + Act
    render(<MomentCard {...BASE_PROPS} />);

    // Assert — both tab buttons present
    expect(screen.getByRole('tab', { name: /Redes Sociais/ })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Legenda do Vídeo/ })).toBeInTheDocument();
    // Score breakdown details still rendered (collapsible)
    expect(screen.getByText(/Score breakdown · theological check/i)).toBeInTheDocument();
  });

  it('default activeCardTab="redes-sociais" tab body shows caption + hashtags + CTA, not the transcript line list', () => {
    // Arrange + Act
    const { container } = render(<MomentCard {...BASE_PROPS} />);

    // Assert
    expect(container.textContent).toContain('Três horas da manhã. Chão do quarto.'); // caption
    expect(container.textContent).toContain(MOMENT.cta.primary);
    // The Legenda do Vídeo line list lives in the OTHER tab body — not in the
    // active redes-sociais tabpanel. (The transcript text also legitimately
    // appears in the preview subtitle now that it is cue-driven, so scope the
    // negative assertion to the active tabpanel.)
    const tabpanel = container.querySelector('[role="tabpanel"]');
    expect(tabpanel.textContent).not.toContain('eu fiz uma oração que mudou tudo');
  });

  it('activeCardTab="legenda-video" shows the transcript text sliced between timestamp_start and timestamp_end (no timecodes) + Copiar button', () => {
    // Arrange + Act
    const { container } = render(
      <MomentCard {...BASE_PROPS} activeCardTab="legenda-video" />,
    );

    // Assert — legenda body contains a line from the [01:08, 02:15) range
    expect(container.textContent).toContain('eu fiz uma oração que mudou tudo');
    // Timecodes stripped
    expect(container.textContent).not.toMatch(/\b01:08\s+E/);
    // Copy button present in legenda body
    expect(screen.getAllByRole('button', { name: /Copiar/ }).length).toBeGreaterThan(0);
  });

  it('clicking the inactive tab invokes onActiveCardTabChange with the next id', () => {
    // Arrange
    const onActiveCardTabChange = vi.fn();
    render(
      <MomentCard {...BASE_PROPS} onActiveCardTabChange={onActiveCardTabChange} />,
    );

    // Act
    fireEvent.click(screen.getByRole('tab', { name: /Legenda do Vídeo/ }));

    // Assert
    expect(onActiveCardTabChange).toHaveBeenCalledWith('legenda-video');
  });

  it('renders one paragraph per transcript cue in the legenda tab (line-per-cue, not joined)', () => {
    // Arrange + Act
    const { container } = render(
      <MomentCard {...BASE_PROPS} activeCardTab="legenda-video" />,
    );

    // Assert — the legenda body container has multiple <p> children, one per cue
    const legendaBody = container.querySelector('[role="tabpanel"] .space-y-2 .bg-stone-50');
    expect(legendaBody).toBeTruthy();
    const paragraphs = legendaBody.querySelectorAll('p');
    expect(paragraphs.length).toBeGreaterThan(1);
  });

  it('renders "Transcript indisponível" fallback when transcript is empty in the legenda tab', () => {
    // Arrange + Act
    render(
      <MomentCard {...BASE_PROPS} transcript="" activeCardTab="legenda-video" />,
    );

    // Assert
    expect(screen.getByText(/Transcript indispon[ií]vel/i)).toBeInTheDocument();
  });
});
