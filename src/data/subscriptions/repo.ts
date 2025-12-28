import type { Subscription } from '@/types/domain';

/**
 * Repository interface for Subscription operations
 */
export interface SubscriptionsRepository {
  /**
   * List all subscriptions for the current user
   */
  list(getToken: () => Promise<string | null>): Promise<{
    data: Subscription[];
    error?: { error: string; code: string };
  }>;

  /**
   * Get a specific subscription by ID
   */
  get(
    id: string,
    getToken: () => Promise<string | null>
  ): Promise<{
    data?: Subscription;
    error?: { error: string; code: string };
  }>;

  /**
   * Create a new subscription
   */
  create(
    input: Omit<Subscription, 'id'>,
    getToken: () => Promise<string | null>
  ): Promise<{
    data?: Subscription;
    error?: { error: string; code: string };
  }>;

  /**
   * Update an existing subscription
   */
  update(
    id: string,
    input: Partial<Omit<Subscription, 'id'>>,
    getToken: () => Promise<string | null>
  ): Promise<{
    data?: Subscription;
    error?: { error: string; code: string };
  }>;

  /**
   * Delete a subscription
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
export function createSubscriptionsRepository(): SubscriptionsRepository {
  const DATA_SOURCE = import.meta.env.VITE_DATA_SOURCE || 'mock';
  const isProduction = import.meta.env.MODE === 'production' || import.meta.env.PROD === true;

  // CRITICAL: Prevent mock repository in production
  if (isProduction && DATA_SOURCE !== 'supabase') {
    throw new Error(
      'CRITICAL: Cannot use mock SubscriptionsRepository in production. ' +
      'Set VITE_DATA_SOURCE=supabase in production environment variables. ' +
      'Data will not persist if mock repository is used.'
    );
  }

  if (DATA_SOURCE === 'supabase') {
    return createSupabaseSubscriptionsRepository();
  }

  return createMockSubscriptionsRepository();
}

// Import implementations
import { MockSubscriptionsRepository } from './mockRepo';
import { SupabaseSubscriptionsRepository } from './supabaseRepo';

function createMockSubscriptionsRepository(): SubscriptionsRepository {
  return new MockSubscriptionsRepository();
}

function createSupabaseSubscriptionsRepository(): SubscriptionsRepository {
  return new SupabaseSubscriptionsRepository();
}
