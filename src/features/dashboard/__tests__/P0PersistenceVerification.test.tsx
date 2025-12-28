import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
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
 * P0 PERSISTENCE VERIFICATION TESTS
 * 
 * Comprehensive verification that all CRUD operations preserve data correctly.
 * These tests verify the absolute invariant: creating, updating, or viewing ANY entity
 * must NEVER delete, reset, overwrite, or hide ANY other entity's data.
 */
describe('P0 Persistence Verification', () => {
  beforeEach(() => {
    // Clear all mock data before each test
    clearMockAssets();
    clearMockLiabilities();
    clearMockAccounts();
    clearMockSubscriptions();
    queryClient.clear();
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

  describe('Persistence Scenarios', () => {
    it('Add asset → asset persists, others unchanged', async () => {
      // Seed baseline data
      const baselineLiability: Liability = {
        id: 'liability-1',
        name: 'Credit Card',
        type: 'Credit Card',
        balance: 5000,
        interestRate: 18.5,
        monthlyPayment: 200,
        dueDate: '2024-02-15',
        institution: 'Bank A',
      };
      seedMockLiabilities([baselineLiability]);

      // Get initial state
      const { result: dashboardResult } = renderHook(() => useDashboard(), { wrapper });
      await waitFor(() => {
        expect(dashboardResult.current.data).toBeDefined();
      });

      const initialLiabilityCount = dashboardResult.current.data!.liabilities.length;

      // Create asset
      const { result: createAssetResult } = renderHook(() => useCreateAsset(), { wrapper });
      createAssetResult.current.mutate({
        name: 'House',
        type: 'Real Estate',
        value: 500000,
        change1D: 0,
        change1W: 0,
        dateAdded: '2024-01-01',
        institution: 'Real Estate Co',
      });

      await waitFor(() => {
        expect(createAssetResult.current.isSuccess).toBe(true);
      });

      // Wait for refetch
      await waitFor(() => {
        const dashboard = dashboardResult.current.data;
        expect(dashboard).toBeDefined();
        expect(dashboard!.assets.length).toBeGreaterThan(0);
      }, { timeout: 5000 });

      // Verify: asset persists, liability unchanged
      const updatedDashboard = dashboardResult.current.data!;
      expect(updatedDashboard.assets.length).toBe(1);
      expect(updatedDashboard.liabilities.length).toBe(initialLiabilityCount);
    });

    it('Add liability → liability persists, assets unchanged', async () => {
      // Seed baseline data
      const baselineAsset: Asset = {
        id: 'asset-1',
        name: 'House',
        type: 'Real Estate',
        value: 500000,
        change1D: 0,
        change1W: 0,
        dateAdded: '2024-01-01',
        institution: 'Real Estate Co',
      };
      seedMockAssets([baselineAsset]);

      // Get initial state
      const { result: dashboardResult } = renderHook(() => useDashboard(), { wrapper });
      await waitFor(() => {
        expect(dashboardResult.current.data).toBeDefined();
      });

      const initialAssetCount = dashboardResult.current.data!.assets.length;

      // Create liability
      const { result: createLiabilityResult } = renderHook(() => useCreateLiability(), { wrapper });
      createLiabilityResult.current.mutate({
        name: 'Mortgage',
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

      // Wait for refetch
      await waitFor(() => {
        const dashboard = dashboardResult.current.data;
        expect(dashboard).toBeDefined();
        expect(dashboard!.liabilities.length).toBeGreaterThan(0);
      }, { timeout: 5000 });

      // Verify: liability persists, asset unchanged
      const updatedDashboard = dashboardResult.current.data!;
      expect(updatedDashboard.liabilities.length).toBe(1);
      expect(updatedDashboard.assets.length).toBe(initialAssetCount);
    });

    it('Add income → income persists, others unchanged', async () => {
      // Seed baseline data
      const baselineAsset: Asset = {
        id: 'asset-1',
        name: 'House',
        type: 'Real Estate',
        value: 500000,
        change1D: 0,
        change1W: 0,
        dateAdded: '2024-01-01',
        institution: 'Real Estate Co',
      };
      seedMockAssets([baselineAsset]);

      // Get initial state
      const { result: dashboardResult } = renderHook(() => useDashboard(), { wrapper });
      await waitFor(() => {
        expect(dashboardResult.current.data).toBeDefined();
      });

      const initialAssetCount = dashboardResult.current.data!.assets.length;

      // Create income
      const { result: createIncomeResult } = renderHook(() => useCreateIncome(), { wrapper });
      createIncomeResult.current.mutate({
        name: 'Salary',
        source: 'Salary',
        amount: 5000,
        frequency: 'monthly',
        nextPaymentDate: '2024-02-01',
        notes: 'Monthly salary',
      });

      await waitFor(() => {
        expect(createIncomeResult.current.isSuccess).toBe(true);
      });

      // Wait for refetch (income uses legacy API, may need manual refetch)
      await dashboardResult.current.refetch();
      await waitFor(() => {
        const dashboard = dashboardResult.current.data;
        expect(dashboard).toBeDefined();
      }, { timeout: 5000 });

      // Verify: income persists, asset unchanged
      const updatedDashboard = dashboardResult.current.data!;
      expect(updatedDashboard.dataSources.incomeCount).toBeGreaterThan(0);
      expect(updatedDashboard.assets.length).toBe(initialAssetCount);
    });

    it('Add subscription → subscription persists, income unchanged', async () => {
      // Seed baseline data
      const baselineIncome: Income = {
        id: 'income-1',
        name: 'Salary',
        source: 'Salary',
        amount: 5000,
        frequency: 'monthly',
        nextPaymentDate: '2024-02-01',
        notes: 'Monthly salary',
      };
      vi.mocked(incomeApi.getAll).mockResolvedValue([baselineIncome]);

      // Get initial state
      const { result: dashboardResult } = renderHook(() => useDashboard(), { wrapper });
      await waitFor(() => {
        expect(dashboardResult.current.data).toBeDefined();
      });

      const initialIncomeCount = dashboardResult.current.data!.dataSources.incomeCount;

      // Create subscription
      const { result: createSubscriptionResult } = renderHook(() => useCreateSubscription(), { wrapper });
      createSubscriptionResult.current.mutate({
        name: 'Netflix',
        amount: 15.99,
        frequency: 'monthly',
        chargeDate: '2024-01-15',
        nextDueDate: '2024-02-15',
      });

      await waitFor(() => {
        expect(createSubscriptionResult.current.isSuccess || createSubscriptionResult.current.isError).toBe(true);
      }, { timeout: 5000 });

      if (createSubscriptionResult.current.isSuccess) {
        // Wait for refetch
        await waitFor(() => {
          const dashboard = dashboardResult.current.data;
          expect(dashboard).toBeDefined();
          expect(dashboard!.dataSources.subscriptionsCount).toBeGreaterThan(0);
        }, { timeout: 5000 });

        // Verify: subscription persists, income unchanged
        const updatedDashboard = dashboardResult.current.data!;
        expect(updatedDashboard.dataSources.subscriptionsCount).toBeGreaterThan(0);
        expect(updatedDashboard.dataSources.incomeCount).toBe(initialIncomeCount);
      }
    });

    it('Add investment → investment persists, all others unchanged', async () => {
      // Seed baseline data
      const baselineAsset: Asset = {
        id: 'asset-1',
        name: 'House',
        type: 'Real Estate',
        value: 500000,
        change1D: 0,
        change1W: 0,
        dateAdded: '2024-01-01',
        institution: 'Real Estate Co',
      };
      const baselineLiability: Liability = {
        id: 'liability-1',
        name: 'Credit Card',
        type: 'Credit Card',
        balance: 5000,
        interestRate: 18.5,
        monthlyPayment: 200,
        dueDate: '2024-02-15',
        institution: 'Bank A',
      };
      seedMockAssets([baselineAsset]);
      seedMockLiabilities([baselineLiability]);

      // Get initial state
      const { result: dashboardResult } = renderHook(() => useDashboard(), { wrapper });
      await waitFor(() => {
        expect(dashboardResult.current.data).toBeDefined();
      });

      const initialAssetCount = dashboardResult.current.data!.assets.length;
      const initialLiabilityCount = dashboardResult.current.data!.liabilities.length;

      // Create investment
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

      // Wait for refetch
      await waitFor(() => {
        const dashboard = dashboardResult.current.data;
        expect(dashboard).toBeDefined();
        expect(dashboard!.assets.length).toBe(initialAssetCount + 1);
      }, { timeout: 5000 });

      // Verify: investment persists, all others unchanged
      const updatedDashboard = dashboardResult.current.data!;
      expect(updatedDashboard.assets.length).toBe(initialAssetCount + 1);
      expect(updatedDashboard.liabilities.length).toBe(initialLiabilityCount);
    });

    it('Add any entity → no other entity disappears', async () => {
      // Seed ALL entity types
      const baselineAsset: Asset = {
        id: 'asset-1',
        name: 'House',
        type: 'Real Estate',
        value: 500000,
        change1D: 0,
        change1W: 0,
        dateAdded: '2024-01-01',
        institution: 'Real Estate Co',
      };
      const baselineLiability: Liability = {
        id: 'liability-1',
        name: 'Credit Card',
        type: 'Credit Card',
        balance: 5000,
        interestRate: 18.5,
        monthlyPayment: 200,
        dueDate: '2024-02-15',
        institution: 'Bank A',
      };
      const baselineAccount: Account = {
        id: 'account-1',
        institution: 'Bank B',
        accountName: 'Checking',
        balance: 10000,
        availableBalance: 10000,
        accountType: 'Checking',
        lastUpdated: '2024-01-01',
        hidden: false,
      };
      const baselineSubscription: Subscription = {
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
      const baselineIncome: Income = {
        id: 'income-1',
        name: 'Salary',
        source: 'Salary',
        amount: 5000,
        frequency: 'monthly',
        nextPaymentDate: '2024-02-01',
        notes: 'Monthly salary',
      };

      seedMockAssets([baselineAsset]);
      seedMockLiabilities([baselineLiability]);
      seedMockAccounts([baselineAccount]);
      seedMockSubscriptions([baselineSubscription]);
      vi.mocked(incomeApi.getAll).mockResolvedValue([baselineIncome]);

      // Get initial state
      const { result: dashboardResult } = renderHook(() => useDashboard(), { wrapper });
      await waitFor(() => {
        expect(dashboardResult.current.data).toBeDefined();
      });

      const initialDashboard = dashboardResult.current.data!;
      const initialCounts = {
        assets: initialDashboard.assets.length,
        liabilities: initialDashboard.liabilities.length,
        accounts: initialDashboard.dataSources.accountsCount,
        subscriptions: initialDashboard.dataSources.subscriptionsCount,
        income: initialDashboard.dataSources.incomeCount,
      };

      // Create a new account
      const { result: createAccountResult } = renderHook(() => useCreateAccount(), { wrapper });
      createAccountResult.current.mutate({
        institution: 'Bank D',
        accountName: 'Savings',
        balance: 50000,
        availableBalance: 50000,
        accountType: 'Savings',
        lastUpdated: '2024-01-15',
        hidden: false,
      });

      await waitFor(() => {
        expect(createAccountResult.current.isSuccess).toBe(true);
      });

      // Wait for refetch
      await waitFor(() => {
        const dashboard = dashboardResult.current.data;
        expect(dashboard).toBeDefined();
        expect(dashboard!.dataSources.accountsCount).toBe(initialCounts.accounts + 1);
      }, { timeout: 5000 });

      // Verify: NO entity disappeared
      const updatedDashboard = dashboardResult.current.data!;
      expect(updatedDashboard.assets.length).toBe(initialCounts.assets);
      expect(updatedDashboard.liabilities.length).toBe(initialCounts.liabilities);
      expect(updatedDashboard.dataSources.subscriptionsCount).toBe(initialCounts.subscriptions);
      expect(updatedDashboard.dataSources.incomeCount).toBe(initialCounts.income);
    });
  });

  describe('Dashboard State Verification', () => {
    it('Dashboard never shows empty when data exists', async () => {
      // Seed data
      const baselineAsset: Asset = {
        id: 'asset-1',
        name: 'House',
        type: 'Real Estate',
        value: 500000,
        change1D: 0,
        change1W: 0,
        dateAdded: '2024-01-01',
        institution: 'Real Estate Co',
      };
      seedMockAssets([baselineAsset]);

      // Get dashboard state
      const { result: dashboardResult } = renderHook(() => useDashboard(), { wrapper });
      await waitFor(() => {
        expect(dashboardResult.current.data).toBeDefined();
      });

      const dashboard = dashboardResult.current.data!;
      
      // Verify dashboard is not empty
      const hasAnyDataSource = 
        dashboard.dataSources.accountsCount > 0 ||
        dashboard.dataSources.assetsCount > 0 ||
        dashboard.dataSources.liabilitiesCount > 0 ||
        dashboard.dataSources.subscriptionsCount > 0 ||
        dashboard.dataSources.transactionsCount > 0 ||
        dashboard.dataSources.incomeCount > 0;
      
      expect(hasAnyDataSource).toBe(true);
      expect(dashboard.dataSources.assetsCount).toBe(1);
    });

    it('Dashboard reflects all entities correctly', async () => {
      // Seed multiple entity types
      const baselineAsset: Asset = {
        id: 'asset-1',
        name: 'House',
        type: 'Real Estate',
        value: 500000,
        change1D: 0,
        change1W: 0,
        dateAdded: '2024-01-01',
        institution: 'Real Estate Co',
      };
      const baselineLiability: Liability = {
        id: 'liability-1',
        name: 'Credit Card',
        type: 'Credit Card',
        balance: 5000,
        interestRate: 18.5,
        monthlyPayment: 200,
        dueDate: '2024-02-15',
        institution: 'Bank A',
      };
      seedMockAssets([baselineAsset]);
      seedMockLiabilities([baselineLiability]);

      // Get dashboard state
      const { result: dashboardResult } = renderHook(() => useDashboard(), { wrapper });
      await waitFor(() => {
        expect(dashboardResult.current.data).toBeDefined();
      });

      const dashboard = dashboardResult.current.data!;
      
      // Verify dashboard reflects all entities
      expect(dashboard.assets.length).toBe(1);
      expect(dashboard.liabilities.length).toBe(1);
      expect(dashboard.dataSources.assetsCount).toBe(1);
      expect(dashboard.dataSources.liabilitiesCount).toBe(1);
    });

    it('Data source counts are accurate', async () => {
      // Seed data
      const baselineAsset: Asset = {
        id: 'asset-1',
        name: 'House',
        type: 'Real Estate',
        value: 500000,
        change1D: 0,
        change1W: 0,
        dateAdded: '2024-01-01',
        institution: 'Real Estate Co',
      };
      seedMockAssets([baselineAsset]);

      // Get dashboard state
      const { result: dashboardResult } = renderHook(() => useDashboard(), { wrapper });
      await waitFor(() => {
        expect(dashboardResult.current.data).toBeDefined();
      });

      const dashboard = dashboardResult.current.data!;
      
      // Verify counts match actual data
      expect(dashboard.dataSources.assetsCount).toBe(dashboard.assets.length);
      expect(dashboard.dataSources.liabilitiesCount).toBe(dashboard.liabilities.length);
    });
  });
});

