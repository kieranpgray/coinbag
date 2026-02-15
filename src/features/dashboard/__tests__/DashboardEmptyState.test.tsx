import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DashboardPage } from '../DashboardPage';
import * as dashboardHooks from '../hooks';
import { useQuery } from '@tanstack/react-query';

// Mock the hooks
vi.mock('../hooks');
vi.mock('@tanstack/react-query', async () => {
  const actual = await vi.importActual('@tanstack/react-query');
  return {
    ...actual,
    useQuery: vi.fn(),
  };
});

describe('DashboardPage Empty States', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    vi.clearAllMocks();
  });

  const renderDashboard = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <DashboardPage />
      </QueryClientProvider>
    );
  };

  it('shows dashboard-level empty state when all collections are empty', () => {
    // Mock useDashboard to return empty data with zero dataSources
    vi.mocked(dashboardHooks.useDashboard).mockReturnValue({
      data: {
        assets: [],
        liabilities: [],
        accounts: [],
        subscriptions: [],
        expenseBreakdown: [],
        incomeBreakdown: [],
        dataSources: {
          accountsCount: 0,
          assetsCount: 0,
          liabilitiesCount: 0,
          subscriptionsCount: 0,
          transactionsCount: 0,
          incomeCount: 0,
          holdingsCount: 0,
        },
        netWorth: 0,
        netWorthChange1D: 0,
        netWorthChange1W: 0,
        investments: 0,
        investmentsChange1D: 0,
        investmentsChange1W: 0,
        totalCash: 0,
        totalCashChange1D: 0,
        totalCashChange1W: 0,
        totalDebts: 0,
        totalDebtsChange1D: 0,
        totalDebtsChange1W: 0,
        estimatedTaxOnGains: 0,
        adjustedNetWorth: 0,
        setupProgress: 0,
        setupChecklist: [],
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as any);

    // Mock market query
    vi.mocked(useQuery).mockReturnValue({
      data: null,
      isLoading: false,
      error: null,
    } as any);

    renderDashboard();

    // Check for new empty state design
    expect(screen.getByText('Welcome to Supafolio')).toBeInTheDocument();
    expect(screen.getByText("Let's get your finances organized")).toBeInTheDocument();
    expect(
      screen.getByText(/Choose any action below to start tracking your wealth/)
    ).toBeInTheDocument();
    
    // Check for card titles (4 cards instead of 5 buttons)
    expect(screen.getByText('Add an account')).toBeInTheDocument();
    expect(screen.getByText('Add assets')).toBeInTheDocument();
    expect(screen.getByText('Set a goal')).toBeInTheDocument();
    expect(screen.getByText('Create budget')).toBeInTheDocument();
  });

  it('shows error state when dashboard query fails', () => {
    vi.mocked(dashboardHooks.useDashboard).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('Failed to fetch'),
      refetch: vi.fn(),
    } as any);

    vi.mocked(useQuery).mockReturnValue({
      data: null,
      isLoading: false,
      error: null,
    } as any);

    renderDashboard();

    expect(screen.getByText('Unable to load dashboard')).toBeInTheDocument();
    expect(screen.getByText('Try again')).toBeInTheDocument();
  });

  it('shows loading state while fetching', () => {
    vi.mocked(dashboardHooks.useDashboard).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
      refetch: vi.fn(),
    } as any);

    vi.mocked(useQuery).mockReturnValue({
      data: null,
      isLoading: true,
      error: null,
    } as any);

    renderDashboard();

    // Skeletons should be present (check for common skeleton animation class)
    const skeletons = document.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });
});

