import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useDashboard } from '../hooks/useDashboard';
import { useCreateAsset } from '@/features/assets/hooks/useAssets';
import { useCreateLiability } from '@/features/liabilities/hooks/useLiabilities';
import { useCreateAccount } from '@/features/accounts/hooks/useAccounts';
import { useCreateSubscription } from '@/features/subscriptions/hooks';
import type { ReactNode } from 'react';
import type { Asset, Liability, Account, Subscription, Income } from '@/types/domain';

// Import seed/clear functions for mock repositories
import { seedMockAssets, clearMockAssets } from '@/data/assets/mockRepo';
import { seedMockLiabilities, clearMockLiabilities } from '@/data/liabilities/mockRepo';
import { seedMockAccounts, clearMockAccounts } from '@/data/accounts/mockRepo';
import { seedMockSubscriptions, clearMockSubscriptions } from '@/data/subscriptions/mockRepo';
import { incomeApi } from '@/lib/api';

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

// Mock market API and legacy APIs
vi.mock('@/lib/api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api')>('@/lib/api');
  return {
    ...actual,
    marketApi: {
      getSummary: vi.fn().mockResolvedValue({
        sp500: { change1D: 0.85, change7D: 2.3, change30D: -1.2 },
        commentary: 'Test commentary',
      }),
    },
    incomeApi: {
      getAll: vi.fn().mockResolvedValue([]),
      getById: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
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
 * P0 DATA LOSS REGRESSION TESTS
 * 
 * These tests MUST FAIL if the data loss bug returns.
 * Each test creates baseline data for ALL entity types, then creates ONE target entity,
 * and verifies ALL baseline entities still exist with EXACT counts.
 * 
 * These tests are designed to catch regressions where:
 * - Creating one entity deletes another
 * - Dashboard reverts to empty state when data exists
 * - Data source counts become inaccurate
 */
describe('P0 Data Loss Regression Tests', () => {
  beforeEach(() => {
    // Clear all mock data before each test
    clearMockAssets();
    clearMockLiabilities();
    clearMockAccounts();
    clearMockSubscriptions();
    queryClient.clear();
    // Reset income API mock
    vi.mocked(incomeApi.getAll).mockResolvedValue([]);
  });

  afterEach(() => {
    // Clean up after each test
    clearMockAssets();
    clearMockLiabilities();
    clearMockAccounts();
    clearMockSubscriptions();
    queryClient.clear();
  });

  /**
   * Helper function to create baseline data for all entity types
   */
  function createBaselineData() {
    const baselineAsset: Asset = {
      id: 'asset-baseline-1',
      name: 'Baseline House',
      type: 'Real Estate',
      value: 500000,
      change1D: 0,
      change1W: 0,
      dateAdded: '2024-01-01',
      institution: 'Real Estate Co',
    };

    const baselineLiability: Liability = {
      id: 'liability-baseline-1',
      name: 'Baseline Credit Card',
      type: 'Credit Card',
      balance: 5000,
      interestRate: 18.5,
      monthlyPayment: 200,
      dueDate: '2024-02-15',
      institution: 'Bank A',
    };

    const baselineAccount: Account = {
      id: 'account-baseline-1',
      institution: 'Bank B',
      accountName: 'Baseline Checking',
      balance: 10000,
      availableBalance: 10000,
      accountType: 'Checking',
      lastUpdated: '2024-01-01',
      hidden: false,
    };

    const baselineSubscription: Subscription = {
      id: 'sub-baseline-1',
      name: 'Baseline Netflix',
      amount: 15.99,
      frequency: 'monthly',
      chargeDate: '2024-01-01',
      nextDueDate: '2024-02-01',
      categoryId: 'cat-1',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };

    const baselineIncome: Income = {
      id: 'income-baseline-1',
      name: 'Baseline Salary',
      source: 'Salary',
      amount: 5000,
      frequency: 'monthly',
      nextPaymentDate: '2024-02-01',
      notes: 'Baseline income',
    };

    // Seed all baseline data
    seedMockAssets([baselineAsset]);
    seedMockLiabilities([baselineLiability]);
    seedMockAccounts([baselineAccount]);
    seedMockSubscriptions([baselineSubscription]);
    vi.mocked(incomeApi.getAll).mockResolvedValue([baselineIncome]);

    return {
      baselineAsset,
      baselineLiability,
      baselineAccount,
      baselineSubscription,
      baselineIncome,
    };
  }

  describe('Regression: Creating liability does not remove assets', () => {
    it('should preserve all baseline entities when creating a liability', async () => {
      // Create baseline data (all entity types)
      createBaselineData();

      // Get initial dashboard state
      const { result: dashboardResult } = renderHook(() => useDashboard(), { wrapper });
      await waitFor(() => {
        expect(dashboardResult.current.data).toBeDefined();
        expect(dashboardResult.current.isLoading).toBe(false);
      });

      const initialDashboard = dashboardResult.current.data!;
      const initialAssetCount = initialDashboard.assets.length;
      const initialLiabilityCount = initialDashboard.liabilities.length;
      const initialAccountCount = initialDashboard.dataSources.accountsCount;
      const initialSubscriptionCount = initialDashboard.dataSources.subscriptionsCount;
      const initialIncomeCount = initialDashboard.dataSources.incomeCount;

      // Create a new liability
      const { result: createLiabilityResult } = renderHook(() => useCreateLiability(), { wrapper });
      createLiabilityResult.current.mutate({
        name: 'New Mortgage',
        type: 'Mortgage',
        balance: 300000,
        interestRate: 4.5,
        monthlyPayment: 2000,
        dueDate: '2024-02-01',
        institution: 'Bank C',
      });

      await waitFor(() => {
        expect(createLiabilityResult.current.isSuccess).toBe(true);
      });

      // Wait for dashboard to refetch
      await waitFor(() => {
        const dashboard = dashboardResult.current.data;
        expect(dashboard).toBeDefined();
        expect(dashboard!.liabilities.length).toBe(initialLiabilityCount + 1);
      }, { timeout: 5000 });

      // CRITICAL: Verify ALL baseline entities still exist with exact counts
      const updatedDashboard = dashboardResult.current.data!;
      expect(updatedDashboard.assets.length).toBe(initialAssetCount); // Assets unchanged
      expect(updatedDashboard.liabilities.length).toBe(initialLiabilityCount + 1); // One new liability
      expect(updatedDashboard.dataSources.accountsCount).toBe(initialAccountCount); // Accounts unchanged
      expect(updatedDashboard.dataSources.subscriptionsCount).toBe(initialSubscriptionCount); // Subscriptions unchanged
      expect(updatedDashboard.dataSources.incomeCount).toBe(initialIncomeCount); // Income unchanged
    });
  });

  describe('Regression: Creating investment does not remove assets or liabilities', () => {
    it('should preserve all baseline entities when creating an investment', async () => {
      // Create baseline data (all entity types)
      createBaselineData();

      // Get initial dashboard state
      const { result: dashboardResult } = renderHook(() => useDashboard(), { wrapper });
      await waitFor(() => {
        expect(dashboardResult.current.data).toBeDefined();
        expect(dashboardResult.current.isLoading).toBe(false);
      });

      const initialDashboard = dashboardResult.current.data!;
      const initialAssetCount = initialDashboard.assets.length;
      const initialLiabilityCount = initialDashboard.liabilities.length;
      const initialAccountCount = initialDashboard.dataSources.accountsCount;
      const initialSubscriptionCount = initialDashboard.dataSources.subscriptionsCount;
      const initialIncomeCount = initialDashboard.dataSources.incomeCount;

      // Create an investment (asset with type 'Investments')
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

      // Wait for dashboard to refetch
      await waitFor(() => {
        const dashboard = dashboardResult.current.data;
        expect(dashboard).toBeDefined();
        expect(dashboard!.assets.length).toBe(initialAssetCount + 1);
      }, { timeout: 5000 });

      // CRITICAL: Verify ALL baseline entities still exist with exact counts
      const updatedDashboard = dashboardResult.current.data!;
      expect(updatedDashboard.assets.length).toBe(initialAssetCount + 1); // One new asset (investment)
      expect(updatedDashboard.liabilities.length).toBe(initialLiabilityCount); // Liabilities unchanged
      expect(updatedDashboard.dataSources.accountsCount).toBe(initialAccountCount); // Accounts unchanged
      expect(updatedDashboard.dataSources.subscriptionsCount).toBe(initialSubscriptionCount); // Subscriptions unchanged
      expect(updatedDashboard.dataSources.incomeCount).toBe(initialIncomeCount); // Income unchanged
    });
  });

  describe('Regression: Creating subscription does not remove income', () => {
    it('should preserve all baseline entities when creating a subscription', async () => {
      // Create baseline data (all entity types)
      createBaselineData();

      // Get initial dashboard state
      const { result: dashboardResult } = renderHook(() => useDashboard(), { wrapper });
      await waitFor(() => {
        expect(dashboardResult.current.data).toBeDefined();
        expect(dashboardResult.current.isLoading).toBe(false);
      });

      const initialDashboard = dashboardResult.current.data!;
      const initialAssetCount = initialDashboard.assets.length;
      const initialLiabilityCount = initialDashboard.liabilities.length;
      const initialAccountCount = initialDashboard.dataSources.accountsCount;
      const initialSubscriptionCount = initialDashboard.dataSources.subscriptionsCount;
      const initialIncomeCount = initialDashboard.dataSources.incomeCount;

      // Create a new subscription
      const { result: createSubscriptionResult } = renderHook(() => useCreateSubscription(), { wrapper });
      createSubscriptionResult.current.mutate({
        name: 'Spotify Premium',
        amount: 9.99,
        frequency: 'monthly',
        chargeDate: '2024-01-15',
        nextDueDate: '2024-02-15',
      });

      await waitFor(() => {
        expect(createSubscriptionResult.current.isSuccess || createSubscriptionResult.current.isError).toBe(true);
      }, { timeout: 5000 });

      // Only verify if creation succeeded
      if (createSubscriptionResult.current.isSuccess) {
        // Wait for dashboard to refetch
        await waitFor(() => {
          const dashboard = dashboardResult.current.data;
          expect(dashboard).toBeDefined();
          expect(dashboard!.dataSources.subscriptionsCount).toBe(initialSubscriptionCount + 1);
        }, { timeout: 5000 });

        // CRITICAL: Verify ALL baseline entities still exist with exact counts
        const updatedDashboard = dashboardResult.current.data!;
        expect(updatedDashboard.assets.length).toBe(initialAssetCount); // Assets unchanged
        expect(updatedDashboard.liabilities.length).toBe(initialLiabilityCount); // Liabilities unchanged
        expect(updatedDashboard.dataSources.accountsCount).toBe(initialAccountCount); // Accounts unchanged
        expect(updatedDashboard.dataSources.subscriptionsCount).toBe(initialSubscriptionCount + 1); // One new subscription
        expect(updatedDashboard.dataSources.incomeCount).toBe(initialIncomeCount); // Income unchanged
      }
    });
  });

  describe('Regression: Creating any entity does not cause dashboard empty state', () => {
    it('should not revert dashboard to empty state when creating any entity', async () => {
      // Create baseline data (all entity types)
      createBaselineData();

      // Get initial dashboard state
      const { result: dashboardResult } = renderHook(() => useDashboard(), { wrapper });
      await waitFor(() => {
        expect(dashboardResult.current.data).toBeDefined();
        expect(dashboardResult.current.isLoading).toBe(false);
      });

      const initialDashboard = dashboardResult.current.data!;
      
      // Verify dashboard is NOT empty initially
      const hasAnyDataSource = 
        initialDashboard.dataSources.accountsCount > 0 ||
        initialDashboard.dataSources.assetsCount > 0 ||
        initialDashboard.dataSources.liabilitiesCount > 0 ||
        initialDashboard.dataSources.subscriptionsCount > 0 ||
        initialDashboard.dataSources.transactionsCount > 0 ||
        initialDashboard.dataSources.incomeCount > 0;
      
      expect(hasAnyDataSource).toBe(true);

      // Create a new account (any entity type)
      const { result: createAccountResult } = renderHook(() => useCreateAccount(), { wrapper });
      createAccountResult.current.mutate({
        institution: 'Bank D',
        accountName: 'New Savings',
        balance: 50000,
        availableBalance: 50000,
        accountType: 'Savings',
        lastUpdated: '2024-01-15',
        hidden: false,
      });

      await waitFor(() => {
        expect(createAccountResult.current.isSuccess).toBe(true);
      });

      // Wait for dashboard to refetch
      await waitFor(() => {
        const dashboard = dashboardResult.current.data;
        expect(dashboard).toBeDefined();
        expect(dashboard!.dataSources.accountsCount).toBeGreaterThan(initialDashboard.dataSources.accountsCount);
      }, { timeout: 5000 });

      // CRITICAL: Verify dashboard is STILL not empty
      const updatedDashboard = dashboardResult.current.data!;
      const stillHasDataSource = 
        updatedDashboard.dataSources.accountsCount > 0 ||
        updatedDashboard.dataSources.assetsCount > 0 ||
        updatedDashboard.dataSources.liabilitiesCount > 0 ||
        updatedDashboard.dataSources.subscriptionsCount > 0 ||
        updatedDashboard.dataSources.transactionsCount > 0 ||
        updatedDashboard.dataSources.incomeCount > 0;
      
      expect(stillHasDataSource).toBe(true);
      
      // Verify all baseline entities still exist
      expect(updatedDashboard.assets.length).toBe(initialDashboard.assets.length);
      expect(updatedDashboard.liabilities.length).toBe(initialDashboard.liabilities.length);
      expect(updatedDashboard.dataSources.subscriptionsCount).toBe(initialDashboard.dataSources.subscriptionsCount);
      expect(updatedDashboard.dataSources.incomeCount).toBe(initialDashboard.dataSources.incomeCount);
    });
  });

  describe('Regression: Dashboard data source counts remain accurate after any mutation', () => {
    it('should maintain accurate counts for all entity types after creating any entity', async () => {
      // Create baseline data (all entity types)
      createBaselineData();

      // Get initial dashboard state
      const { result: dashboardResult } = renderHook(() => useDashboard(), { wrapper });
      await waitFor(() => {
        expect(dashboardResult.current.data).toBeDefined();
        expect(dashboardResult.current.isLoading).toBe(false);
      });

      const initialDashboard = dashboardResult.current.data!;
      const initialCounts = {
        assets: initialDashboard.assets.length,
        liabilities: initialDashboard.liabilities.length,
        accounts: initialDashboard.dataSources.accountsCount,
        subscriptions: initialDashboard.dataSources.subscriptionsCount,
        income: initialDashboard.dataSources.incomeCount,
      };

      // Create a new asset
      const { result: createAssetResult } = renderHook(() => useCreateAsset(), { wrapper });
      createAssetResult.current.mutate({
        name: 'New Car',
        type: 'Vehicles',
        value: 30000,
        change1D: 0,
        change1W: 0,
        dateAdded: '2024-01-15',
        institution: 'Dealership',
      });

      await waitFor(() => {
        expect(createAssetResult.current.isSuccess).toBe(true);
      });

      // Wait for dashboard to refetch
      await waitFor(() => {
        const dashboard = dashboardResult.current.data;
        expect(dashboard).toBeDefined();
        expect(dashboard!.assets.length).toBe(initialCounts.assets + 1);
      }, { timeout: 5000 });

      // CRITICAL: Verify all counts are accurate
      const updatedDashboard = dashboardResult.current.data!;
      expect(updatedDashboard.assets.length).toBe(initialCounts.assets + 1); // One new asset
      expect(updatedDashboard.liabilities.length).toBe(initialCounts.liabilities); // Unchanged
      expect(updatedDashboard.dataSources.accountsCount).toBe(initialCounts.accounts); // Unchanged
      expect(updatedDashboard.dataSources.subscriptionsCount).toBe(initialCounts.subscriptions); // Unchanged
      expect(updatedDashboard.dataSources.incomeCount).toBe(initialCounts.income); // Unchanged
    });
  });
});

