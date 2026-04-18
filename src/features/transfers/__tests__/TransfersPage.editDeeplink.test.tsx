import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LocaleProvider } from '@/contexts/LocaleContext';
import TransfersPage from '../TransfersPage';

const { usePayCycleMock } = vi.hoisted(() => ({
  usePayCycleMock: vi.fn(),
}));

vi.mock('@/hooks/useUserPreferences', () => ({
  useUserPreferences: () => ({
    data: { locale: 'en-US' },
    isLoading: false,
    isPreferencesReady: true,
  }),
  useUpdateUserPreferences: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

vi.mock('../hooks', () => ({
  usePayCycle: () => usePayCycleMock(),
  useCashFlowByAccount: () => ({ data: [], isLoading: false, error: null }),
  useTransferSuggestions: () => ({ data: [], isLoading: false, error: null }),
}));

vi.mock('@/features/expenses/hooks', () => ({
  useExpenses: () => ({ data: [], isLoading: false }),
}));

vi.mock('@/features/income/hooks', () => ({
  useIncomes: () => ({ data: [], isLoading: false }),
}));

vi.mock('@/features/accounts/hooks', () => ({
  useAccounts: () => ({
    data: [
      {
        id: 'a1',
        accountName: 'Checking',
        balance: 0,
        accountType: 'transaction',
        lastUpdated: '2025-01-01',
        hidden: false,
      },
      {
        id: 'a2',
        accountName: 'Savings',
        balance: 0,
        accountType: 'savings',
        lastUpdated: '2025-01-01',
        hidden: false,
      },
    ],
    isLoading: false,
  }),
  useCreateAccount: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
}));

vi.mock('@/features/categories/hooks', () => ({
  useCategories: () => ({ data: [], isLoading: false }),
}));

vi.mock('@/lib/featureFlags', () => ({
  isFeatureEnabled: () => false,
}));

describe('TransfersPage ?edit=1 deep link', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    vi.clearAllMocks();
  });

  function renderAt(initialPath: string) {
    const router = createMemoryRouter([{ path: '/app/transfers', element: <TransfersPage /> }], {
      initialEntries: [initialPath],
    });
    render(
      <LocaleProvider>
        <QueryClientProvider client={queryClient}>
          <RouterProvider router={router} />
        </QueryClientProvider>
      </LocaleProvider>
    );
    return router;
  }

  it('opens edit panel and strips edit query when pay cycle exists', async () => {
    usePayCycleMock.mockReturnValue({
      payCycle: {
        frequency: 'fortnightly',
        nextPayDate: '2025-04-25',
        primaryIncomeAccountId: 'a1',
        savingsAccountId: 'a2',
      },
      isLoading: false,
      updatePayCycle: vi.fn(),
    });

    const router = renderAt('/app/transfers?edit=1');

    await waitFor(() => {
      expect(router.state.location.search).not.toMatch(/edit=1/);
    });

    await waitFor(() => {
      expect(document.querySelector('.edit-panel-title')).toHaveTextContent('Adjusting your plan');
    });

    expect(document.querySelector('.edit-panel.open')).toBeTruthy();
  });

  it('does not open edit when pay cycle is missing; still strips edit query', async () => {
    usePayCycleMock.mockReturnValue({
      payCycle: null,
      isLoading: false,
      updatePayCycle: vi.fn(),
    });

    const router = renderAt('/app/transfers?edit=1');

    await waitFor(() => {
      expect(router.state.location.search).not.toMatch(/edit=1/);
    });

    expect(document.querySelector('.edit-panel.open')).toBeNull();
    expect(screen.getByText(/Set Up Your Pay Cycle/i)).toBeInTheDocument();
  });
});
