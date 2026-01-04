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
import type { Asset, Liability } from '@/types/domain';

// Import seed/clear functions for mock repositories
import { seedMockAssets, clearMockAssets } from '@/data/assets/mockRepo';
import { seedMockLiabilities, clearMockLiabilities } from '@/data/liabilities/mockRepo';
import { clearMockAccounts } from '@/data/accounts/mockRepo';
import { clearMockSubscriptions } from '@/data/subscriptions/mockRepo';
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

// Mock market API and transactions API (incomeApi uses actual implementation)
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

describe('Dashboard Reactivity', () => {
  beforeEach(() => {
    clearMockAssets();
    clearMockLiabilities();
    clearMockAccounts();
    clearMockSubscriptions();
    clearMockDashboardData(); // Clear incomes and other in-memory stores
    queryClient.clear();
  });

  describe('Core CRUD Operations', () => {
    it('should update dashboard when income is created', async () => {
      const { result: dashboardResult } = renderHook(() => useDashboard(), { wrapper });
      
      await waitFor(() => {
        expect(dashboardResult.current.data).toBeDefined();
      });

      expect(dashboardResult.current.data!.dataSources.incomeCount).toBe(0);

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
        },
        { timeout: 3000 }
      );
    });

    it('should update dashboard when asset is created', async () => {
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
        },
        { timeout: 3000 }
      );
    });

    it('should update dashboard when liability is created', async () => {
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
        },
        { timeout: 3000 }
      );
    });

    it('should update Net Worth tile when both asset and liability are created', async () => {
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

      // Verify Net Worth updates
      await waitFor(
        () => {
          const updatedData = dashboardResult.current.data;
          expect(updatedData?.netWorth).toBe(200000); // 500000 - 300000
        },
        { timeout: 3000 }
      );
    });

    it('should exit empty state when subscription is created', async () => {
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
        },
        { timeout: 3000 }
      );
    });

    it('should update Total Cash when account is created', async () => {
      const { result: dashboardResult } = renderHook(() => useDashboard(), { wrapper });
      
      await waitFor(() => {
        expect(dashboardResult.current.data).toBeDefined();
      });

      // Create account
      const { result: createAccountResult } = renderHook(() => useCreateAccount(), { wrapper });
      createAccountResult.current.mutate({
        institution: 'Bank D',
        accountName: 'Bank Account',
        balance: 10000,
        accountType: 'Bank Account',
        lastUpdated: '2024-01-15',
        hidden: false,
      });

      await waitFor(() => {
        expect(createAccountResult.current.isSuccess).toBe(true);
      });

      // Verify Total Cash updates
      await waitFor(
        () => {
          const updatedData = dashboardResult.current.data;
          expect(updatedData?.dataSources.accountsCount).toBe(1);
          expect(updatedData?.totalCash).toBe(10000);
        },
        { timeout: 3000 }
      );
    });

    it('should update dashboard when asset is updated', async () => {
      // Seed initial asset
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

      // Update asset
      const { result: updateAssetResult } = renderHook(() => useUpdateAsset(), { wrapper });
      updateAssetResult.current.mutate({
        id: 'asset-1',
        data: { value: 600000 },
      });

      await waitFor(() => {
        expect(updateAssetResult.current.isSuccess).toBe(true);
      });

      // Verify dashboard updates
      await waitFor(
        () => {
          const updatedData = dashboardResult.current.data;
          const asset = updatedData?.assets.find(a => a.id === 'asset-1');
          expect(asset?.value).toBe(600000);
        },
        { timeout: 3000 }
      );
    });

    it('should update dashboard when liability is deleted', async () => {
      // Seed initial liability
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
      seedMockLiabilities([initialLiability]);

      const { result: dashboardResult } = renderHook(() => useDashboard(), { wrapper });
      
      await waitFor(() => {
        expect(dashboardResult.current.data).toBeDefined();
      });

      expect(dashboardResult.current.data!.dataSources.liabilitiesCount).toBe(1);

      // Delete liability
      const { result: deleteLiabilityResult } = renderHook(() => useDeleteLiability(), { wrapper });
      deleteLiabilityResult.current.mutate('liability-1');

      await waitFor(() => {
        expect(deleteLiabilityResult.current.isSuccess).toBe(true);
      });

      // Verify dashboard updates
      await waitFor(
        () => {
          const updatedData = dashboardResult.current.data;
          expect(updatedData?.dataSources.liabilitiesCount).toBe(0);
        },
        { timeout: 3000 }
      );
    });
  });

  describe('Edge Cases', () => {
    it('should NOT show empty state when asset has $0 value (count > 0)', async () => {
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

      // Verify dashboard does NOT show empty state
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
          expect(hasAnyDataSource).toBe(true); // Should have data
        },
        { timeout: 3000 }
      );
    });

    it('should revert to empty state when last entity is deleted', async () => {
      // Seed initial asset
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

      expect(dashboardResult.current.data!.dataSources.assetsCount).toBe(1);

      // Delete the only asset
      const { result: deleteAssetResult } = renderHook(() => useDeleteAsset(), { wrapper });
      deleteAssetResult.current.mutate('asset-1');

      await waitFor(() => {
        expect(deleteAssetResult.current.isSuccess).toBe(true);
      });

      // Verify dashboard reverts to empty state
      await waitFor(
        () => {
          const updatedData = dashboardResult.current.data;
          expect(updatedData?.dataSources.assetsCount).toBe(0);
          const hasAnyDataSource = 
            updatedData!.dataSources.accountsCount > 0 ||
            updatedData!.dataSources.assetsCount > 0 ||
            updatedData!.dataSources.liabilitiesCount > 0 ||
            updatedData!.dataSources.subscriptionsCount > 0 ||
            updatedData!.dataSources.transactionsCount > 0 ||
            updatedData!.dataSources.incomeCount > 0;
          expect(hasAnyDataSource).toBe(false); // Should be empty
        },
        { timeout: 3000 }
      );
    });

    it('should handle rapid mutations correctly', async () => {
      const { result: dashboardResult } = renderHook(() => useDashboard(), { wrapper });
      
      await waitFor(() => {
        expect(dashboardResult.current.data).toBeDefined();
      });

      // Create multiple entities rapidly
      const { result: createAssetResult } = renderHook(() => useCreateAsset(), { wrapper });
      const { result: createLiabilityResult } = renderHook(() => useCreateLiability(), { wrapper });
      const { result: createAccountResult } = renderHook(() => useCreateAccount(), { wrapper });

      createAssetResult.current.mutate({
        name: 'Asset 1',
        type: 'Real Estate',
        value: 100000,
        change1D: 0,
        change1W: 0,
        dateAdded: '2024-01-01',
        institution: 'Bank',
      });

      createLiabilityResult.current.mutate({
        name: 'Liability 1',
        type: 'Credit Card',
        balance: 5000,
        interestRate: 18.5,
        monthlyPayment: 200,
        dueDate: '2024-02-15',
        institution: 'Bank A',
      });

      createAccountResult.current.mutate({
        institution: 'Bank',
        accountName: 'Bank Account',
        balance: 5000,
        accountType: 'Bank Account',
        lastUpdated: '2024-01-15',
        hidden: false,
      });

      await waitFor(() => {
        expect(createAssetResult.current.isSuccess).toBe(true);
        expect(createLiabilityResult.current.isSuccess).toBe(true);
        expect(createAccountResult.current.isSuccess).toBe(true);
      });

      // Verify all entities appear in dashboard
      await waitFor(
        () => {
          const updatedData = dashboardResult.current.data;
          expect(updatedData?.dataSources.assetsCount).toBe(1);
          expect(updatedData?.dataSources.liabilitiesCount).toBe(1);
          expect(updatedData?.dataSources.accountsCount).toBe(1);
        },
        { timeout: 5000 }
      );
    });
  });
});

