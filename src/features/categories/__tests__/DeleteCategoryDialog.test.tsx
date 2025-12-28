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

  const mockCategory = {
    id: 'cat-1',
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

  it('shows warning when category has dependent subscriptions', () => {
    renderDialog(3);

    expect(screen.getByText(/Delete category "Streaming"/)).toBeInTheDocument();
    expect(screen.getByText(/used by 3 subscription/)).toBeInTheDocument();
    expect(
      screen.getByText(/Deleting this category will remove it from/)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Those subscriptions will remain but will be uncategorized/)
    ).toBeInTheDocument();
  });

  it('allows deletion when category has dependents (with warning)', async () => {
    const user = userEvent.setup();
    renderDialog(2);

    // Delete button should be enabled
    const deleteButton = screen.getByRole('button', { name: /Delete & Uncategorize/ });
    expect(deleteButton).toBeEnabled();

    await user.click(deleteButton);

    expect(mockMutateAsync).toHaveBeenCalledWith('cat-1');
    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  it('shows simple confirmation when no dependents', () => {
    renderDialog(0);

    expect(screen.getByText(/Delete category "Streaming"/)).toBeInTheDocument();
    expect(
      screen.getByText(/Are you sure you want to delete/)
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
  });

  it('allows deletion when no dependents', async () => {
    const user = userEvent.setup();
    renderDialog(0);

    const deleteButton = screen.getByRole('button', { name: 'Delete' });
    expect(deleteButton).toBeEnabled();

    await user.click(deleteButton);

    expect(mockMutateAsync).toHaveBeenCalledWith('cat-1');
    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });
});

