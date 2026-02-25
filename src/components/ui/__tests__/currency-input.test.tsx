import { render, screen, fireEvent } from '@testing-library/react';
import { CurrencyInput } from '../currency-input';

describe('CurrencyInput', () => {
  it('displays formatted value correctly', () => {
    const mockOnChange = vi.fn();
    render(
      <CurrencyInput
        value={1000}
        onChange={mockOnChange}
        decimalPlaces={2}
      />
    );

    const input = screen.getByRole('textbox');
    expect(input).toHaveValue('1,000.00');
  });

  it('parses input correctly on blur', () => {
    const mockOnChange = vi.fn();
    render(
      <CurrencyInput
        value={1000}
        onChange={mockOnChange}
        decimalPlaces={2}
      />
    );

    const input = screen.getByRole('textbox');

    // Focus and change value
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: '2,500.50' } });

    // Blur to trigger parsing
    fireEvent.blur(input);

    expect(mockOnChange).toHaveBeenCalledWith(2500.5);
  });

  it('handles empty input correctly', () => {
    const mockOnChange = vi.fn();
    render(
      <CurrencyInput
        value={1000}
        onChange={mockOnChange}
        decimalPlaces={2}
      />
    );

    const input = screen.getByRole('textbox');

    // Focus and clear value
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: '' } });

    // Blur to trigger parsing
    fireEvent.blur(input);

    expect(mockOnChange).toHaveBeenCalledWith(undefined);
  });
});