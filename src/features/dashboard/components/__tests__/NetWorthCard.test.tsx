import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { NetWorthCard } from '../NetWorthCard';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { LocaleProvider } from '@/contexts/LocaleContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock useLocale
vi.mock('@/hooks/useUserPreferences', () => ({
  useUserPreferences: () => ({ data: { locale: 'en-US' }, isLoading: false }),
  useUpdateUserPreferences: () => ({ mutateAsync: vi.fn() }),
}));

// Mock the user API
vi.mock('@/lib/api', () => ({
  userApi: {
    getCurrentUser: vi.fn().mockResolvedValue({
      id: '1',
      email: 'test@example.com',
      privacyMode: false,
      darkMode: false,
      emailNotifications: {},
    }),
    updateUser: vi.fn(),
  },
}));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <LocaleProvider>{children}</LocaleProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

const defaultTotals = {
  totalAssets: 1_200_000,
  totalLiabilities: 200_000,
};

describe('NetWorthCard', () => {
  it('renders net worth value', () => {
    render(
      <NetWorthCard
        netWorth={1000000}
        {...defaultTotals}
        change1D={0.5}
        change1W={2.3}
      />,
      { wrapper: Wrapper }
    );
    expect(screen.getAllByText('Net Worth').length).toBeGreaterThan(0);
  });

  it('displays loading state', () => {
    render(
      <NetWorthCard
        netWorth={0}
        totalAssets={0}
        totalLiabilities={0}
        change1D={0}
        change1W={0}
        isLoading={true}
      />,
      { wrapper: Wrapper }
    );
    // Should show skeleton loaders
    const skeletons = document.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('shows chart period tabs and summary with positive net worth status', () => {
    render(
      <NetWorthCard
        netWorth={1000000}
        {...defaultTotals}
        change1D={1.5}
        change1W={3.2}
      />,
      { wrapper: Wrapper }
    );
    expect(screen.getByRole('tab', { name: '30d' })).toBeInTheDocument();
    expect(screen.getAllByLabelText('Positive status').length).toBeGreaterThan(0);
  });

  it('shows summary with negative net worth status when net worth is below zero', () => {
    render(
      <NetWorthCard
        netWorth={-50000}
        totalAssets={100000}
        totalLiabilities={150000}
        change1D={-1.5}
        change1W={-3.2}
      />,
      { wrapper: Wrapper }
    );
    expect(screen.getByLabelText('Negative status')).toBeInTheDocument();
  });
});

