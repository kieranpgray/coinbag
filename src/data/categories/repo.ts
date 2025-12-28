import type { Category } from '@/types/domain';

/**
 * Repository interface for Category operations
 */
export interface CategoriesRepository {
  /**
   * List all categories for the current user
   */
  list(getToken: () => Promise<string | null>): Promise<{
    data: Category[];
    error?: { error: string; code: string };
  }>;

  /**
   * Get a specific category by ID
   */
  get(
    id: string,
    getToken: () => Promise<string | null>
  ): Promise<{
    data?: Category;
    error?: { error: string; code: string };
  }>;

  /**
   * Create a new category
   */
  create(
    input: { name: string },
    getToken: () => Promise<string | null>
  ): Promise<{
    data?: Category;
    error?: { error: string; code: string };
  }>;

  /**
   * Update an existing category
   */
  update(
    id: string,
    input: { name: string },
    getToken: () => Promise<string | null>
  ): Promise<{
    data?: Category;
    error?: { error: string; code: string };
  }>;

  /**
   * Delete a category
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
export function createCategoriesRepository(): CategoriesRepository {
  const DATA_SOURCE = import.meta.env.VITE_DATA_SOURCE || 'mock';
  const isProduction = import.meta.env.MODE === 'production' || import.meta.env.PROD === true;

  // CRITICAL: Prevent mock repository in production
  if (isProduction && DATA_SOURCE !== 'supabase') {
    throw new Error(
      'CRITICAL: Cannot use mock CategoriesRepository in production. ' +
      'Set VITE_DATA_SOURCE=supabase in production environment variables. ' +
      'Data will not persist if mock repository is used.'
    );
  }

  if (DATA_SOURCE === 'supabase') {
    return createSupabaseCategoriesRepository();
  }

  return createMockCategoriesRepository();
}

// Import implementations
import { MockCategoriesRepository } from './mockRepo';
import { SupabaseCategoriesRepository } from './supabaseRepo';

function createMockCategoriesRepository(): CategoriesRepository {
  return new MockCategoriesRepository();
}

function createSupabaseCategoriesRepository(): CategoriesRepository {
  return new SupabaseCategoriesRepository();
}
