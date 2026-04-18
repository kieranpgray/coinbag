import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DeleteCategoryDialog } from '../components/DeleteCategoryDialog';
import * as categoriesHooks from '../hooks';

// Mock the hooks
vi.mock('../hooks');

describe('DeleteCategoryDialog', () => {
  let queryClient: QueryClient;
  const mockOnOpenChange = vi.fn();
  const mockMutateAsync = vi.fn();

  const mockCategoryId = '00000000-0000-4000-8000-000000000099';

  const mockCategory = {
    id: mockCategoryId,
    userId: 'user-1',
    name: 'Streaming',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  };

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    vi.clearAllMocks();
    mockMutateAsync.mockResolvedValue(undefined);
  });

  const renderDialog = (dependentCount: number) => {
    vi.mocked(categoriesHooks.useDeleteCategory).mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: false,
      error: null,
    } as any);

    return render(
      <QueryClientProvider client={queryClient}>
        <DeleteCategoryDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          category={mockCategory}
          dependentSubscriptionsCount={dependentCount}
        />
      </QueryClientProvider>
    );
  };

  it('shows in-use copy and dependent count when category has subscriptions', () => {
    renderDialog(3);

    expect(
      screen.getByRole('heading', { name: /This category is in use/i })
    ).toBeInTheDocument();
    expect(screen.getByText('3 subscription(s)')).toBeInTheDocument();
    expect(
      screen.getByText(/Deleting this category will remove it from these items/)
    ).toBeInTheDocument();
  });

  it('allows deletion when category has dependents (with warning)', async () => {
    const user = userEvent.setup();
    renderDialog(2);

    const deleteButton = screen.getByRole('button', {
      name: /Delete and uncategorise/i,
    });
    expect(deleteButton).toBeEnabled();

    await user.click(deleteButton);

    expect(mockMutateAsync).toHaveBeenCalledWith(mockCategoryId);
    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  it('shows same in-use flow when there are zero dependents', () => {
    renderDialog(0);

    expect(
      screen.getByRole('heading', { name: /This category is in use/i })
    ).toBeInTheDocument();
    expect(screen.getByText('0 subscription(s)')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Delete and uncategorise/i })
    ).toBeInTheDocument();
  });

  it('allows deletion when no dependents', async () => {
    const user = userEvent.setup();
    renderDialog(0);

    const deleteButton = screen.getByRole('button', {
      name: /Delete and uncategorise/i,
    });
    expect(deleteButton).toBeEnabled();

    await user.click(deleteButton);

    expect(mockMutateAsync).toHaveBeenCalledWith(mockCategoryId);
    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });
});

