import type { StatementImportEntity, StatementImportCreate, StatementImportUpdate } from '@/contracts/statementImports';

/**
 * Repository interface for Statement Import operations
 */
export interface StatementImportsRepository {
  /**
   * List all statement imports for the current user, optionally filtered by account
   */
  list(
    accountId?: string,
    getToken?: () => Promise<string | null>
  ): Promise<{
    data: StatementImportEntity[];
    error?: { error: string; code: string };
  }>;

  /**
   * Get a specific statement import by ID
   */
  get(
    id: string,
    getToken: () => Promise<string | null>
  ): Promise<{
    data?: StatementImportEntity;
    error?: { error: string; code: string };
  }>;

  /**
   * Create a new statement import record
   */
  create(
    input: StatementImportCreate,
    getToken: () => Promise<string | null>
  ): Promise<{
    data?: StatementImportEntity;
    error?: { error: string; code: string };
  }>;

  /**
   * Update an existing statement import
   */
  update(
    id: string,
    input: StatementImportUpdate,
    getToken: () => Promise<string | null>
  ): Promise<{
    data?: StatementImportEntity;
    error?: { error: string; code: string };
  }>;

  /**
   * Delete a statement import
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
export async function createStatementImportsRepository(): Promise<StatementImportsRepository> {
  const dataSource = import.meta.env.VITE_DATA_SOURCE || 'supabase';

  if (dataSource === 'supabase') {
    // Dynamic import to avoid loading Supabase client in mock mode
    const { SupabaseStatementImportsRepository } = await import('./supabaseRepo');
    return new SupabaseStatementImportsRepository();
  }

  throw new Error('Mock statement imports repository not yet implemented');
}

