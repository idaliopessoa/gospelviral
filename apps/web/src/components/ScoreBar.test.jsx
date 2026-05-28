import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ScoreBar from './ScoreBar.jsx';

describe('ScoreBar', () => {
  it('renders the label and the score with a single decimal', () => {
    // Arrange + Act
    render(<ScoreBar label="Hook" score={8.74} accent="#B95D3F" />);

    // Assert
    expect(screen.getByText('Hook')).toBeInTheDocument();
    expect(screen.getByText('8.7')).toBeInTheDocument();
  });

  it('translates the score into a percentage width on the fill element', () => {
    // Arrange + Act
    const { container } = render(<ScoreBar label="x" score={7.5} accent="#0f0" />);
    const fill = container.querySelector('.h-full');

    // Assert
    expect(fill).toHaveStyle({ width: '75%', backgroundColor: '#0f0' });
  });
});
