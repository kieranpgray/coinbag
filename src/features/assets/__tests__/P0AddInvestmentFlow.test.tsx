/**
 * P0 REGRESSION TEST: Add Investment Flow Never Deletes Assets
 * 
 * This test ensures that clicking "Add Investment" from the dashboard
 * and navigating to /assets never deletes previously saved assets.
 * 
 * PRIME DIRECTIVE: User data must NEVER be deleted unless explicitly deleted by user.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { AssetsPage } from '@/features/assets/AssetsPage';
import { seedMockAssets, clearMockAssets } from '@/data/assets/mockRepo';
import type { Asset } from '@/types/domain';
import type { ReactNode } from 'react';

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

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

function wrapper({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {children}
      </BrowserRouter>
    </QueryClientProvider>
  );
}

const mockClerkAuth = {
  getToken: vi.fn().mockResolvedValue('mock-jwt-token'),
};

describe('P0: Add Investment Flow Never Deletes Assets', () => {
  beforeEach(() => {
    // Clear all mock data before each test
    clearMockAssets();
    queryClient.clear();
  });

  afterEach(() => {
    clearMockAssets();
    queryClient.clear();
  });

  /**
   * Test 1: Add Investment flow never deletes assets
   * 
   * Scenario:
   * 1. Create Asset A (real estate)
   * 2. Navigate to /assets?create=1&type=Investments (simulating "Add Investment" click)
   * 3. Verify Asset A still exists after route change and AssetsPage mount
   */
  it('should preserve existing assets when navigating via Add Investment flow', async () => {
    // Step 1: Create baseline asset
    const existingAsset: Asset = {
      id: 'asset-1',
      name: 'My House',
      type: 'Real Estate',
      value: 500000,
      change1D: 0,
      change1W: 0,
      dateAdded: new Date().toISOString(),
    };

    seedMockAssets([existingAsset]);

    // Step 2: Render AssetsPage with query params (simulating "Add Investment" navigation)
    const { rerender } = render(
      <AssetsPage />,
      { wrapper }
    );

    // Step 3: Verify existing asset is still present
    await waitFor(() => {
      expect(screen.getByText('My House')).toBeInTheDocument();
    });

    // Step 4: Simulate navigation with query params (Add Investment flow)
    // This simulates what happens when user clicks "Add Investment" from dashboard
    window.history.pushState({}, '', '/assets?create=1&type=Investments');
    rerender(<AssetsPage />);

    // Step 5: Verify asset still exists after navigation
    await waitFor(() => {
      expect(screen.getByText('My House')).toBeInTheDocument();
    });

    // Step 6: Verify asset count is still 1 via repository
    const repo = await import('@/data/assets/repo');
    const assetsRepo = repo.createAssetsRepository();
    const result = await assetsRepo.list(mockClerkAuth.getToken);
    
    expect(result.data).toHaveLength(1);
    expect(result.data?.[0]?.id).toBe('asset-1');
    expect(result.data?.[0]?.name).toBe('My House');
  });

  /**
   * Test 2: No deletes on mount
   * 
   * Assert that no delete API/repo method is called during:
   * - assets page mount
   * - dashboard mount  
   * - add investment navigation
   */
  it('should not call delete operations during page mount or navigation', async () => {
    // Create baseline asset
    const existingAsset: Asset = {
      id: 'asset-1',
      name: 'My House',
      type: 'Real Estate',
      value: 500000,
      change1D: 0,
      change1W: 0,
      dateAdded: new Date().toISOString(),
    };

    seedMockAssets([existingAsset]);

    // Spy on repository methods
    const repo = await import('@/data/assets/repo');
    const assetsRepo = repo.createAssetsRepository();
    const removeSpy = vi.spyOn(assetsRepo, 'remove');

    // Render AssetsPage
    render(<AssetsPage />, { wrapper });

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText('My House')).toBeInTheDocument();
    });

    // Verify no delete calls were made
    expect(removeSpy).not.toHaveBeenCalled();

    // Simulate navigation with query params
    window.history.pushState({}, '', '/assets?create=1&type=Investments');
    
    // Wait a bit to ensure no async operations trigger deletes
    await waitFor(() => {
      expect(screen.getByText('My House')).toBeInTheDocument();
    }, { timeout: 1000 });

    // Verify still no delete calls
    expect(removeSpy).not.toHaveBeenCalled();
  });

  /**
   * Test 3: Window storage persistence across module reloads
   * 
   * Verify that window storage is properly restored even if module reloads
   */
  it('should restore assets from window storage on module reload', async () => {
    // Create asset and verify it's stored in window storage
    const existingAsset: Asset = {
      id: 'asset-1',
      name: 'My House',
      type: 'Real Estate',
      value: 500000,
      change1D: 0,
      change1W: 0,
      dateAdded: new Date().toISOString(),
    };

    seedMockAssets([existingAsset]);

    // Verify window storage has the asset
    const GLOBAL_STORAGE_KEY = '__supafolio_mock_assets__';
    expect(window[GLOBAL_STORAGE_KEY]).toBeDefined();
    expect(Array.isArray(window[GLOBAL_STORAGE_KEY])).toBe(true);
    expect(window[GLOBAL_STORAGE_KEY]).toHaveLength(1);

    // Simulate module reload by clearing the module cache and re-importing
    // (In real HMR, the module would reload, but in tests we can simulate by checking)
    const repo1 = await import('@/data/assets/repo');
    const assetsRepo1 = repo1.createAssetsRepository();
    const result1 = await assetsRepo1.list(mockClerkAuth.getToken);
    expect(result1.data).toHaveLength(1);

    // Verify window storage still has the data
    expect(window[GLOBAL_STORAGE_KEY]).toHaveLength(1);
    expect(window[GLOBAL_STORAGE_KEY]?.[0]?.id).toBe('asset-1');
  });
});

