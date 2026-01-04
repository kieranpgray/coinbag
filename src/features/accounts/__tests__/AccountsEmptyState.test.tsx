import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AccountsPage } from '../AccountsPage';
import * as accountsHooks from '../hooks';

// Mock the hooks
vi.mock('../hooks');

describe('AccountsPage Empty States', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    vi.clearAllMocks();
  });

  const renderAccounts = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <AccountsPage />
      </QueryClientProvider>
    );
  };

  it('shows empty state with CTA when no accounts exist', () => {
    vi.mocked(accountsHooks.useAccounts).mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as any);

    renderAccounts();

    expect(screen.getByText('No accounts yet')).toBeInTheDocument();
    expect(
      screen.getByText(/Add an account to track balances/)
    ).toBeInTheDocument();
    expect(screen.getByText('Add Account')).toBeInTheDocument();
  });

  it('shows error state when query fails', () => {
    vi.mocked(accountsHooks.useAccounts).mockReturnValue({
      data: [],
      isLoading: false,
      error: new Error('Failed to fetch'),
      refetch: vi.fn(),
    } as any);

    renderAccounts();

    expect(screen.getByText('Unable to load accounts')).toBeInTheDocument();
    expect(screen.getByText('Try again')).toBeInTheDocument();
  });
});


