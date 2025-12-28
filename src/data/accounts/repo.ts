import type { Account } from '@/types/domain';

/**
 * Repository interface for Account operations
 */
export interface AccountsRepository {
  /**
   * List all accounts for the current user
   */
  list(getToken: () => Promise<string | null>): Promise<{
    data: Account[];
    error?: { error: string; code: string };
  }>;

  /**
   * Get a specific account by ID
   */
  get(
    id: string,
    getToken: () => Promise<string | null>
  ): Promise<{
    data?: Account;
    error?: { error: string; code: string };
  }>;

  /**
   * Create a new account
   */
  create(
    input: Omit<Account, 'id'>,
    getToken: () => Promise<string | null>
  ): Promise<{
    data?: Account;
    error?: { error: string; code: string };
  }>;

  /**
   * Update an existing account
   */
  update(
    id: string,
    input: Partial<Omit<Account, 'id'>>,
    getToken: () => Promise<string | null>
  ): Promise<{
    data?: Account;
    error?: { error: string; code: string };
  }>;

  /**
   * Delete an account
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
export function createAccountsRepository(): AccountsRepository {
  const DATA_SOURCE = import.meta.env.VITE_DATA_SOURCE || 'mock';
  const isProduction = import.meta.env.MODE === 'production' || import.meta.env.PROD === true;

  // CRITICAL: Prevent mock repository in production
  if (isProduction && DATA_SOURCE !== 'supabase') {
    throw new Error(
      'CRITICAL: Cannot use mock AccountsRepository in production. ' +
      'Set VITE_DATA_SOURCE=supabase in production environment variables. ' +
      'Data will not persist if mock repository is used.'
    );
  }

  if (DATA_SOURCE === 'supabase') {
    return createSupabaseAccountsRepository();
  }

  return createMockAccountsRepository();
}

// Import implementations
import { MockAccountsRepository } from './mockRepo';
import { SupabaseAccountsRepository } from './supabaseRepo';

function createMockAccountsRepository(): AccountsRepository {
  return new MockAccountsRepository();
}

function createSupabaseAccountsRepository(): AccountsRepository {
  return new SupabaseAccountsRepository();
}
