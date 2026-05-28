import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ModeBadge from './ModeBadge.jsx';

describe('ModeBadge', () => {
  it('shows "via Claude Code CLI" when currentMode is cli', () => {
    // Arrange + Act
    render(
      <ModeBadge
        currentMode="cli"
        forcedMode="auto"
        setForcedMode={() => {}}
        refresh={() => {}}
        loading={false}
      />,
    );

    // Assert
    expect(screen.getByRole('button', { name: /Alternar runtime/ })).toHaveTextContent(
      /via Claude Code CLI/,
    );
  });

  it('shows "via API key" when currentMode is api', () => {
    // Arrange + Act
    render(
      <ModeBadge
        currentMode="api"
        forcedMode="api"
        setForcedMode={() => {}}
        refresh={() => {}}
        loading={false}
      />,
    );

    // Assert
    expect(screen.getByText(/via API key/)).toBeInTheDocument();
  });

  it('shows "sem runtime" when currentMode is none', () => {
    // Arrange + Act
    render(
      <ModeBadge
        currentMode="none"
        forcedMode="auto"
        setForcedMode={() => {}}
        refresh={() => {}}
        loading={false}
      />,
    );

    // Assert
    expect(screen.getByText(/sem runtime/)).toBeInTheDocument();
  });

  it('opens the popover on click and emits setForcedMode when a radio is picked', () => {
    // Arrange
    const setForcedMode = vi.fn();
    render(
      <ModeBadge
        currentMode="cli"
        forcedMode="auto"
        setForcedMode={setForcedMode}
        refresh={() => {}}
        loading={false}
      />,
    );

    // Act
    fireEvent.click(screen.getByRole('button', { name: /Alternar runtime/ }));
    fireEvent.click(screen.getByLabelText('Claude Code CLI'));

    // Assert
    expect(setForcedMode).toHaveBeenCalledWith('cli');
  });

  it('emits refresh() when the popover Re-detectar button is pressed', () => {
    // Arrange
    const refresh = vi.fn();
    render(
      <ModeBadge
        currentMode="cli"
        forcedMode="auto"
        setForcedMode={() => {}}
        refresh={refresh}
        loading={false}
      />,
    );

    // Act
    fireEvent.click(screen.getByRole('button', { name: /Alternar runtime/ }));
    fireEvent.click(screen.getByRole('button', { name: /Re-detectar/ }));

    // Assert
    expect(refresh).toHaveBeenCalledOnce();
  });
});
