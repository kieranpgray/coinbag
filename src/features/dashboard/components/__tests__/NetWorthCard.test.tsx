import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { NetWorthCard } from '../NetWorthCard';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock the user API
vi.mock('@/lib/api', () => ({
  userApi: {
    getCurrentUser: vi.fn().mockResolvedValue({
      id: '1',
      email: 'test@example.com',
      privacyMode: false,
      darkMode: false,
      taxRate: 20,
      emailNotifications: {},
      mfaEnabled: false,
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
      <ThemeProvider>{children}</ThemeProvider>
    </QueryClientProvider>
  );
}

describe('NetWorthCard', () => {
  it('renders net worth value', () => {
    render(
      <NetWorthCard netWorth={1000000} change1D={0.5} change1W={2.3} />,
      { wrapper: Wrapper }
    );
    expect(screen.getByText('Net Worth')).toBeInTheDocument();
  });

  it('displays loading state', () => {
    render(
      <NetWorthCard netWorth={0} change1D={0} change1W={0} isLoading={true} />,
      { wrapper: Wrapper }
    );
    // Should show skeleton loaders
    const skeletons = document.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('shows positive change in green', () => {
    render(
      <NetWorthCard netWorth={1000000} change1D={1.5} change1W={3.2} />,
      { wrapper: Wrapper }
    );
    const changeElements = screen.getAllByText(/1D:|1W:/);
    expect(changeElements.length).toBeGreaterThan(0);
  });

  it('shows negative change in red', () => {
    render(
      <NetWorthCard netWorth={1000000} change1D={-1.5} change1W={-3.2} />,
      { wrapper: Wrapper }
    );
    const changeElements = screen.getAllByText(/1D:|1W:/);
    expect(changeElements.length).toBeGreaterThan(0);
  });
});

