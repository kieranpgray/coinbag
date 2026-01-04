import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useDashboard } from '../hooks/useDashboard';
import { useCreateAsset } from '@/features/assets/hooks/useAssets';
import { useCreateLiability } from '@/features/liabilities/hooks/useLiabilities';
import { useCreateSubscription } from '@/features/subscriptions/hooks';
import { useCreateIncome } from '@/features/income/hooks/useIncome';
import type { ReactNode } from 'react';
import type { Asset, Liability, Account, Subscription } from '@/types/domain';

// Import seed/clear functions
import { seedMockAssets, clearMockAssets } from '@/data/assets/mockRepo';
import { seedMockLiabilities, clearMockLiabilities } from '@/data/liabilities/mockRepo';
import { seedMockAccounts, clearMockAccounts } from '@/data/accounts/mockRepo';
import { seedMockSubscriptions, clearMockSubscriptions } from '@/data/subscriptions/mockRepo';
import { clearMockDashboardData } from '@/lib/api';

// Mock environment
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

// Mock APIs
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
 * P0 Verification Tests
 * These tests verify all P0 requirements from the verification spec
 */
describe('P0 Dashboard Verification', () => {
  beforeEach(() => {
    clearMockAssets();
    clearMockLiabilities();
    clearMockAccounts();
    clearMockSubscriptions();
    clearMockDashboardData();
    queryClient.clear();
  });

  describe('P0-1: Income Create → Dashboard Update', () => {
    it('should update Income Breakdown tile when income is created', async () => {
      const { result: dashboardResult } = renderHook(() => useDashboard(), { wrapper });
      
      await waitFor(() => {
        expect(dashboardResult.current.data).toBeDefined();
      });

      expect(dashboardResult.current.data!.dataSources.incomeCount).toBe(0);
      expect(dashboardResult.current.data!.incomeBreakdown).toHaveLength(0);

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

      // Verify dashboard updates
      await waitFor(
        () => {
          const updatedData = dashboardResult.current.data;
          expect(updatedData?.dataSources.incomeCount).toBe(1);
          expect(updatedData?.incomeBreakdown.length).toBeGreaterThan(0);
          // Verify setup progress marks income complete
          const incomeChecklistItem = updatedData?.setupChecklist.find(
            item => item.id === 'income'
          );
          expect(incomeChecklistItem?.completed).toBe(true);
        },
        { timeout: 3000 }
      );
    });
  });

  describe('P0-2: Asset Create → Dashboard Update', () => {
    it('should update Assets Breakdown tile when asset is created', async () => {
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

      // Verify dashboard updates
      await waitFor(
        () => {
          const updatedData = dashboardResult.current.data;
          expect(updatedData?.dataSources.assetsCount).toBe(1);
          expect(updatedData?.assetBreakdown.length).toBeGreaterThan(0);
          // Verify setup progress marks assets complete
          const assetsChecklistItem = updatedData?.setupChecklist.find(
            item => item.id === 'assets'
          );
          expect(assetsChecklistItem?.completed).toBe(true);
        },
        { timeout: 3000 }
      );
    });
  });

  describe('P0-3: Liability Create → Dashboard Update', () => {
    it('should update Liabilities Breakdown tile when liability is created', async () => {
      const { result: dashboardResult } = renderHook(() => useDashboard(), { wrapper });
      
      await waitFor(() => {
        expect(dashboardResult.current.data).toBeDefined();
      });

      expect(dashboardResult.current.data!.dataSources.liabilitiesCount).toBe(0);

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

      // Verify dashboard updates
      await waitFor(
        () => {
          const updatedData = dashboardResult.current.data;
          expect(updatedData?.dataSources.liabilitiesCount).toBe(1);
          expect(updatedData?.liabilityBreakdown.length).toBeGreaterThan(0);
          // Verify setup progress marks liabilities complete
          const liabilitiesChecklistItem = updatedData?.setupChecklist.find(
            item => item.id === 'liabilities'
          );
          expect(liabilitiesChecklistItem?.completed).toBe(true);
        },
        { timeout: 3000 }
      );
    });
  });

  describe('P0-4: Net Worth Reactivity', () => {
    it('should update Net Worth when asset is created', async () => {
      const { result: dashboardResult } = renderHook(() => useDashboard(), { wrapper });
      
      await waitFor(() => {
        expect(dashboardResult.current.data).toBeDefined();
      });

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

      await waitFor(
        () => {
          const updatedData = dashboardResult.current.data;
          expect(updatedData?.netWorth).toBe(500000);
        },
        { timeout: 3000 }
      );
    });

    it('should update Net Worth when liability is created', async () => {
      // Seed asset first
      const initialAsset: Asset = {
        id: 'asset-1',
        name: 'House',
        type: 'Real Estate',
        value: 500000,
        change1D: 0,
        change1W: 0,
        dateAdded: '2024-01-01',
        institution: 'Real Estate',
      };
      seedMockAssets([initialAsset]);

      const { result: dashboardResult } = renderHook(() => useDashboard(), { wrapper });
      
      await waitFor(() => {
        expect(dashboardResult.current.data).toBeDefined();
      });

      expect(dashboardResult.current.data!.netWorth).toBe(500000);

      // Create liability
      const { result: createLiabilityResult } = renderHook(() => useCreateLiability(), { wrapper });
      createLiabilityResult.current.mutate({
        name: 'Mortgage',
        type: 'Loans',
        balance: 300000,
        interestRate: 4.5,
        monthlyPayment: 2000,
        dueDate: '2024-02-01',
        institution: 'Bank C',
      });

      await waitFor(() => {
        expect(createLiabilityResult.current.isSuccess).toBe(true);
      });

      await waitFor(
        () => {
          const updatedData = dashboardResult.current.data;
          expect(updatedData?.netWorth).toBe(200000); // 500000 - 300000
        },
        { timeout: 3000 }
      );
    });

    it('should NOT show empty state when asset has $0 value', async () => {
      const { result: dashboardResult } = renderHook(() => useDashboard(), { wrapper });
      
      await waitFor(() => {
        expect(dashboardResult.current.data).toBeDefined();
      });

      // Create asset with $0 value
      const { result: createAssetResult } = renderHook(() => useCreateAsset(), { wrapper });
      createAssetResult.current.mutate({
        name: 'Empty Account',
        type: 'Other',
        value: 0,
        change1D: 0,
        change1W: 0,
        dateAdded: '2024-01-01',
        institution: 'Bank',
      });

      await waitFor(() => {
        expect(createAssetResult.current.isSuccess).toBe(true);
      });

      await waitFor(
        () => {
          const updatedData = dashboardResult.current.data;
          expect(updatedData?.dataSources.assetsCount).toBe(1); // Count > 0
          const hasAnyDataSource = 
            updatedData!.dataSources.accountsCount > 0 ||
            updatedData!.dataSources.assetsCount > 0 ||
            updatedData!.dataSources.liabilitiesCount > 0 ||
            updatedData!.dataSources.subscriptionsCount > 0 ||
            updatedData!.dataSources.transactionsCount > 0 ||
            updatedData!.dataSources.incomeCount > 0;
          expect(hasAnyDataSource).toBe(true); // Should NOT be empty
        },
        { timeout: 3000 }
      );
    });
  });

  describe('P0-5: First Record Exits Dashboard Empty State', () => {
    it('should exit empty state when first subscription is created', async () => {
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

      // Create subscription (need valid UUID for categoryId and amount within range)
      const { result: createSubResult } = renderHook(() => useCreateSubscription(), { wrapper });
      createSubResult.current.mutate({
        name: 'Netflix',
        amount: 15.99, // Within monthly range ($5-10000)
        frequency: 'monthly',
        chargeDate: '2024-01-01',
        nextDueDate: '2024-02-01',
        categoryId: '00000000-0000-4000-8000-000000000001', // Valid UUID v4 format
      });

      await waitFor(() => {
        expect(createSubResult.current.isSuccess).toBe(true);
      });

      // Verify dashboard exits empty state
      await waitFor(
        () => {
          const updatedData = dashboardResult.current.data;
          expect(updatedData?.dataSources.subscriptionsCount).toBe(1);
          expect(updatedData?.expenseBreakdown.length).toBeGreaterThan(0);
          const hasData = 
            updatedData!.dataSources.accountsCount > 0 ||
            updatedData!.dataSources.assetsCount > 0 ||
            updatedData!.dataSources.liabilitiesCount > 0 ||
            updatedData!.dataSources.subscriptionsCount > 0 ||
            updatedData!.dataSources.transactionsCount > 0 ||
            updatedData!.dataSources.incomeCount > 0;
          expect(hasData).toBe(true);
          // Verify setup progress marks subscriptions complete
          const subscriptionsChecklistItem = updatedData?.setupChecklist.find(
            item => item.id === 'subscriptions'
          );
          expect(subscriptionsChecklistItem?.completed).toBe(true);
        },
        { timeout: 3000 }
      );
    });
  });

  describe('P0-6: Investment Creation Data Loss Prevention', () => {
    it('should NOT cause data loss when investment is created', async () => {
      // Seed multiple entity types
      const initialAsset: Asset = {
        id: 'asset-1',
        name: 'House',
        type: 'Real Estate',
        value: 500000,
        change1D: 0,
        change1W: 0,
        dateAdded: '2024-01-01',
        institution: 'Real Estate',
      };
      const initialLiability: Liability = {
        id: 'liability-1',
        name: 'Credit Card',
        type: 'Credit Card',
        balance: 5000,
        interestRate: 18.5,
        monthlyPayment: 200,
        dueDate: '2024-02-15',
        institution: 'Bank A',
      };
      const initialAccount: Account = {
        id: 'account-1',
        institution: 'Bank B',
        accountName: 'Bank Account',
        balance: 10000,
        accountType: 'Bank Account',
        lastUpdated: '2024-01-01',
        hidden: false,
      };
      const initialSubscription: Subscription = {
        id: 'sub-1',
        name: 'Netflix',
        amount: 15.99,
        frequency: 'monthly',
        chargeDate: '2024-01-01',
        nextDueDate: '2024-02-01',
        categoryId: 'cat-1',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };
      // Note: Income uses in-memory store, so we'll create it via API if needed
      // const _initialIncome: Income = {
      //   id: 'income-1',
      //   name: 'Salary',
      //   source: 'Salary',
      //   amount: 5000,
      //   frequency: 'monthly',
      //   nextPaymentDate: '2024-02-01',
      // };

      seedMockAssets([initialAsset]);
      seedMockLiabilities([initialLiability]);
      seedMockAccounts([initialAccount]);
      seedMockSubscriptions([initialSubscription]);
      // Note: Income uses in-memory store, so we'll create it via API

      const { result: dashboardResult } = renderHook(() => useDashboard(), { wrapper });
      
      await waitFor(() => {
        expect(dashboardResult.current.data).toBeDefined();
      });

      const initialDashboard = dashboardResult.current.data!;
      expect(initialDashboard.dataSources.assetsCount).toBe(1);
      expect(initialDashboard.dataSources.liabilitiesCount).toBe(1);
      expect(initialDashboard.dataSources.accountsCount).toBe(1);
      expect(initialDashboard.dataSources.subscriptionsCount).toBe(1);

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

      // Create investment (asset with type='Investments')
      const { result: createAssetResult } = renderHook(() => useCreateAsset(), { wrapper });
      createAssetResult.current.mutate({
        name: 'Stock Portfolio',
        type: 'Investments',
        value: 100000,
        change1D: 0.5,
        change1W: 2.0,
        dateAdded: '2024-01-15',
        institution: 'Brokerage',
      });

      await waitFor(() => {
        expect(createAssetResult.current.isSuccess).toBe(true);
      });

      // Verify ALL entities remain intact
      await waitFor(
        () => {
          const updatedData = dashboardResult.current.data;
          // Should have 2 assets now (original + investment)
          expect(updatedData?.dataSources.assetsCount).toBe(2);
          expect(updatedData?.dataSources.liabilitiesCount).toBe(1); // Unchanged
          expect(updatedData?.dataSources.accountsCount).toBe(1); // Unchanged
          expect(updatedData?.dataSources.subscriptionsCount).toBe(1); // Unchanged
          expect(updatedData?.dataSources.incomeCount).toBe(1); // Unchanged
          // Verify holdings count includes the investment
          expect(updatedData?.dataSources.holdingsCount).toBe(1);
          // Verify dashboard is NOT empty
          const hasAnyDataSource = 
            updatedData!.dataSources.accountsCount > 0 ||
            updatedData!.dataSources.assetsCount > 0 ||
            updatedData!.dataSources.liabilitiesCount > 0 ||
            updatedData!.dataSources.subscriptionsCount > 0 ||
            updatedData!.dataSources.transactionsCount > 0 ||
            updatedData!.dataSources.incomeCount > 0;
          expect(hasAnyDataSource).toBe(true);
        },
        { timeout: 5000 }
      );
    });
  });
});

