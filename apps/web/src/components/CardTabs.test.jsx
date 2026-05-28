import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import CardTabs from './CardTabs.jsx';

const TABS = [
  { id: 'redes-sociais', label: 'Redes Sociais', body: <p>body redes</p> },
  { id: 'legenda-video', label: 'Legenda do Vídeo', body: <p>body legenda</p> },
];

describe('CardTabs', () => {
  it('renders the body that matches the activeTab prop', () => {
    // Arrange + Act
    render(
      <CardTabs activeTab="redes-sociais" onActiveTabChange={vi.fn()} tabs={TABS} />,
    );

    // Assert
    expect(screen.getByText('body redes')).toBeInTheDocument();
    expect(screen.queryByText('body legenda')).not.toBeInTheDocument();
  });

  it('clicking an inactive tab invokes onActiveTabChange with the next id', () => {
    // Arrange
    const onActiveTabChange = vi.fn();
    render(
      <CardTabs
        activeTab="redes-sociais"
        onActiveTabChange={onActiveTabChange}
        tabs={TABS}
      />,
    );

    // Act
    fireEvent.click(screen.getByRole('tab', { name: /Legenda do Vídeo/ }));

    // Assert
    expect(onActiveTabChange).toHaveBeenCalledWith('legenda-video');
  });

  it('aria-selected reflects the controlled activeTab prop', () => {
    // Arrange + Act
    const { rerender } = render(
      <CardTabs activeTab="redes-sociais" onActiveTabChange={vi.fn()} tabs={TABS} />,
    );

    // Assert — initial
    expect(screen.getByRole('tab', { name: /Redes Sociais/ })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.getByRole('tab', { name: /Legenda do Vídeo/ })).toHaveAttribute(
      'aria-selected',
      'false',
    );

    // Act — controlled re-render
    rerender(
      <CardTabs activeTab="legenda-video" onActiveTabChange={vi.fn()} tabs={TABS} />,
    );

    // Assert — flipped
    expect(screen.getByRole('tab', { name: /Redes Sociais/ })).toHaveAttribute(
      'aria-selected',
      'false',
    );
    expect(screen.getByRole('tab', { name: /Legenda do Vídeo/ })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.getByText('body legenda')).toBeInTheDocument();
  });

  it('renders ARIA tablist with N tabs and exactly one tabpanel', () => {
    // Arrange + Act
    render(
      <CardTabs activeTab="redes-sociais" onActiveTabChange={vi.fn()} tabs={TABS} />,
    );

    // Assert
    expect(screen.getByRole('tablist')).toBeInTheDocument();
    expect(screen.getAllByRole('tab')).toHaveLength(TABS.length);
    expect(screen.getAllByRole('tabpanel')).toHaveLength(1);
  });

  it('clicking the already-active tab does not invoke onActiveTabChange', () => {
    // Arrange
    const onActiveTabChange = vi.fn();
    render(
      <CardTabs
        activeTab="redes-sociais"
        onActiveTabChange={onActiveTabChange}
        tabs={TABS}
      />,
    );

    // Act
    fireEvent.click(screen.getByRole('tab', { name: /Redes Sociais/ }));

    // Assert
    expect(onActiveTabChange).not.toHaveBeenCalled();
  });
});
