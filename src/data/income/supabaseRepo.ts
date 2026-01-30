import type { IncomeRepository } from './repo';
import { createAuthenticatedSupabaseClient } from '@/lib/supabaseClient';
import { ensureUserIdForInsert, verifyInsertedUserId } from '@/lib/repositoryHelpers';
import {
  incomeCreateSchema,
  incomeUpdateSchema,
  incomeListSchema,
  incomeEntitySchema,
  INCOME_ERROR_CODES,
} from '@/contracts/income';
import type { Income } from '@/types/domain';
import { logger, getCorrelationId } from '@/lib/logger';
import { z } from 'zod';

/**
 * Supabase implementation of IncomeRepository
 * 
 * Handles all CRUD operations for income stored in Supabase PostgreSQL database.
 * Uses Clerk JWT authentication and Row Level Security (RLS) for data isolation.
 */
export class SupabaseIncomeRepository implements IncomeRepository {
  private readonly selectColumns =
    'id, name, source, amount, frequency, nextPaymentDate:next_payment_date, paidToAccountId:paid_to_account_id, userId:user_id, createdAt:created_at, updatedAt:updated_at';

  /**
   * Maps income entity (with userId and timestamps) to domain Income type (without userId)
   * Handles date conversion from various formats to consistent YYYY-MM-DD
   */
  private mapEntityToIncome(entity: z.infer<typeof incomeEntitySchema>): Income {
    // nextPaymentDate is optional, convert null to undefined for domain type
    const nextPaymentDate = entity.nextPaymentDate === null ? undefined : entity.nextPaymentDate;
    
    return {
      id: entity.id,
      name: entity.name,
      source: entity.source,
      amount: entity.amount,
      // Type assertion: incomeFrequencySchema includes 'quarterly', matching SubscriptionFrequency
      frequency: entity.frequency as Income['frequency'],
      nextPaymentDate,
      paidToAccountId: entity.paidToAccountId,
    };
  }

  /**
   * Normalize Supabase errors to user-friendly messages
   */
  private normalizeSupabaseError(error: unknown): { error: string; code: string } {
    if (!error || typeof error !== 'object') {
      return {
        error: 'An unexpected error occurred.',
        code: INCOME_ERROR_CODES.UNKNOWN_ERROR,
      };
    }

    const err = error as Record<string, unknown> & {
      code?: unknown;
      message?: unknown;
      details?: unknown;
    };
    const errorCode = typeof err.code === 'string' ? err.code : undefined;

    // Handle known PostgreSQL/Supabase error codes
    if (errorCode === '23505') { // Unique violation
      return {
        error: 'An income source with this name already exists for your account.',
        code: INCOME_ERROR_CODES.DUPLICATE_ENTRY,
      };
    }
    if (errorCode === '23503') { // Foreign key violation
      return {
        error: 'Referenced entity not found or permission denied.',
        code: INCOME_ERROR_CODES.PERMISSION_DENIED,
      };
    }
    if (errorCode === '23514') { // Check constraint violation
      return {
        error: 'Invalid income data provided (e.g., amount out of range).',
        code: INCOME_ERROR_CODES.VALIDATION_ERROR,
      };
    }
    if (errorCode === 'PGRST116') { // No rows found for single()
      return {
        error: 'Income not found.',
        code: INCOME_ERROR_CODES.NOT_FOUND,
      };
    }
    if (errorCode === 'PGRST301') { // RLS policy violation
      return {
        error: 'You do not have permission to access this income source.',
        code: INCOME_ERROR_CODES.PERMISSION_DENIED,
      };
    }

    // Handle specific Supabase error patterns
    const message = typeof err.message === 'string' ? err.message : undefined;
    if (message?.includes('JWT')) {
      return {
        error: 'Authentication token expired. Please sign in again.',
        code: INCOME_ERROR_CODES.AUTH_EXPIRED,
      };
    }
    if (message?.includes('permission')) {
      return {
        error: 'You do not have permission to perform this action.',
        code: INCOME_ERROR_CODES.PERMISSION_DENIED,
      };
    }

    // Default error with more context
    return {
      error:
        (typeof err.message === 'string' && err.message) ||
        (typeof err.details === 'string' && err.details) ||
        'An unexpected error occurred.',
      code: INCOME_ERROR_CODES.UNKNOWN_ERROR,
    };
  }

  async list(getToken: () => Promise<string | null>) {
    try {
      const correlationId = getCorrelationId();
      logger.debug('DB:INCOME_LIST', 'SupabaseIncomeRepository.list called', { repoType: 'SupabaseIncomeRepository' }, correlationId || undefined);

      const supabase = await createAuthenticatedSupabaseClient(getToken);

      const { data, error } = await supabase
        .from('income')
        .select(this.selectColumns)
        .order('name', { ascending: true });

      if (error) {
        logger.error('DB:INCOME_LIST', 'Failed to list income from Supabase', { error: error.message, code: error.code }, correlationId || undefined);
        return {
          data: [],
          error: this.normalizeSupabaseError(error),
        };
      }

      // Validate response data
      const validation = incomeListSchema.safeParse(data || []);
      if (!validation.success) {
        logger.error('DB:INCOME_LIST', 'Income list validation error', { error: validation.error }, correlationId || undefined);
        return {
          data: [],
          error: {
            error: 'Invalid data received from server.',
            code: INCOME_ERROR_CODES.VALIDATION_ERROR,
          },
        };
      }

      // Map entity schema to domain Income type
      const incomes = validation.data.map(this.mapEntityToIncome);

      logger.info('DB:INCOME_LIST', 'Income listed successfully from Supabase', { count: incomes.length }, correlationId || undefined);
      return { data: incomes };
    } catch (error) {
      logger.error('DB:INCOME_LIST', 'List income error', { error }, getCorrelationId() || undefined);
      return {
        data: [],
        error: this.normalizeSupabaseError(error),
      };
    }
  }

  async get(id: string, getToken: () => Promise<string | null>) {
    try {
      const correlationId = getCorrelationId();
      logger.debug('DB:INCOME_GET', 'SupabaseIncomeRepository.get called', { incomeId: id, repoType: 'SupabaseIncomeRepository' }, correlationId || undefined);

      // Validate input
      if (!id) {
        return {
          error: {
            error: 'Income ID is required.',
            code: INCOME_ERROR_CODES.VALIDATION_ERROR,
          },
        };
      }

      const supabase = await createAuthenticatedSupabaseClient(getToken);

      const { data, error } = await supabase
        .from('income')
        .select(this.selectColumns)
        .eq('id', id)
        .single();

      if (error) {
        logger.error('DB:INCOME_GET', 'Supabase income get error', { error }, correlationId || undefined);
        logger.error('DB:INCOME_GET', 'Failed to get income from Supabase', { incomeId: id, error: error.message, code: error.code }, correlationId || undefined);
        return { error: this.normalizeSupabaseError(error) };
      }

      if (!data) {
        return {
          error: {
            error: 'Income not found.',
            code: INCOME_ERROR_CODES.NOT_FOUND,
          },
        };
      }

      // Validate response data
      const validation = incomeEntitySchema.safeParse(data);
      if (!validation.success) {
        logger.error('DB:INCOME_GET', 'Income validation error', { error: validation.error }, correlationId || undefined);
        return {
          error: {
            error: 'Invalid data received from server.',
            code: INCOME_ERROR_CODES.VALIDATION_ERROR,
          },
        };
      }

      // Map entity schema to domain Income type
      const income: Income = this.mapEntityToIncome(validation.data);

      logger.info('DB:INCOME_GET', 'Income fetched successfully from Supabase', { incomeId: income.id, incomeName: income.name }, correlationId || undefined);
      return { data: income };
    } catch (error) {
      logger.error('DB:INCOME_GET', 'Get income error', { error }, getCorrelationId() || undefined);
      return { error: this.normalizeSupabaseError(error) };
    }
  }

  async create(input: Omit<Income, 'id'>, getToken: () => Promise<string | null>) {
    try {
      const correlationId = getCorrelationId();
      
      logger.info(
        'DB:INCOME_INSERT',
        'SupabaseIncomeRepository.create called',
        {
          inputSource: input.source,
          inputName: input.name,
          inputAmount: input.amount,
          repoType: 'SupabaseIncomeRepository',
        },
        correlationId || undefined
      );

      // Validate input
      const validation = incomeCreateSchema.safeParse(input);
      if (!validation.success) {
        logger.warn('DB:INCOME_INSERT', 'Income create input validation failed', { errors: validation.error.errors }, correlationId || undefined);
        return {
          error: {
            error: `Invalid input: ${validation.error.errors.map(e => e.message).join(', ')}`,
            code: INCOME_ERROR_CODES.VALIDATION_ERROR,
          },
        };
      }

      const supabase = await createAuthenticatedSupabaseClient(getToken);

      // CRITICAL: Explicitly extract and set user_id from JWT
      const userIdResult = await ensureUserIdForInsert(getToken, 'create income');
      if ('error' in userIdResult) {
        return { error: userIdResult.error };
      }
      const { userId } = userIdResult;

      // Map camelCase to snake_case for database
      const dbInput: Record<string, unknown> = {
        user_id: userId, // EXPLICIT: Set user_id from JWT
        name: validation.data.name,
        source: validation.data.source,
        amount: validation.data.amount,
        frequency: validation.data.frequency,
        paid_to_account_id: validation.data.paidToAccountId,
      };

      // Include next_payment_date if provided (optional field), use null for cleared dates
      if (validation.data.nextPaymentDate !== undefined) {
        dbInput.next_payment_date = validation.data.nextPaymentDate ?? null;
        logger.debug('DB:INCOME_CREATE', 'Setting next_payment_date in create', { nextPaymentDate: validation.data.nextPaymentDate, dbValue: dbInput.next_payment_date }, correlationId || undefined);
      }

      const { data, error } = await supabase
        .from('income')
        .insert([dbInput])
        .select(this.selectColumns)
        .single();

      if (error) {
        logger.error('DB:INCOME_CREATE', 'Supabase income create error', { error }, correlationId || undefined);
        logger.error(
          'DB:INCOME_INSERT',
          'Failed to create income in Supabase',
          { error: error.message, code: error.code, dbInput },
          correlationId || undefined
        );
        return { error: this.normalizeSupabaseError(error) };
      }

      if (!data) {
        logger.error('DB:INCOME_INSERT', 'Failed to create income - no data returned from Supabase', { dbInput }, correlationId || undefined);
        return {
          error: {
            error: 'Failed to create income - no data returned',
            code: INCOME_ERROR_CODES.UNKNOWN_ERROR,
          },
        };
      }

      // Validate response data
      const responseValidation = incomeEntitySchema.safeParse(data);
      if (!responseValidation.success) {
        logger.error('DB:INCOME_CREATE', 'Income create response validation error', { error: responseValidation.error }, correlationId || undefined);
        logger.error('DB:INCOME_INSERT', 'Income create response validation failed', { errors: responseValidation.error.errors, data }, correlationId || undefined);
        return {
          error: {
            error: 'Invalid data received from server.',
            code: INCOME_ERROR_CODES.VALIDATION_ERROR,
          },
        };
      }

      // Map entity schema to domain Income type
      const income = this.mapEntityToIncome(responseValidation.data);

      // CRITICAL: Verify the inserted record has the correct user_id
      verifyInsertedUserId(responseValidation.data, userId, 'create income', income.id);

      logger.info(
        'DB:INCOME_INSERT',
        'Income created successfully in Supabase',
        {
          createdIncomeId: income.id,
          incomeName: income.name,
          incomeSource: income.source,
          userId: responseValidation.data.userId,
          userIdMatches: responseValidation.data.userId === userId,
        },
        correlationId || undefined
      );

      return { data: income };
    } catch (error) {
      logger.error('DB:INCOME_CREATE', 'Create income error', { error }, getCorrelationId() || undefined);
      return { error: this.normalizeSupabaseError(error) };
    }
  }

  async update(
    id: string,
    input: Partial<Omit<Income, 'id'>>,
    getToken: () => Promise<string | null>
  ) {
    try {
      const correlationId = getCorrelationId();
      logger.info(
        'DB:INCOME_UPDATE',
        'SupabaseIncomeRepository.update called',
        { incomeId: id, input, repoType: 'SupabaseIncomeRepository' },
        correlationId || undefined
      );

      // Validate input
      if (!id) {
        return {
          error: {
            error: 'Income ID is required.',
            code: INCOME_ERROR_CODES.VALIDATION_ERROR,
          },
        };
      }

      const validation = incomeUpdateSchema.safeParse(input);
      if (!validation.success) {
        logger.warn('DB:INCOME_UPDATE', 'Income update input validation failed', { incomeId: id, errors: validation.error.errors }, correlationId || undefined);
        return {
          error: {
            error: `Invalid input: ${validation.error.errors.map(e => e.message).join(', ')}`,
            code: INCOME_ERROR_CODES.VALIDATION_ERROR,
          },
        };
      }

      const supabase = await createAuthenticatedSupabaseClient(getToken);

      // Map camelCase to snake_case for database
      const dbInput: Record<string, unknown> = {};
      if (validation.data.name !== undefined) dbInput.name = validation.data.name;
      if (validation.data.source !== undefined) dbInput.source = validation.data.source;
      if (validation.data.amount !== undefined) dbInput.amount = validation.data.amount;
      if (validation.data.frequency !== undefined) dbInput.frequency = validation.data.frequency;
      if (validation.data.nextPaymentDate !== undefined) {
        dbInput.next_payment_date = validation.data.nextPaymentDate ?? null;
        logger.debug('DB:INCOME_UPDATE', 'Setting next_payment_date in update', { nextPaymentDate: validation.data.nextPaymentDate, dbValue: dbInput.next_payment_date }, correlationId || undefined);
      }
      if (validation.data.paidToAccountId !== undefined) {
        dbInput.paid_to_account_id = validation.data.paidToAccountId;
      }

      const { data, error } = await supabase
        .from('income')
        .update(dbInput)
        .eq('id', id)
        .select(this.selectColumns)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return {
            error: {
              error: 'Income not found.',
              code: INCOME_ERROR_CODES.NOT_FOUND,
            },
          };
        }
        logger.error('DB:INCOME_UPDATE', 'Supabase income update error', { error }, correlationId || undefined);
        logger.error('DB:INCOME_UPDATE', 'Failed to update income in Supabase', { incomeId: id, error: error.message, code: error.code, dbInput }, correlationId || undefined);
        return { error: this.normalizeSupabaseError(error) };
      }

      if (!data) {
        logger.error('DB:INCOME_UPDATE', 'Failed to update income - no data returned from Supabase', { incomeId: id, dbInput }, correlationId || undefined);
        return {
          error: {
            error: 'Failed to update income - no data returned',
            code: INCOME_ERROR_CODES.UNKNOWN_ERROR,
          },
        };
      }

      // Validate response data
      const responseValidation = incomeEntitySchema.safeParse(data);
      if (!responseValidation.success) {
        logger.error('DB:INCOME_UPDATE', 'Income update response validation error', { error: responseValidation.error }, correlationId || undefined);
        logger.error('DB:INCOME_UPDATE', 'Income update response validation failed', { incomeId: id, errors: responseValidation.error.errors, data }, correlationId || undefined);
        return {
          error: {
            error: 'Invalid data received from server.',
            code: INCOME_ERROR_CODES.VALIDATION_ERROR,
          },
        };
      }

      // Map entity schema to domain Income type
      const income = this.mapEntityToIncome(responseValidation.data);

      logger.info(
        'DB:INCOME_UPDATE',
        'Income updated successfully in Supabase',
        { updatedIncomeId: income.id, incomeName: income.name, incomeSource: income.source },
        correlationId || undefined
      );

      return { data: income };
    } catch (error) {
      logger.error('DB:INCOME_UPDATE', 'Update income error', { error }, getCorrelationId() || undefined);
      return { error: this.normalizeSupabaseError(error) };
    }
  }

  async remove(id: string, getToken: () => Promise<string | null>) {
    try {
      const correlationId = getCorrelationId();
      
      logger.warn(
        'DB:INCOME_DELETE',
        'SupabaseIncomeRepository.remove called',
        {
          incomeId: id,
          repoType: 'SupabaseIncomeRepository',
        },
        correlationId || undefined
      );

      // Validate input
      if (!id) {
        return {
          error: {
            error: 'Income ID is required.',
            code: INCOME_ERROR_CODES.VALIDATION_ERROR,
          },
        };
      }

      const supabase = await createAuthenticatedSupabaseClient(getToken);

      const { error } = await supabase
        .from('income')
        .delete()
        .eq('id', id);

      if (error) {
        if (error.code === 'PGRST116') {
          return {
            error: {
              error: 'Income not found.',
              code: INCOME_ERROR_CODES.NOT_FOUND,
            },
          };
        }
        logger.error('DB:INCOME_DELETE', 'Supabase income delete error', { error }, correlationId || undefined);
        logger.error('DB:INCOME_DELETE', 'Failed to delete income from Supabase', { incomeId: id, error: error.message, code: error.code }, correlationId || undefined);
        return { error: this.normalizeSupabaseError(error) };
      }

      logger.info('DB:INCOME_DELETE', 'Income deleted successfully from Supabase', { incomeId: id }, correlationId || undefined);
      return {};
    } catch (error) {
      logger.error('DB:INCOME_DELETE', 'Delete income error', { error }, getCorrelationId() || undefined);
      return { error: this.normalizeSupabaseError(error) };
    }
  }
}

