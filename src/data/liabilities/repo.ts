import type { Liability, LiabilityBalanceHistory } from '@/types/domain';

/**
 * Repository interface for Liability operations
 */
export interface LiabilitiesRepository {
  /**
   * List all liabilities for the current user
   */
  list(getToken: () => Promise<string | null>): Promise<{
    data: Liability[];
    error?: { error: string; code: string };
  }>;

  /**
   * Get a specific liability by ID
   */
  get(
    id: string,
    getToken: () => Promise<string | null>
  ): Promise<{
    data?: Liability;
    error?: { error: string; code: string };
  }>;

  /**
   * Create a new liability
   */
  create(
    input: Omit<Liability, 'id'>,
    getToken: () => Promise<string | null>
  ): Promise<{
    data?: Liability;
    error?: { error: string; code: string };
  }>;

  /**
   * Update an existing liability
   */
  update(
    id: string,
    input: Partial<Omit<Liability, 'id'>>,
    getToken: () => Promise<string | null>
  ): Promise<{
    data?: Liability;
    error?: { error: string; code: string };
  }>;

  /**
   * Delete a liability
   */
  remove(
    id: string,
    getToken: () => Promise<string | null>
  ): Promise<{
    error?: { error: string; code: string };
  }>;

  /**
   * Get balance history for a liability
   */
  getBalanceHistory(
    liabilityId: string,
    getToken: () => Promise<string | null>
  ): Promise<{
    data?: LiabilityBalanceHistory[];
    error?: { error: string; code: string };
  }>;
}

/**
 * Factory function to get the appropriate repository based on data source
 * 
 * CRITICAL: In production, this will throw an error if Supabase is not configured
 */
export function createLiabilitiesRepository(): LiabilitiesRepository {
  const DATA_SOURCE = import.meta.env.VITE_DATA_SOURCE || 'mock';
  const isProduction = import.meta.env.MODE === 'production' || import.meta.env.PROD === true;

  // CRITICAL: Prevent mock repository in production
  if (isProduction && DATA_SOURCE !== 'supabase') {
    throw new Error(
      'CRITICAL: Cannot use mock LiabilitiesRepository in production. ' +
      'Set VITE_DATA_SOURCE=supabase in production environment variables. ' +
      'Data will not persist if mock repository is used.'
    );
  }

  if (DATA_SOURCE === 'supabase') {
    return createSupabaseLiabilitiesRepository();
  }

  return createMockLiabilitiesRepository();
}

// Import implementations
import { MockLiabilitiesRepository } from './mockRepo';
import { SupabaseLiabilitiesRepository } from './supabaseRepo';

function createMockLiabilitiesRepository(): LiabilitiesRepository {
  return new MockLiabilitiesRepository();
}

function createSupabaseLiabilitiesRepository(): LiabilitiesRepository {
  return new SupabaseLiabilitiesRepository();
}
