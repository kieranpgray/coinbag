import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useDashboard } from '../hooks/useDashboard';
import { useCreateAsset } from '@/features/assets/hooks/useAssets';
import { useCreateLiability } from '@/features/liabilities/hooks/useLiabilities';
import { useCreateAccount } from '@/features/accounts/hooks/useAccounts';
import { useCreateSubscription } from '@/features/subscriptions/hooks';
import { useCreateIncome } from '@/features/income/hooks/useIncome';
import type { ReactNode } from 'react';
import type { Asset, Liability, Account, Subscription, Income } from '@/types/domain';

// Import seed/clear functions for mock repositories
import { seedMockAssets, clearMockAssets } from '@/data/assets/mockRepo';
import { seedMockLiabilities, clearMockLiabilities } from '@/data/liabilities/mockRepo';
import { seedMockAccounts, clearMockAccounts } from '@/data/accounts/mockRepo';
import { seedMockSubscriptions, clearMockSubscriptions } from '@/data/subscriptions/mockRepo';
import { clearMockDashboardData } from '@/lib/api';

// Mock environment to use mock repositories
vi.mock('import.meta.env', () => ({
  VITE_DATA_SOURCE: 'mock',
}));

// Mock Clerk
vi.mock('@clerk/clerk-react', () => ({
  ClerkProvider: ({ children }: { children: ReactNode }) => children,
  SignedIn: ({ children }: { children: ReactNode }) => children,
  SignedOut: ({ children }: { children: ReactNode }) => children,
  RedirectToSignIn: () => null,
  UserButton: () => null,
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

// Mock market API and transactions API
vi.mock('@/lib/api', async () => {
  const actual = await vi.importActual('@/lib/api');
  return {
    ...actual,
    marketApi: {
      getSummary: vi.fn().mockResolvedValue({
        sp500: { change1D: 0.85, change7D: 2.3, change30D: -1.2 },
        commentary: 'Test commentary',
      }),
    },
    transactionsApi: {
      getAll: vi.fn().mockResolvedValue({ data: [], total: 0 }),
    },
    // incomeApi uses actual implementation with in-memory store
  };
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false, gcTime: 0 },
    mutations: { retry: false },
  },
});

function wrapper({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

/**
 * Baseline tests to document current dashboard reactivity behavior
 * These tests identify specific problems before implementing fixes
 */
describe('Dashboard Reactivity Baseline', () => {
  beforeEach(() => {
    clearMockAssets();
    clearMockLiabilities();
    clearMockAccounts();
    clearMockSubscriptions();
    clearMockDashboardData(); // Clear incomes and other in-memory stores
    queryClient.clear();
  });

  describe('Current Behavior Documentation', () => {
    it('should document if dashboard updates after creating income', async () => {
      const { result: dashboardResult } = renderHook(() => useDashboard(), { wrapper });
      
      // Wait for initial empty dashboard
      await waitFor(() => {
        expect(dashboardResult.current.data).toBeDefined();
      });

      const initialData = dashboardResult.current.data!;
      expect(initialData.dataSources.incomeCount).toBe(0);

      // Create income
      const { result: createIncomeResult } = renderHook(() => useCreateIncome(), { wrapper });
      createIncomeResult.current.mutate({
        name: 'Salary',
        source: 'Salary',
        amount: 5000,
        frequency: 'monthly',
        nextPaymentDate: '2024-02-01',
      });

      await waitFor(() => {
        expect(createIncomeResult.current.isSuccess).toBe(true);
      });

      // Check if dashboard updates (this may fail if reactivity is broken)
      await waitFor(
        () => {
          const updatedData = dashboardResult.current.data;
          expect(updatedData?.dataSources.incomeCount).toBeGreaterThan(0);
        },
        { timeout: 5000 }
      );
    });

    it('should document if dashboard updates after creating asset', async () => {
      const { result: dashboardResult } = renderHook(() => useDashboard(), { wrapper });
      
      await waitFor(() => {
        expect(dashboardResult.current.data).toBeDefined();
      });

      expect(dashboardResult.current.data!.dataSources.assetsCount).toBe(0);

      // Create asset
      const { result: createAssetResult } = renderHook(() => useCreateAsset(), { wrapper });
      createAssetResult.current.mutate({
        name: 'House',
        type: 'Real Estate',
        value: 500000,
        change1D: 0,
        change1W: 0,
        dateAdded: '2024-01-01',
        institution: 'Real Estate',
      });

      await waitFor(() => {
        expect(createAssetResult.current.isSuccess).toBe(true);
      });

      // Check if dashboard updates
      await waitFor(
        () => {
          const updatedData = dashboardResult.current.data;
          expect(updatedData?.dataSources.assetsCount).toBeGreaterThan(0);
        },
        { timeout: 5000 }
      );
    });

    it('should document if dashboard exits empty state after creating first entity', async () => {
      const { result: dashboardResult } = renderHook(() => useDashboard(), { wrapper });
      
      await waitFor(() => {
        expect(dashboardResult.current.data).toBeDefined();
      });

      // Verify empty state
      const initialData = dashboardResult.current.data!;
      const hasAnyDataSource = 
        initialData.dataSources.accountsCount > 0 ||
        initialData.dataSources.assetsCount > 0 ||
        initialData.dataSources.liabilitiesCount > 0 ||
        initialData.dataSources.subscriptionsCount > 0 ||
        initialData.dataSources.transactionsCount > 0 ||
        initialData.dataSources.incomeCount > 0;
      expect(hasAnyDataSource).toBe(false);

      // Create subscription
      const { result: createSubResult } = renderHook(() => useCreateSubscription(), { wrapper });
      createSubResult.current.mutate({
        name: 'Netflix',
        amount: 15.99,
        frequency: 'monthly',
        chargeDate: '2024-01-01',
        nextDueDate: '2024-02-01',
        categoryId: 'cat-1',
      });

      await waitFor(() => {
        expect(createSubResult.current.isSuccess).toBe(true);
      });

      // Check if dashboard exits empty state
      await waitFor(
        () => {
          const updatedData = dashboardResult.current.data;
          const hasData = 
            updatedData!.dataSources.accountsCount > 0 ||
            updatedData!.dataSources.assetsCount > 0 ||
            updatedData!.dataSources.liabilitiesCount > 0 ||
            updatedData!.dataSources.subscriptionsCount > 0 ||
            updatedData!.dataSources.transactionsCount > 0 ||
            updatedData!.dataSources.incomeCount > 0;
          expect(hasData).toBe(true);
        },
        { timeout: 5000 }
      );
    });

    it('should document timing of dashboard updates (check for delays)', async () => {
      const { result: dashboardResult } = renderHook(() => useDashboard(), { wrapper });
      
      await waitFor(() => {
        expect(dashboardResult.current.data).toBeDefined();
      });

      const startTime = Date.now();

      // Create liability
      const { result: createLiabilityResult } = renderHook(() => useCreateLiability(), { wrapper });
      createLiabilityResult.current.mutate({
        name: 'Credit Card',
        type: 'Credit Card',
        balance: 5000,
        interestRate: 18.5,
        monthlyPayment: 200,
        dueDate: '2024-02-15',
        institution: 'Bank A',
      });

      await waitFor(() => {
        expect(createLiabilityResult.current.isSuccess).toBe(true);
      });

      // Wait for dashboard update
      await waitFor(
        () => {
          const updatedData = dashboardResult.current.data;
          expect(updatedData?.dataSources.liabilitiesCount).toBeGreaterThan(0);
        },
        { timeout: 5000 }
      );

      const endTime = Date.now();
      const updateDelay = endTime - startTime;

      // Document the delay (this helps identify staleTime issues)
      console.log(`Dashboard update delay: ${updateDelay}ms`);
      // Note: If delay is > 1000ms, there may be a staleTime or refetch issue
    });
  });
});

