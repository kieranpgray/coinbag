import type { TransactionEntity } from '@/contracts/transactions';

/**
 * Repository interface for Transaction operations
 */
export interface TransactionsRepository {
  /**
   * List all transactions for the current user, optionally filtered by account
   */
  list(
    accountId?: string,
    getToken?: () => Promise<string | null>
  ): Promise<{
    data: TransactionEntity[];
    error?: { error: string; code: string };
  }>;

  /**
   * Get a specific transaction by ID
   */
  get(
    id: string,
    getToken: () => Promise<string | null>
  ): Promise<{
    data?: TransactionEntity;
    error?: { error: string; code: string };
  }>;

  /**
   * Create a new transaction
   */
  create(
    input: Omit<TransactionEntity, 'id' | 'userId' | 'createdAt' | 'updatedAt'>,
    getToken: () => Promise<string | null>
  ): Promise<{
    data?: TransactionEntity;
    error?: { error: string; code: string };
  }>;

  /**
   * Create multiple transactions in a batch
   */
  createBatch(
    inputs: Array<Omit<TransactionEntity, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>,
    getToken: () => Promise<string | null>
  ): Promise<{
    data?: TransactionEntity[];
    error?: { error: string; code: string };
  }>;

  /**
   * Update an existing transaction
   */
  update(
    id: string,
    input: Partial<Omit<TransactionEntity, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>,
    getToken: () => Promise<string | null>
  ): Promise<{
    data?: TransactionEntity;
    error?: { error: string; code: string };
  }>;

  /**
   * Delete a transaction
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
 */
export async function createTransactionsRepository(): Promise<TransactionsRepository> {
  const dataSource = import.meta.env.VITE_DATA_SOURCE || 'supabase';

  if (dataSource === 'supabase') {
    // Dynamic import to avoid loading Supabase client in mock mode
    const { SupabaseTransactionsRepository } = await import('./supabaseRepo');
    return new SupabaseTransactionsRepository();
  }

  // For now, return a mock implementation
  // In the future, this could be a real mock repository
  throw new Error('Mock transactions repository not yet implemented');
}

