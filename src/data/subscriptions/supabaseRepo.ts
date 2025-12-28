import { createAuthenticatedSupabaseClient } from '@/lib/supabaseClient';
import type { SubscriptionsRepository } from './repo';
import type { Subscription } from '@/types/domain';
import {
  subscriptionCreateSchema,
  subscriptionUpdateSchema,
  subscriptionEntitySchema,
  subscriptionListSchema,
} from '@/contracts/subscriptionsOrExpenses';
import { z } from 'zod';

/**
 * Supabase implementation of the SubscriptionsRepository
 */
export class SupabaseSubscriptionsRepository implements SubscriptionsRepository {
  private readonly selectColumns =
    'id, name, amount, frequency, chargeDate:charge_date, nextDueDate:next_due_date, categoryId:category_id, notes, createdAt:created_at, updatedAt:updated_at, userId:user_id';

  /**
   * Maps subscription entity (with userId and timestamps) to domain Subscription type (without userId)
   */
  private mapEntityToSubscription(entity: z.infer<typeof subscriptionEntitySchema>): Subscription {
    return {
      id: entity.id,
      name: entity.name,
      amount: entity.amount,
      frequency: entity.frequency,
      chargeDate: entity.chargeDate,
      nextDueDate: entity.nextDueDate,
      categoryId: entity.categoryId,
      notes: entity.notes,
    };
  }

  async list(getToken: () => Promise<string | null>): Promise<{
    data: Subscription[];
    error?: { error: string; code: string };
  }> {
    try {
      const supabase = await createAuthenticatedSupabaseClient(getToken);

      const { data, error } = await supabase
        .from('subscriptions')
        .select(this.selectColumns)
        .order('name');

      if (error) {
        return { data: [], error: this.normalizeSupabaseError(error) };
      }

      // Validate response data
      const validation = subscriptionListSchema.safeParse(data || []);
      if (!validation.success) {
        console.error('Subscription list validation error:', validation.error);
        return {
          data: [],
          error: {
            error: 'Invalid data received from server.',
            code: 'VALIDATION_ERROR',
          },
        };
      }

      // Map entity schema (with userId) to domain Subscription type (without userId)
      const subscriptions = validation.data.map(this.mapEntityToSubscription);
      return { data: subscriptions };
    } catch (error) {
      return {
        data: [],
        error: {
          error: error instanceof Error ? error.message : 'Failed to fetch subscriptions',
          code: 'UNKNOWN',
        },
      };
    }
  }

  async get(id: string, getToken: () => Promise<string | null>): Promise<{
    data?: Subscription;
    error?: { error: string; code: string };
  }> {
    try {
      const supabase = await createAuthenticatedSupabaseClient(getToken);

      const { data, error } = await supabase
        .from('subscriptions')
        .select(this.selectColumns)
        .eq('id', id)
        .maybeSingle();

      if (error) {
        return { error: this.normalizeSupabaseError(error) };
      }

      if (!data) {
        return { error: { error: 'Subscription not found', code: 'NOT_FOUND' } };
      }

      // Validate response data
      const validation = subscriptionEntitySchema.safeParse(data);
      if (!validation.success) {
        console.error('Subscription validation error:', validation.error);
        return {
          error: {
            error: 'Invalid data received from server.',
            code: 'VALIDATION_ERROR',
          },
        };
      }

      // Map entity schema to domain Subscription type
      const subscription = this.mapEntityToSubscription(validation.data);
      return { data: subscription };
    } catch (error) {
      return {
        error: {
          error: error instanceof Error ? error.message : 'Failed to fetch subscription',
          code: 'UNKNOWN',
        },
      };
    }
  }

  async create(
    input: Omit<Subscription, 'id'>,
    getToken: () => Promise<string | null>
  ): Promise<{
    data?: Subscription;
    error?: { error: string; code: string };
  }> {
    try {
      // Validate input
      const validated = subscriptionCreateSchema.parse({
        name: input.name,
        amount: input.amount,
        frequency: input.frequency,
        chargeDate: input.chargeDate,
        nextDueDate: input.nextDueDate,
        categoryId: input.categoryId,
        notes: input.notes,
      });

      const supabase = await createAuthenticatedSupabaseClient(getToken);

      // Map camelCase to snake_case for database
      const dbInput = {
        name: validated.name,
        amount: validated.amount,
        frequency: validated.frequency,
        charge_date: validated.chargeDate,
        next_due_date: validated.nextDueDate,
        category_id: validated.categoryId, // Database uses 'category_id' column (uuid), not 'category'
        notes: validated.notes,
      };

      const { data, error } = await supabase
        .from('subscriptions')
        .insert(dbInput)
        .select(this.selectColumns)
        .single();

      if (error) {
        return { error: this.normalizeSupabaseError(error) };
      }

      if (!data) {
        return {
          error: {
            error: 'Failed to create subscription - no data returned',
            code: 'UNKNOWN',
          },
        };
      }

      // Validate response data
      const responseValidation = subscriptionEntitySchema.safeParse(data);
      if (!responseValidation.success) {
        console.error('Subscription create response validation error:', responseValidation.error);
        return {
          error: {
            error: 'Invalid data received from server.',
            code: 'VALIDATION_ERROR',
          },
        };
      }

      // Map entity schema to domain Subscription type
      const subscription = this.mapEntityToSubscription(responseValidation.data);
      return { data: subscription };
    } catch (error) {
      return {
        error: {
          error: error instanceof Error ? error.message : 'Failed to create subscription',
          code: 'UNKNOWN',
        },
      };
    }
  }

  async update(
    id: string,
    input: Partial<Omit<Subscription, 'id'>>,
    getToken: () => Promise<string | null>
  ): Promise<{
    data?: Subscription;
    error?: { error: string; code: string };
  }> {
    try {
      // Validate input
      const validated = subscriptionUpdateSchema.parse({
        name: input.name,
        amount: input.amount,
        frequency: input.frequency,
        chargeDate: input.chargeDate,
        nextDueDate: input.nextDueDate,
        categoryId: input.categoryId,
        notes: input.notes,
      });

      const supabase = await createAuthenticatedSupabaseClient(getToken);

      // Map camelCase to snake_case for database
      const dbInput: Record<string, unknown> = {};
      if (validated.name !== undefined) dbInput.name = validated.name;
      if (validated.amount !== undefined) dbInput.amount = validated.amount;
      if (validated.frequency !== undefined) dbInput.frequency = validated.frequency;
      if (validated.chargeDate !== undefined) dbInput.charge_date = validated.chargeDate;
      if (validated.nextDueDate !== undefined) dbInput.next_due_date = validated.nextDueDate;
      if (validated.categoryId !== undefined) dbInput.category_id = validated.categoryId; // Database uses 'category_id' column (uuid), not 'category'
      if (validated.notes !== undefined) dbInput.notes = validated.notes;

      const { data, error } = await supabase
        .from('subscriptions')
        .update(dbInput)
        .eq('id', id)
        .select(this.selectColumns)
        .single();

      if (error) {
        return { error: this.normalizeSupabaseError(error) };
      }

      if (!data) {
        return { error: { error: 'Subscription not found', code: 'NOT_FOUND' } };
      }

      // Validate response data
      const responseValidation = subscriptionEntitySchema.safeParse(data);
      if (!responseValidation.success) {
        console.error('Subscription update response validation error:', responseValidation.error);
        return {
          error: {
            error: 'Invalid data received from server.',
            code: 'VALIDATION_ERROR',
          },
        };
      }

      // Map entity schema to domain Subscription type
      const subscription = this.mapEntityToSubscription(responseValidation.data);
      return { data: subscription };
    } catch (error) {
      return {
        error: {
          error: error instanceof Error ? error.message : 'Failed to update subscription',
          code: 'UNKNOWN',
        },
      };
    }
  }

  async remove(id: string, getToken: () => Promise<string | null>): Promise<{
    error?: { error: string; code: string };
  }> {
    try {
      const supabase = await createAuthenticatedSupabaseClient(getToken);

      const { error } = await supabase
        .from('subscriptions')
        .delete()
        .eq('id', id);

      if (error) {
        return { error: this.normalizeSupabaseError(error) };
      }

      return {};
    } catch (error) {
      return {
        error: {
          error: error instanceof Error ? error.message : 'Failed to delete subscription',
          code: 'UNKNOWN',
        },
      };
    }
  }

  /**
   * Normalize Supabase errors to user-friendly messages
   */
  private normalizeSupabaseError(error: unknown): { error: string; code: string } {
    // Type guard for PostgrestError
    const isPostgrestError = (err: unknown): err is { code: string; message: string; details?: string; hint?: string } => {
      return typeof err === 'object' && err !== null && 'code' in err && 'message' in err;
    };

    if (!isPostgrestError(error)) {
      return {
        error: 'An unexpected error occurred',
        code: 'UNKNOWN',
      };
    }

    const code = error.code;
    const message = error.message;
    const details = error.details;
    const hint = error.hint;

    // RLS policy violations
    if (code === '42501' || message.includes('policy')) {
      return {
        error: 'You do not have permission to access this subscription',
        code: 'PERMISSION_DENIED',
      };
    }

    // Foreign key violations (category doesn't exist)
    if (code === '23503') {
      return {
        error: 'The selected category does not exist',
        code: 'FOREIGN_KEY_VIOLATION',
      };
    }

    // Check constraint violations (invalid frequency, etc.)
    if (code === '23514') {
      if (message.includes('frequency')) {
        return {
          error: 'Invalid frequency value. Must be weekly, fortnightly, monthly, or yearly',
          code: 'CHECK_CONSTRAINT',
        };
      }
      return {
        error: 'Invalid data provided',
        code: 'CHECK_CONSTRAINT',
      };
    }

    // Not null violations
    if (code === '23502') {
      const field = details || 'required field';
      return {
        error: `Missing required field: ${field}`,
        code: 'NOT_NULL_VIOLATION',
      };
    }

    // Unique violations (shouldn't happen for subscriptions, but handle anyway)
    if (code === '23505') {
      return {
        error: 'A subscription with these details already exists',
        code: 'UNIQUE_VIOLATION',
      };
    }

    // Not found (for update/delete on non-existent record)
    if (code === 'PGRST116' || message.includes('not found')) {
      return {
        error: 'Subscription not found',
        code: 'NOT_FOUND',
      };
    }

    // Authentication errors
    if (code === 'PGRST301' || message.includes('JWT')) {
      return {
        error: 'Authentication required. Please sign in again',
        code: 'AUTH_ERROR',
      };
    }

    // Network/connection errors
    if (message.includes('fetch') || message.includes('network')) {
      return {
        error: 'Network error. Please check your connection and try again',
        code: 'NETWORK_ERROR',
      };
    }

    // Default: return original message with hint if available
    return {
      error: hint || message || 'An error occurred while processing your request',
      code: code || 'UNKNOWN',
    };
  }
}

