import type { NetWorthPoint } from '@/features/dashboard/hooks/useNetWorthHistory';
import { logger, getCorrelationId } from '@/lib/logger';

/**
 * Repository interface for Net Worth History operations
 */
export interface NetWorthHistoryRepository {
  /**
   * List historical net worth data for the current user
   * @param getToken - Function to get authentication token
   * @param startDate - Optional start date (YYYY-MM-DD)
   * @param endDate - Optional end date (YYYY-MM-DD)
   * @returns Array of NetWorthPoint objects or error
   */
  list(
    getToken: () => Promise<string | null>,
    startDate?: string,
    endDate?: string
  ): Promise<{
    data: NetWorthPoint[] | null;
    error?: { error: string; code: string };
  }>;

  /**
   * Create or update a daily snapshot
   * @param getToken - Function to get authentication token
   * @param date - Date for snapshot (YYYY-MM-DD)
   * @param netWorth - Net worth value
   * @param totalAssets - Total assets value
   * @param totalLiabilities - Total liabilities value
   * @returns Created/updated entity or error
   */
  createSnapshot(
    getToken: () => Promise<string | null>,
    date: string,
    netWorth: number,
    totalAssets: number,
    totalLiabilities: number
  ): Promise<{
    data?: { id: string; date: string; net_worth: number; total_assets: number; total_liabilities: number };
    error?: { error: string; code: string };
  }>;
}

// Cache for repo selection log to avoid excessive logging
let lastRepoSelectionLog: { repo: string; timestamp: number } | null = null;
const REPO_SELECTION_LOG_THROTTLE_MS = 1000; // Log at most once per second

/**
 * Factory function to get the appropriate repository based on data source
 * 
 * CRITICAL: In production, this will throw an error if Supabase is not configured
 */
export function createNetWorthHistoryRepository(): NetWorthHistoryRepository {
  const DATA_SOURCE = import.meta.env.VITE_DATA_SOURCE || 'mock';
  const isProduction = import.meta.env.MODE === 'production' || import.meta.env.PROD === true;
  
  // CRITICAL: Prevent mock repository in production
  if (isProduction && DATA_SOURCE !== 'supabase') {
    const error = new Error(
      'CRITICAL: Cannot use mock NetWorthHistoryRepository in production. ' +
      'Set VITE_DATA_SOURCE=supabase in production environment variables. ' +
      'Data will not persist if mock repository is used.'
    );
    console.error('🚨 PRODUCTION ERROR:', error.message);
    throw error;
  }
  
  const selectedRepo = DATA_SOURCE === 'supabase' ? 'SupabaseNetWorthHistoryRepository' : 'MockNetWorthHistoryRepository';
  
  // Log repo selection (throttled to avoid excessive logs)
  if (import.meta.env.VITE_DEBUG_LOGGING === 'true') {
    const now = Date.now();
    const shouldLog = !lastRepoSelectionLog || 
                      lastRepoSelectionLog.repo !== selectedRepo ||
                      (now - lastRepoSelectionLog.timestamp) > REPO_SELECTION_LOG_THROTTLE_MS;
    
    if (shouldLog) {
      logger.info(
        'DATA:REPO_SELECT',
        'NetWorthHistory repository selected',
        {
          dataSource: DATA_SOURCE,
          selectedRepo,
          envVar: import.meta.env.VITE_DATA_SOURCE,
          defaultUsed: !import.meta.env.VITE_DATA_SOURCE,
          isProduction,
        },
        getCorrelationId() || undefined
      );
      lastRepoSelectionLog = { repo: selectedRepo, timestamp: now };
    }
  }

  if (DATA_SOURCE === 'supabase') {
    return createSupabaseNetWorthHistoryRepository();
  }

  // Only allow mock in development
  if (isProduction) {
    throw new Error('Mock repository cannot be used in production. Configure Supabase.');
  }

  return createMockNetWorthHistoryRepository();
}

// Import implementations
import { MockNetWorthHistoryRepository } from './mockRepo';
import { SupabaseNetWorthHistoryRepository } from './supabaseRepo';

function createMockNetWorthHistoryRepository(): NetWorthHistoryRepository {
  return new MockNetWorthHistoryRepository();
}

function createSupabaseNetWorthHistoryRepository(): NetWorthHistoryRepository {
  return new SupabaseNetWorthHistoryRepository();
}
