import type { Goal } from '@/types/domain';

/**
 * Repository interface for Goal operations
 */
export interface GoalsRepository {
  /**
   * List all goals for the current user
   */
  list(getToken?: () => Promise<string | null>): Promise<{
    data: Goal[];
    error?: { error: string; code: string };
  }>;

  /**
   * Get a specific goal by ID
   */
  get(
    id: string,
    getToken: () => Promise<string | null>
  ): Promise<{
    data?: Goal;
    error?: { error: string; code: string };
  }>;

  /**
   * Create a new goal
   */
  create(
    input: Omit<Goal, 'id'>,
    getToken: () => Promise<string | null>
  ): Promise<{
    data?: Goal;
    error?: { error: string; code: string };
  }>;

  /**
   * Update an existing goal
   */
  update(
    id: string,
    input: Partial<Omit<Goal, 'id'>>,
    getToken: () => Promise<string | null>
  ): Promise<{
    data?: Goal;
    error?: { error: string; code: string };
  }>;

  /**
   * Delete a goal
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
export function createGoalsRepository(): GoalsRepository {
  const DATA_SOURCE = import.meta.env.VITE_DATA_SOURCE || 'mock';
  const isProduction = import.meta.env.MODE === 'production' || import.meta.env.PROD === true;

  // CRITICAL: Prevent mock repository in production
  if (isProduction && DATA_SOURCE !== 'supabase') {
    throw new Error(
      'CRITICAL: Cannot use mock GoalsRepository in production. ' +
      'Set VITE_DATA_SOURCE=supabase in production environment variables. ' +
      'Data will not persist if mock repository is used.'
    );
  }

  if (DATA_SOURCE === 'supabase') {
    return createSupabaseGoalsRepository();
  }

  return createMockGoalsRepository();
}

// Import implementations
import { MockGoalsRepository } from './mockRepo';
import { SupabaseGoalsRepository } from './supabaseRepo';

function createMockGoalsRepository(): GoalsRepository {
  return new MockGoalsRepository();
}

function createSupabaseGoalsRepository(): GoalsRepository {
  return new SupabaseGoalsRepository();
}
