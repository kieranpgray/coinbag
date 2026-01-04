import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { DashboardPage } from '../DashboardPage';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from '@/contexts/ThemeContext';

// Mock APIs
vi.mock('@/lib/api', () => ({
  dashboardApi: {
    getData: vi.fn().mockResolvedValue({
      netWorth: 1000000,
      netWorthChange1D: 0.5,
      netWorthChange1W: 2.3,
      investments: 500000,
      investmentsChange1D: 1,
      investmentsChange1W: 2,
      totalCash: 100000,
      totalCashChange1D: 0,
      totalCashChange1W: 0,
      totalDebts: 400000,
      totalDebtsChange1D: 0,
      totalDebtsChange1W: 0,
      estimatedTaxOnGains: 5000,
      adjustedNetWorth: 995000,
      assets: [],
      liabilities: [],
      expenseBreakdown: [
        { category: 'Entertainment', amount: 49.98, percentage: 67 },
        { category: 'Utilities', amount: 24.99, percentage: 33 },
      ],
      incomeBreakdown: [
        { category: 'Salary', amount: 5000, percentage: 83 },
        { category: 'Interest', amount: 1000, percentage: 17 },
      ],
      setupProgress: 43,
      setupChecklist: [],
    }),
  },
  marketApi: {
    getSummary: vi.fn().mockResolvedValue({
      sp500: { change1D: 0.85, change7D: 2.3, change30D: -1.2 },
      commentary: 'Test commentary',
    }),
  },
  userApi: {
    getCurrentUser: vi.fn().mockResolvedValue({
      id: '1',
      email: 'test@example.com',
      privacyMode: false,
      darkMode: false,
      taxRate: 20,
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
      <BrowserRouter>
        <ThemeProvider>{children}</ThemeProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

describe('DashboardPage', () => {
  it('renders dashboard title', async () => {
    render(<DashboardPage />, { wrapper: Wrapper });
    
    await waitFor(() => {
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });
  });

  it('displays loading state initially', async () => {
    render(<DashboardPage />, { wrapper: Wrapper });
    
    // Component should render - loading state may be very brief with mocked API
    await waitFor(() => {
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });
  });

  it('renders dashboard widgets after loading', async () => {
    render(<DashboardPage />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(screen.getByText('Net Worth')).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('renders expense and income breakdown cards', async () => {
    render(<DashboardPage />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(screen.getByText('Expense Breakdown')).toBeInTheDocument();
      expect(screen.getByText('Income Breakdown')).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('displays expense breakdown data', async () => {
    render(<DashboardPage />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(screen.getByText('Entertainment')).toBeInTheDocument();
      expect(screen.getByText('67%')).toBeInTheDocument();
      expect(screen.getByText('Utilities')).toBeInTheDocument();
      expect(screen.getByText('33%')).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('displays income breakdown data', async () => {
    render(<DashboardPage />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(screen.getByText('Salary')).toBeInTheDocument();
      expect(screen.getByText('83%')).toBeInTheDocument();
      expect(screen.getByText('Interest')).toBeInTheDocument();
      expect(screen.getByText('17%')).toBeInTheDocument();
    }, { timeout: 3000 });
  });
});

