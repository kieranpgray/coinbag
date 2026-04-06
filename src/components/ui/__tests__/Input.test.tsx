import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Input } from '../input';

describe('Input', () => {
  it('renders with placeholder', () => {
    render(<Input placeholder="Type here" />);
    expect(screen.getByPlaceholderText('Type here')).toBeInTheDocument();
  });

  it('applies error styling when aria-invalid is boolean true', () => {
    render(<Input aria-invalid={true} />);
    const el = screen.getByRole('textbox');
    expect(el).toHaveAttribute('aria-invalid', 'true');
    expect(el.className).toMatch(/danger|rgba\(192,57,43/);
  });
});
