import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App.jsx';

describe('scaffold: App', () => {
  it('renders the Viral Cristão heading', () => {
    // Arrange
    render(<App />);

    // Act
    const heading = screen.getByRole('heading', { level: 1 });

    // Assert
    expect(heading).toHaveTextContent('Viral Cristão');
  });

  it('imports cleanly from @gospelviral/shared', async () => {
    // Arrange + Act
    const shared = await import('@gospelviral/shared');

    // Assert
    expect(shared).toBeDefined();
  });
});
