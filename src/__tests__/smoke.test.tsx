import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { Routes } from '@/routes';

// Mock Clerk for smoke tests
vi.mock('@clerk/clerk-react', () => ({
  ClerkProvider: ({ children }: { children: React.ReactNode }) => <div data-testid="clerk-provider">{children}</div>,
  SignedIn: ({ children }: { children: React.ReactNode }) => <div data-testid="signed-in">{children}</div>,
  SignedOut: () => null, // Don't render signed out content in smoke tests
  RedirectToSignIn: () => null,
  UserButton: () => <button data-testid="user-button" />,
  useAuth: () => ({
    getToken: vi.fn().mockResolvedValue('mock-jwt-token'),
    userId: 'mock-user-id',
    isLoaded: true,
    isSignedIn: true,
  }),
  useUser: () => ({
    isLoaded: true,
    isSignedIn: true,
    user: {
      firstName: 'Test',
      lastName: 'User',
      primaryEmailAddress: { emailAddress: 'test@example.com' },
      primaryPhoneNumber: { phoneNumber: '+10000000000' },
      update: vi.fn().mockResolvedValue({}),
    },
  }),
}));

// Mock environment and APIs
vi.mock('import.meta.env', () => ({
  VITE_DATA_SOURCE: 'mock',
}));

vi.mock('@/lib/api', () => ({
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
}));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

import { BrowserRouter } from 'react-router-dom';

function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ThemeProvider>{children}</ThemeProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

describe('Smoke Tests', () => {
  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();
  });

  it('renders the routes without crashing', () => {
    const { container } = render(<Routes />, { wrapper: Wrapper });
    expect(container).toBeInTheDocument();
  });

  it('has Coinbag branding', async () => {
    render(<Routes />, { wrapper: Wrapper });
    
    await waitFor(
      () => {
        // Coinbag appears in header and sidebar
        const coinbagElements = screen.getAllByText(/Coinbag/i);
        expect(coinbagElements.length).toBeGreaterThan(0);
      },
      { timeout: 5000 }
    );
  });

  it('has accessible navigation', async () => {
    render(<Routes />, { wrapper: Wrapper });
    
    await waitFor(
      () => {
        // Check for skip to content link
        const skipLink = screen.getByText(/skip to main content/i);
        expect(skipLink).toBeInTheDocument();
      },
      { timeout: 5000 }
    );
  });

  it('renders header with theme controls', async () => {
    render(<Routes />, { wrapper: Wrapper });
    
    await waitFor(
      () => {
        const header = screen.getByRole('banner');
        expect(header).toBeInTheDocument();
      },
      { timeout: 5000 }
    );
  });
});

