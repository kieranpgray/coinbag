import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SubscriptionForm } from '../SubscriptionForm';
import type { Subscription } from '@/types/domain';

const mockCategory = {
  id: '123e4567-e89b-12d3-a456-426614174111',
  userId: 'mock-user-id',
  name: 'Entertainment',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

vi.mock('@/data/categories/repo', () => ({
  createCategoriesRepository: () => ({
    list: vi.fn().mockResolvedValue({ data: [mockCategory], error: undefined }),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  }),
}));

vi.mock('@/features/categories/hooks', () => ({
  useCategories: () => ({
    data: [mockCategory],
    isLoading: false,
    refetch: vi.fn(),
  }),
}));

describe('SubscriptionForm', () => {
  const mockSubscription: Subscription = {
    id: '1',
    name: 'Netflix Subscription',
    amount: 19.99,
    frequency: 'monthly',
    chargeDate: '2024-01-01',
    nextDueDate: '2024-02-01',
    categoryId: mockCategory.id,
    notes: 'Streaming service',
  };

  it('renders form fields', () => {
    const onSubmit = vi.fn();

    render(<SubscriptionForm onSubmit={onSubmit} />);

    expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/amount/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/frequency/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/category/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/charge date/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/next due date/i)).toBeInTheDocument();
  });

  it('pre-fills form when editing subscription', () => {
    const onSubmit = vi.fn();

    render(<SubscriptionForm defaultValues={mockSubscription} onSubmit={onSubmit} />);

    expect(screen.getByDisplayValue('Netflix Subscription')).toBeInTheDocument();
    expect(screen.getByDisplayValue('19.99')).toBeInTheDocument();
  });

  it('validates required fields', async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();

    render(<SubscriptionForm onSubmit={onSubmit} />);

    const submitButton = screen.getByRole('button', { name: /save/i });
    await user.click(submitButton);

    // Form validation should prevent submission
    await waitFor(() => {
      expect(onSubmit).not.toHaveBeenCalled();
    });
  });

  it('validates amount is positive', async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();

    render(<SubscriptionForm onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText(/name/i), 'Test Subscription');
    await user.type(screen.getByLabelText(/amount/i), '-10');
    await user.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => {
      expect(onSubmit).not.toHaveBeenCalled();
    });
  });

  it('calls onSubmit with form data with default category', async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();

    render(<SubscriptionForm onSubmit={onSubmit} />);

    // Wait for form to be ready (categories loaded and default applied)
    await waitFor(() => {
      const submitButton = screen.getByRole('button', { name: /save/i });
      expect(submitButton).not.toBeDisabled();
    });

    await user.type(screen.getByLabelText(/name/i), 'Test Subscription');
    await user.type(screen.getByLabelText(/amount/i), '29.99');

    const submitButton = screen.getByRole('button', { name: /save/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        name: 'Test Subscription',
        amount: 29.99,
        frequency: 'monthly',
        chargeDate: expect.any(String),
        nextDueDate: expect.any(String),
        categoryId: mockCategory.id, // Should default to the available category
        notes: undefined,
      });
    });
  });
});
