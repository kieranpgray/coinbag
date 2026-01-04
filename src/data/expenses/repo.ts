import type { Expense } from '@/types/domain';

/**
 * Repository interface for Expense operations
 */
export interface ExpensesRepository {
  /**
   * List all expenses for the current user
   */
  list(getToken: () => Promise<string | null>): Promise<{
    data: Expense[];
    error?: { error: string; code: string };
  }>;

  /**
   * Get a specific expense by ID
   */
  get(
    id: string,
    getToken: () => Promise<string | null>
  ): Promise<{
    data?: Expense;
    error?: { error: string; code: string };
  }>;

  /**
   * Create a new expense
   */
  create(
    input: Omit<Expense, 'id'>,
    getToken: () => Promise<string | null>
  ): Promise<{
    data?: Expense;
    error?: { error: string; code: string };
  }>;

  /**
   * Update an existing expense
   */
  update(
    id: string,
    input: Partial<Omit<Expense, 'id'>>,
    getToken: () => Promise<string | null>
  ): Promise<{
    data?: Expense;
    error?: { error: string; code: string };
  }>;

  /**
   * Delete an expense
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
export function createExpensesRepository(): ExpensesRepository {
  const DATA_SOURCE = import.meta.env.VITE_DATA_SOURCE || 'mock';
  const isProduction = import.meta.env.MODE === 'production' || import.meta.env.PROD === true;

  // CRITICAL: Prevent mock repository in production
  if (isProduction && DATA_SOURCE !== 'supabase') {
    throw new Error(
      'CRITICAL: Cannot use mock ExpensesRepository in production. ' +
      'Set VITE_DATA_SOURCE=supabase in production environment variables. ' +
      'Data will not persist if mock repository is used.'
    );
  }

  if (DATA_SOURCE === 'supabase') {
    return createSupabaseExpensesRepository();
  }

  return createMockExpensesRepository();
}

// Import implementations
import { MockExpensesRepository } from './mockRepo';
import { SupabaseExpensesRepository } from './supabaseRepo';

function createMockExpensesRepository(): ExpensesRepository {
  return new MockExpensesRepository();
}

function createSupabaseExpensesRepository(): ExpensesRepository {
  return new SupabaseExpensesRepository();
}

