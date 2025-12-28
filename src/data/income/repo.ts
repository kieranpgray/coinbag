import type { Income } from '@/types/domain';

/**
 * Repository interface for Income operations
 */
export interface IncomeRepository {
  /**
   * List all income sources for the current user
   */
  list(getToken: () => Promise<string | null>): Promise<{
    data: Income[];
    error?: { error: string; code: string };
  }>;

  /**
   * Get a specific income source by ID
   */
  get(
    id: string,
    getToken: () => Promise<string | null>
  ): Promise<{
    data?: Income;
    error?: { error: string; code: string };
  }>;

  /**
   * Create a new income source
   */
  create(
    input: Omit<Income, 'id'>,
    getToken: () => Promise<string | null>
  ): Promise<{
    data?: Income;
    error?: { error: string; code: string };
  }>;

  /**
   * Update an existing income source
   */
  update(
    id: string,
    input: Partial<Omit<Income, 'id'>>,
    getToken: () => Promise<string | null>
  ): Promise<{
    data?: Income;
    error?: { error: string; code: string };
  }>;

  /**
   * Delete an income source
   */
  remove(
    id: string,
    getToken: () => Promise<string | null>
  ): Promise<{
    error?: { error: string; code: string };
  }>;
}

/**
 * Factory function to get the appropriate repository based on data source
 * 
 * CRITICAL: In production, this will throw an error if Supabase is not configured
 */
export function createIncomeRepository(): IncomeRepository {
  const DATA_SOURCE = import.meta.env.VITE_DATA_SOURCE || 'mock';
  const isProduction = import.meta.env.MODE === 'production' || import.meta.env.PROD === true;

  // CRITICAL: Prevent mock repository in production
  if (isProduction && DATA_SOURCE !== 'supabase') {
    throw new Error(
      'CRITICAL: Cannot use mock IncomeRepository in production. ' +
      'Set VITE_DATA_SOURCE=supabase in production environment variables. ' +
      'Data will not persist if mock repository is used.'
    );
  }

  if (DATA_SOURCE === 'supabase') {
    return createSupabaseIncomeRepository();
  }

  return createMockIncomeRepository();
}

// Import implementations
import { MockIncomeRepository } from './mockRepo';
import { SupabaseIncomeRepository } from './supabaseRepo';

function createMockIncomeRepository(): IncomeRepository {
  return new MockIncomeRepository();
}

function createSupabaseIncomeRepository(): IncomeRepository {
  return new SupabaseIncomeRepository();
}

