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
    // Mock useDashboard to return empty data
    vi.mocked(dashboardHooks.useDashboard).mockReturnValue({
      data: {
        assets: [],
        liabilities: [],
        expenseBreakdown: [],
        incomeBreakdown: [],
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

    // Check for empty state
    expect(screen.getByText('Welcome to Moneybags')).toBeInTheDocument();
    expect(
      screen.getByText(/Start building your financial picture/)
    ).toBeInTheDocument();
    
    // Check for CTAs
    expect(screen.getByText('Add Subscription')).toBeInTheDocument();
    expect(screen.getByText('Add Asset')).toBeInTheDocument();
    expect(screen.getByText('Add Liability')).toBeInTheDocument();
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

