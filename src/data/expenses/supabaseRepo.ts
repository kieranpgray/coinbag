import { createAuthenticatedSupabaseClient } from '@/lib/supabaseClient';
import { logger, getCorrelationId } from '@/lib/logger';
import { ensureUserIdForInsert, verifyInsertedUserId } from '@/lib/repositoryHelpers';
import type { ExpensesRepository } from './repo';
import type { Expense } from '@/types/domain';
import {
  expenseCreateSchema,
  expenseUpdateSchema,
  expenseEntitySchema,
  expenseListSchema,
} from '@/contracts/expenses';
import { z } from 'zod';

/**
 * Supabase implementation of the ExpensesRepository
 */
export class SupabaseExpensesRepository implements ExpensesRepository {
  private readonly selectColumns =
    'id, name, amount, frequency, chargeDate:charge_date, nextDueDate:next_due_date, categoryId:category_id, notes, createdAt:created_at, updatedAt:updated_at, userId:user_id';

  /**
   * Maps expense entity (with userId and timestamps) to domain Expense type (without userId)
   */
  private mapEntityToExpense(entity: z.infer<typeof expenseEntitySchema>): Expense {
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
    data: Expense[];
    error?: { error: string; code: string };
  }> {
    try {
      const supabase = await createAuthenticatedSupabaseClient(getToken);

      const { data, error } = await supabase
        .from('expenses')
        .select(this.selectColumns)
        .order('name');

      if (error) {
        return { data: [], error: this.normalizeSupabaseError(error) };
      }

      // Validate response data
      const validation = expenseListSchema.safeParse(data || []);
      if (!validation.success) {
        logger.error('DB:EXPENSES_LIST', 'Expense list validation error', { error: validation.error }, getCorrelationId() || undefined);
        return {
          data: [],
          error: {
            error: 'Invalid data received from server.',
            code: 'VALIDATION_ERROR',
          },
        };
      }

      // Map entity schema (with userId) to domain Expense type (without userId)
      const expenses = validation.data.map(this.mapEntityToExpense);
      return { data: expenses };
    } catch (error) {
      return {
        data: [],
        error: {
          error: error instanceof Error ? error.message : 'Failed to fetch expenses',
          code: 'UNKNOWN',
        },
      };
    }
  }

  async get(id: string, getToken: () => Promise<string | null>): Promise<{
    data?: Expense;
    error?: { error: string; code: string };
  }> {
    try {
      const supabase = await createAuthenticatedSupabaseClient(getToken);

      const { data, error } = await supabase
        .from('expenses')
        .select(this.selectColumns)
        .eq('id', id)
        .maybeSingle();

      if (error) {
        return { error: this.normalizeSupabaseError(error) };
      }

      if (!data) {
        return { error: { error: 'Expense not found', code: 'NOT_FOUND' } };
      }

      // Validate response data
      const validation = expenseEntitySchema.safeParse(data);
      if (!validation.success) {
        logger.error('DB:EXPENSES_GET', 'Expense validation error', { error: validation.error }, getCorrelationId() || undefined);
        return {
          error: {
            error: 'Invalid data received from server.',
            code: 'VALIDATION_ERROR',
          },
        };
      }

      // Map entity schema to domain Expense type
      const expense = this.mapEntityToExpense(validation.data);
      return { data: expense };
    } catch (error) {
      return {
        error: {
          error: error instanceof Error ? error.message : 'Failed to fetch expense',
          code: 'UNKNOWN',
        },
      };
    }
  }

  async create(
    input: Omit<Expense, 'id'>,
    getToken: () => Promise<string | null>
  ): Promise<{
    data?: Expense;
    error?: { error: string; code: string };
  }> {
    try {
      // Validate input
      const validated = expenseCreateSchema.parse({
        name: input.name,
        amount: input.amount,
        frequency: input.frequency,
        chargeDate: input.chargeDate,
        nextDueDate: input.nextDueDate,
        categoryId: input.categoryId,
        notes: input.notes,
      });

      const supabase = await createAuthenticatedSupabaseClient(getToken);

      // CRITICAL: Explicitly extract and set user_id from JWT
      const userIdResult = await ensureUserIdForInsert(getToken, 'create expense');
      if ('error' in userIdResult) {
        return { error: userIdResult.error };
      }
      const { userId } = userIdResult;

      // Map camelCase to snake_case for database
      const dbInput = {
        user_id: userId, // EXPLICIT: Set user_id from JWT
        name: validated.name,
        amount: validated.amount,
        frequency: validated.frequency,
        charge_date: validated.chargeDate,
        next_due_date: validated.nextDueDate,
        category_id: validated.categoryId, // Database uses 'category_id' column (uuid), not 'category'
        notes: validated.notes,
      };

      const { data, error } = await supabase
        .from('expenses')
        .insert(dbInput)
        .select(this.selectColumns)
        .single();

      if (error) {
        return { error: this.normalizeSupabaseError(error) };
      }

      if (!data) {
        return {
          error: {
            error: 'Failed to create expense - no data returned',
            code: 'UNKNOWN',
          },
        };
      }

      // Validate response data
      const responseValidation = expenseEntitySchema.safeParse(data);
      if (!responseValidation.success) {
        logger.error('DB:EXPENSES_CREATE', 'Expense create response validation error', { error: responseValidation.error }, getCorrelationId() || undefined);
        return {
          error: {
            error: 'Invalid data received from server.',
            code: 'VALIDATION_ERROR',
          },
        };
      }

      // CRITICAL: Verify the inserted record has the correct user_id
      verifyInsertedUserId(responseValidation.data, userId, 'create expense', responseValidation.data.id);

      // Map entity schema to domain Expense type
      const expense = this.mapEntityToExpense(responseValidation.data);
      return { data: expense };
    } catch (error) {
      return {
        error: {
          error: error instanceof Error ? error.message : 'Failed to create expense',
          code: 'UNKNOWN',
        },
      };
    }
  }

  async update(
    id: string,
    input: Partial<Omit<Expense, 'id'>>,
    getToken: () => Promise<string | null>
  ): Promise<{
    data?: Expense;
    error?: { error: string; code: string };
  }> {
    try {
      // Validate input
      const validated = expenseUpdateSchema.parse({
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
        .from('expenses')
        .update(dbInput)
        .eq('id', id)
        .select(this.selectColumns)
        .single();

      if (error) {
        return { error: this.normalizeSupabaseError(error) };
      }

      if (!data) {
        return { error: { error: 'Expense not found', code: 'NOT_FOUND' } };
      }

      // Validate response data
      const responseValidation = expenseEntitySchema.safeParse(data);
      if (!responseValidation.success) {
        logger.error('DB:EXPENSES_UPDATE', 'Expense update response validation error', { error: responseValidation.error }, getCorrelationId() || undefined);
        return {
          error: {
            error: 'Invalid data received from server.',
            code: 'VALIDATION_ERROR',
          },
        };
      }

      // Map entity schema to domain Expense type
      const expense = this.mapEntityToExpense(responseValidation.data);
      return { data: expense };
    } catch (error) {
      return {
        error: {
          error: error instanceof Error ? error.message : 'Failed to update expense',
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
        .from('expenses')
        .delete()
        .eq('id', id);

      if (error) {
        return { error: this.normalizeSupabaseError(error) };
      }

      return {};
    } catch (error) {
      return {
        error: {
          error: error instanceof Error ? error.message : 'Failed to delete expense',
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
        error: 'You do not have permission to access this expense',
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
          error: 'Invalid frequency value. Must be weekly, fortnightly, monthly, quarterly, or yearly',
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

    // Unique violations (shouldn't happen for expenses, but handle anyway)
    if (code === '23505') {
      return {
        error: 'An expense with these details already exists',
        code: 'UNIQUE_VIOLATION',
      };
    }

    // Not found (for update/delete on non-existent record)
    if (code === 'PGRST116' || message.includes('not found')) {
      return {
        error: 'Expense not found',
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

