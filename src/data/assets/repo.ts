import type { Asset } from '@/types/domain';
import { logger, getCorrelationId } from '@/lib/logger';

/**
 * Repository interface for Asset operations
 */
export interface AssetsRepository {
  /**
   * List all assets for the current user
   */
  list(getToken: () => Promise<string | null>): Promise<{
    data: Asset[];
    error?: { error: string; code: string };
  }>;

  /**
   * Get a specific asset by ID
   */
  get(
    id: string,
    getToken: () => Promise<string | null>
  ): Promise<{
    data?: Asset;
    error?: { error: string; code: string };
  }>;

  /**
   * Create a new asset
   */
  create(
    input: Omit<Asset, 'id'>,
    getToken: () => Promise<string | null>
  ): Promise<{
    data?: Asset;
    error?: { error: string; code: string };
  }>;

  /**
   * Update an existing asset
   */
  update(
    id: string,
    input: Partial<Omit<Asset, 'id'>>,
    getToken: () => Promise<string | null>
  ): Promise<{
    data?: Asset;
    error?: { error: string; code: string };
  }>;

  /**
   * Delete an asset
   */
  remove(
    id: string,
    getToken: () => Promise<string | null>
  ): Promise<{
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
export function createAssetsRepository(): AssetsRepository {
  const DATA_SOURCE = import.meta.env.VITE_DATA_SOURCE || 'mock';
  const isProduction = import.meta.env.MODE === 'production' || import.meta.env.PROD === true;
  
  // CRITICAL: Prevent mock repository in production
  if (isProduction && DATA_SOURCE !== 'supabase') {
    const error = new Error(
      'CRITICAL: Cannot use mock repository in production. ' +
      'Set VITE_DATA_SOURCE=supabase in production environment variables. ' +
      'Data will not persist if mock repository is used.'
    );
    console.error('🚨 PRODUCTION ERROR:', error.message);
    throw error;
  }
  
  const selectedRepo = DATA_SOURCE === 'supabase' ? 'SupabaseAssetsRepository' : 'MockAssetsRepository';
  
  // Log repo selection (throttled to avoid excessive logs)
  if (import.meta.env.VITE_DEBUG_LOGGING === 'true') {
    const now = Date.now();
    const shouldLog = !lastRepoSelectionLog || 
                      lastRepoSelectionLog.repo !== selectedRepo ||
                      (now - lastRepoSelectionLog.timestamp) > REPO_SELECTION_LOG_THROTTLE_MS;
    
    if (shouldLog) {
      logger.info(
        'DATA:REPO_SELECT',
        'Assets repository selected',
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
    return createSupabaseAssetsRepository();
  }

  // Only allow mock in development
  if (isProduction) {
    throw new Error('Mock repository cannot be used in production. Configure Supabase.');
  }

  return createMockAssetsRepository();
}

// Import implementations
import { MockAssetsRepository } from './mockRepo';
import { SupabaseAssetsRepository } from './supabaseRepo';

function createMockAssetsRepository(): AssetsRepository {
  return new MockAssetsRepository();
}

function createSupabaseAssetsRepository(): AssetsRepository {
  return new SupabaseAssetsRepository();
}
