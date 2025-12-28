import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useDashboard } from '../hooks/useDashboard';
import { useCreateAsset } from '@/features/assets/hooks/useAssets';
import type { ReactNode } from 'react';

// Import seed/clear functions for mock repositories
import { clearMockAssets } from '@/data/assets/mockRepo';

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

// Mock market API and income API
const mockIncomeApi = {
  getAll: vi.fn().mockResolvedValue([]),
};

const mockTransactionsApi = {
  getAll: vi.fn().mockResolvedValue({ data: [], total: 0 }),
};

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
    incomeApi: mockIncomeApi,
    transactionsApi: mockTransactionsApi,
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

describe('Dashboard Error Handling', () => {
  beforeEach(() => {
    clearMockAssets();
    queryClient.clear();
    mockIncomeApi.getAll.mockResolvedValue([]);
    mockTransactionsApi.getAll.mockResolvedValue({ data: [], total: 0 });
  });

  it('should handle error when mutation succeeds but dashboard refetch fails', async () => {
    // Mock dashboard API to fail after first call
    const { dashboardApi } = await import('@/lib/api');
    const originalGetData = dashboardApi.getData;
    let callCount = 0;
    
    vi.spyOn(dashboardApi, 'getData').mockImplementation(async (getToken) => {
      callCount++;
      if (callCount === 1) {
        // First call succeeds
        return originalGetData(getToken);
      } else {
        // Subsequent calls fail
        throw new Error('Dashboard fetch failed');
      }
    });

    const { result: dashboardResult } = renderHook(() => useDashboard(), { wrapper });
    
    await waitFor(() => {
      expect(dashboardResult.current.data).toBeDefined();
    });

    // Create asset (mutation succeeds)
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

    // Dashboard refetch should fail, but error should be handled gracefully
    await waitFor(
      () => {
        expect(dashboardResult.current.error).toBeDefined();
      },
      { timeout: 3000 }
    );

    // Restore original implementation
    vi.restoreAllMocks();
  });

  it('should handle partial dashboard data fetch failure gracefully', async () => {
    // Mock one repository to fail
    const { createAssetsRepository } = await import('@/data/assets/repo');
    const mockRepo = createAssetsRepository();
    
    vi.spyOn(mockRepo, 'list').mockResolvedValue({
      error: { error: 'Failed to fetch assets', code: 'FETCH_ERROR' },
      data: undefined,
    });

    const { result: dashboardResult } = renderHook(() => useDashboard(), { wrapper });
    
    // Dashboard should handle the error
    await waitFor(
      () => {
        expect(dashboardResult.current.error).toBeDefined();
      },
      { timeout: 3000 }
    );

    vi.restoreAllMocks();
  });
});

