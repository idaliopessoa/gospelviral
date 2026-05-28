import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import NumberField from './NumberField.jsx';

describe('NumberField', () => {
  it('shows the label, value and suffix', () => {
    // Arrange + Act
    render(<NumberField label="Offset X" value={120} onChange={() => {}} suffix="px" />);

    // Assert
    expect(screen.getByText('Offset X')).toBeInTheDocument();
    expect(screen.getByRole('spinbutton')).toHaveValue(120);
    expect(screen.getByText('px')).toBeInTheDocument();
  });

  it('emits parsed integers on change', () => {
    // Arrange
    const onChange = vi.fn();
    render(<NumberField label="x" value={0} onChange={onChange} />);

    // Act
    fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '42' } });

    // Assert
    expect(onChange).toHaveBeenCalledWith(42);
  });

  it('emits 0 when the value is unparseable', () => {
    // Arrange
    const onChange = vi.fn();
    render(<NumberField label="x" value={0} onChange={onChange} />);

    // Act
    fireEvent.change(screen.getByRole('spinbutton'), { target: { value: 'abc' } });

    // Assert
    expect(onChange).toHaveBeenCalledWith(0);
  });
});
