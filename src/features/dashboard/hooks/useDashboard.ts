import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '@/lib/api';
import { useAuth } from '@clerk/clerk-react';
import type { DashboardData } from '@/types/domain';
import { logger, getCorrelationId } from '@/lib/logger';

/**
 * Custom hook to fetch dashboard data
 * 
 * Uses repository pattern to ensure data consistency with entity creation/update operations.
 * The dashboard reads from the same data sources that mutations write to, preventing
 * data loss bugs where creating an entity causes other entities to disappear.
 * 
 * @returns React Query result with dashboard data, loading state, and error
 * 
 * @example
 * ```tsx
 * const { data, isLoading, error, refetch } = useDashboard();
 * ```
 */
export function useDashboard() {
  const { getToken } = useAuth();
  
  return useQuery<DashboardData>({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const correlationId = getCorrelationId();
      
      // Ensure getToken is available (should always be, but type-safe check)
      if (!getToken) {
        logger.error(
          'DASHBOARD:FETCH',
          'Authentication token provider not available',
          {},
          correlationId || undefined
        );
        throw new Error('Authentication token provider not available');
      }
      
      try {
        logger.debug(
          'DASHBOARD:FETCH',
          'Starting dashboard data fetch',
          {},
          correlationId || undefined
        );
        
        const data = await dashboardApi.getData(getToken);
        
        logger.info(
          'DASHBOARD:FETCH',
          'Dashboard data fetched successfully',
          {
            assetsCount: data.assets?.length || 0,
            liabilitiesCount: data.liabilities?.length || 0,
            accountsCount: 'accounts' in data && Array.isArray(data.accounts) ? data.accounts.length : 0,
            expensesCount: 'expenses' in data && Array.isArray(data.expenses) ? data.expenses.length : 0,
          },
          correlationId || undefined
        );
        
        return data;
      } catch (error) {
        logger.error(
          'DASHBOARD:FETCH',
          'Dashboard data fetch failed',
          { error: error instanceof Error ? error.message : String(error) },
          correlationId || undefined
        );
        throw error;
      }
    },
    // Performance optimization: Disable refetch on window focus to reduce unnecessary requests
    // Dashboard will still update via optimistic updates and manual invalidation
    refetchOnWindowFocus: false,
    // Performance optimization: Cache dashboard data for 2 minutes
    // This prevents immediate refetch on every mutation, allowing optimistic updates to handle UI updates
    staleTime: 1000 * 60 * 2, // 2 minutes
    // Keep cached data for 10 minutes even when not in use
    gcTime: 1000 * 60 * 10, // 10 minutes (formerly cacheTime)
    // Retry configuration for better error handling
    retry: (failureCount, error) => {
      // Don't retry on auth errors
      if (error instanceof Error && error.message.includes('Authentication')) {
        return false;
      }
      // Retry up to 2 times for other errors
      return failureCount < 2;
    },
  });
}

