import type { LiabilitiesRepository } from './repo';
import { createAuthenticatedSupabaseClient } from '@/lib/supabaseClient';
import { ensureUserIdForInsert, verifyInsertedUserId } from '@/lib/repositoryHelpers';
import {
  liabilityCreateSchema,
  liabilityUpdateSchema,
  liabilityListSchema,
  liabilityEntitySchema,
  LIABILITY_ERROR_CODES,
} from '@/contracts/liabilities';
import type { Liability } from '@/types/domain';
import { logger, getCorrelationId } from '@/lib/logger';
import { z } from 'zod';

/**
 * Supabase implementation of LiabilitiesRepository
 * 
 * Handles all CRUD operations for liabilities stored in Supabase PostgreSQL database.
 * Uses Clerk JWT authentication and Row Level Security (RLS) for data isolation.
 */
export class SupabaseLiabilitiesRepository implements LiabilitiesRepository {
  private readonly selectColumns =
    'id, name, type, balance, interestRate:interest_rate, monthlyPayment:monthly_payment, dueDate:due_date, institution, repaymentAmount:repayment_amount, repaymentFrequency:repayment_frequency, userId:user_id, createdAt:created_at, updatedAt:updated_at';

  /**
   * Maps liability entity (with userId and timestamps) to domain Liability type (without userId)
   * Converts dueDate from database format (ISO string or YYYY-MM-DD) to YYYY-MM-DD format
   */
  private mapEntityToLiability(entity: z.infer<typeof liabilityEntitySchema>): Liability {
    // Convert dueDate to YYYY-MM-DD format if it's in ISO format
    let dueDate = entity.dueDate;
    if (dueDate && dueDate.includes('T')) {
      dueDate = dueDate.split('T')[0];
    }
    
    return {
      id: entity.id,
      name: entity.name,
      type: entity.type,
      balance: entity.balance,
      interestRate: entity.interestRate,
      monthlyPayment: entity.monthlyPayment,
      dueDate,
      institution: entity.institution,
      repaymentAmount: entity.repaymentAmount,
      repaymentFrequency: entity.repaymentFrequency,
    };
  }

  /**
   * Normalize Supabase errors to user-friendly messages
   */
  private normalizeSupabaseError(error: unknown): { error: string; code: string } {
    if (!error || typeof error !== 'object') {
      return {
        error: 'An unexpected error occurred.',
        code: LIABILITY_ERROR_CODES.UNKNOWN_ERROR,
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
        error: 'A liability with this name already exists for your account.',
        code: LIABILITY_ERROR_CODES.DUPLICATE_ENTRY,
      };
    }
    if (errorCode === '23503') { // Foreign key violation
      return {
        error: 'Referenced entity not found or permission denied.',
        code: LIABILITY_ERROR_CODES.PERMISSION_DENIED,
      };
    }
    if (errorCode === '23514') { // Check constraint violation
      return {
        error: 'Invalid liability data provided (e.g., balance out of range).',
        code: LIABILITY_ERROR_CODES.VALIDATION_ERROR,
      };
    }
    if (errorCode === 'PGRST116') { // No rows found for single()
      return {
        error: 'Liability not found.',
        code: LIABILITY_ERROR_CODES.NOT_FOUND,
      };
    }
    if (errorCode === 'PGRST301') { // RLS policy violation
      return {
        error: 'You do not have permission to access this liability.',
        code: LIABILITY_ERROR_CODES.PERMISSION_DENIED,
      };
    }

    // Handle specific Supabase error patterns
    const message = typeof err.message === 'string' ? err.message : undefined;
    if (message?.includes('JWT')) {
      return {
        error: 'Authentication token expired. Please sign in again.',
        code: LIABILITY_ERROR_CODES.AUTH_EXPIRED,
      };
    }
    if (message?.includes('permission')) {
      return {
        error: 'You do not have permission to perform this action.',
        code: LIABILITY_ERROR_CODES.PERMISSION_DENIED,
      };
    }

    // Default error with more context
    return {
      error:
        (typeof err.message === 'string' && err.message) ||
        (typeof err.details === 'string' && err.details) ||
        'An unexpected error occurred.',
      code: LIABILITY_ERROR_CODES.UNKNOWN_ERROR,
    };
  }

  async list(getToken: () => Promise<string | null>) {
    try {
      const correlationId = getCorrelationId();
      logger.debug('DB:LIABILITY_LIST', 'SupabaseLiabilitiesRepository.list called', { repoType: 'SupabaseLiabilitiesRepository' }, correlationId || undefined);

      const supabase = await createAuthenticatedSupabaseClient(getToken);

      const { data, error } = await supabase
        .from('liabilities')
        .select(this.selectColumns)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Supabase liabilities list error:', error);
        logger.error('DB:LIABILITY_LIST', 'Failed to list liabilities from Supabase', { error: error.message, code: error.code }, correlationId || undefined);
        return {
          data: [],
          error: this.normalizeSupabaseError(error),
        };
      }

      // Validate response data
      const validation = liabilityListSchema.safeParse(data || []);
      if (!validation.success) {
        console.error('Liability list validation error:', validation.error);
        return {
          data: [],
          error: {
            error: 'Invalid data received from server.',
            code: LIABILITY_ERROR_CODES.VALIDATION_ERROR,
          },
        };
      }

      // Map entity schema to domain Liability type
      const liabilities = validation.data.map(this.mapEntityToLiability);

      logger.info('DB:LIABILITY_LIST', 'Liabilities listed successfully from Supabase', { count: liabilities.length }, correlationId || undefined);
      return { data: liabilities };
    } catch (error) {
      console.error('List liabilities error:', error);
      return {
        data: [],
        error: this.normalizeSupabaseError(error),
      };
    }
  }

  async get(id: string, getToken: () => Promise<string | null>) {
    try {
      const correlationId = getCorrelationId();
      logger.debug('DB:LIABILITY_GET', 'SupabaseLiabilitiesRepository.get called', { liabilityId: id, repoType: 'SupabaseLiabilitiesRepository' }, correlationId || undefined);

      // Validate input
      if (!id) {
        return {
          error: {
            error: 'Liability ID is required.',
            code: LIABILITY_ERROR_CODES.VALIDATION_ERROR,
          },
        };
      }

      const supabase = await createAuthenticatedSupabaseClient(getToken);

      const { data, error } = await supabase
        .from('liabilities')
        .select(this.selectColumns)
        .eq('id', id)
        .single();

      if (error) {
        console.error('Supabase liabilities get error:', error);
        logger.error('DB:LIABILITY_GET', 'Failed to get liability from Supabase', { liabilityId: id, error: error.message, code: error.code }, correlationId || undefined);
        return { error: this.normalizeSupabaseError(error) };
      }

      if (!data) {
        return {
          error: {
            error: 'Liability not found.',
            code: LIABILITY_ERROR_CODES.NOT_FOUND,
          },
        };
      }

      // Validate response data
      const validation = liabilityEntitySchema.safeParse(data);
      if (!validation.success) {
        console.error('Liability validation error:', validation.error);
        return {
          error: {
            error: 'Invalid data received from server.',
            code: LIABILITY_ERROR_CODES.VALIDATION_ERROR,
          },
        };
      }

      // Map entity schema to domain Liability type
      const liability: Liability = this.mapEntityToLiability(validation.data);

      logger.info('DB:LIABILITY_GET', 'Liability fetched successfully from Supabase', { liabilityId: liability.id, liabilityName: liability.name }, correlationId || undefined);
      return { data: liability };
    } catch (error) {
      console.error('Get liability error:', error);
      return { error: this.normalizeSupabaseError(error) };
    }
  }

  async create(input: Omit<Liability, 'id'>, getToken: () => Promise<string | null>) {
    try {
      const correlationId = getCorrelationId();
      
      logger.info(
        'DB:LIABILITY_INSERT',
        'SupabaseLiabilitiesRepository.create called',
        {
          inputType: input.type,
          inputName: input.name,
          inputBalance: input.balance,
          repoType: 'SupabaseLiabilitiesRepository',
        },
        correlationId || undefined
      );

      // Validate input
      const validation = liabilityCreateSchema.safeParse(input);
      if (!validation.success) {
        logger.warn('DB:LIABILITY_INSERT', 'Liability create input validation failed', { errors: validation.error.errors }, correlationId || undefined);
        return {
          error: {
            error: `Invalid input: ${validation.error.errors.map(e => e.message).join(', ')}`,
            code: LIABILITY_ERROR_CODES.VALIDATION_ERROR,
          },
        };
      }

      const supabase = await createAuthenticatedSupabaseClient(getToken);

      // CRITICAL: Explicitly extract and set user_id from JWT
      const userIdResult = await ensureUserIdForInsert(getToken, 'create liability');
      if ('error' in userIdResult) {
        return { error: userIdResult.error };
      }
      const { userId } = userIdResult;

      // Map camelCase to snake_case for database
      const dbInput: Record<string, unknown> = {
        user_id: userId, // EXPLICIT: Set user_id from JWT
        name: validation.data.name,
        type: validation.data.type,
        balance: validation.data.balance,
      };

      // Add optional fields only if they are defined
      if (validation.data.interestRate !== undefined) {
        dbInput.interest_rate = validation.data.interestRate;
      }
      if (validation.data.monthlyPayment !== undefined) {
        dbInput.monthly_payment = validation.data.monthlyPayment;
      }
      if (validation.data.dueDate !== undefined) {
        dbInput.due_date = validation.data.dueDate;
      }
      if (validation.data.institution !== undefined) {
        dbInput.institution = validation.data.institution;
      }
      if (validation.data.repaymentAmount !== undefined) {
        dbInput.repayment_amount = validation.data.repaymentAmount;
      }
      if (validation.data.repaymentFrequency !== undefined) {
        dbInput.repayment_frequency = validation.data.repaymentFrequency;
      }

      const { data, error } = await supabase
        .from('liabilities')
        .insert([dbInput])
        .select(this.selectColumns)
        .single();

      if (error) {
        console.error('Supabase liabilities create error:', error);
        logger.error(
          'DB:LIABILITY_INSERT',
          'Failed to create liability in Supabase',
          { error: error.message, code: error.code, dbInput },
          correlationId || undefined
        );
        return { error: this.normalizeSupabaseError(error) };
      }

      if (!data) {
        logger.error('DB:LIABILITY_INSERT', 'Failed to create liability - no data returned from Supabase', { dbInput }, correlationId || undefined);
        return {
          error: {
            error: 'Failed to create liability - no data returned',
            code: LIABILITY_ERROR_CODES.UNKNOWN_ERROR,
          },
        };
      }

      // Validate response data
      const responseValidation = liabilityEntitySchema.safeParse(data);
      if (!responseValidation.success) {
        console.error('Liability create response validation error:', responseValidation.error);
        logger.error('DB:LIABILITY_INSERT', 'Liability create response validation failed', { errors: responseValidation.error.errors, data }, correlationId || undefined);
        return {
          error: {
            error: 'Invalid data received from server.',
            code: LIABILITY_ERROR_CODES.VALIDATION_ERROR,
          },
        };
      }

      // Map entity schema to domain Liability type
      const liability = this.mapEntityToLiability(responseValidation.data);

      // CRITICAL: Verify the inserted record has the correct user_id
      verifyInsertedUserId(responseValidation.data, userId, 'create liability', liability.id);

      logger.info(
        'DB:LIABILITY_INSERT',
        'Liability created successfully in Supabase',
        {
          createdLiabilityId: liability.id,
          liabilityName: liability.name,
          liabilityType: liability.type,
          userId: responseValidation.data.userId,
          userIdMatches: responseValidation.data.userId === userId,
        },
        correlationId || undefined
      );

      return { data: liability };
    } catch (error) {
      console.error('Create liability error:', error);
      return { error: this.normalizeSupabaseError(error) };
    }
  }

  async update(
    id: string,
    input: Partial<Omit<Liability, 'id'>>,
    getToken: () => Promise<string | null>
  ) {
    try {
      const correlationId = getCorrelationId();
      logger.info(
        'DB:LIABILITY_UPDATE',
        'SupabaseLiabilitiesRepository.update called',
        { liabilityId: id, input, repoType: 'SupabaseLiabilitiesRepository' },
        correlationId || undefined
      );

      // Validate input
      if (!id) {
        return {
          error: {
            error: 'Liability ID is required.',
            code: LIABILITY_ERROR_CODES.VALIDATION_ERROR,
          },
        };
      }

      const validation = liabilityUpdateSchema.safeParse(input);
      if (!validation.success) {
        logger.warn('DB:LIABILITY_UPDATE', 'Liability update input validation failed', { liabilityId: id, errors: validation.error.errors }, correlationId || undefined);
        return {
          error: {
            error: `Invalid input: ${validation.error.errors.map(e => e.message).join(', ')}`,
            code: LIABILITY_ERROR_CODES.VALIDATION_ERROR,
          },
        };
      }

      const supabase = await createAuthenticatedSupabaseClient(getToken);

      // Map camelCase to snake_case for database
      const dbInput: Record<string, unknown> = {};
      if (validation.data.name !== undefined) dbInput.name = validation.data.name;
      if (validation.data.type !== undefined) dbInput.type = validation.data.type;
      if (validation.data.balance !== undefined) dbInput.balance = validation.data.balance;
      if (validation.data.interestRate !== undefined) dbInput.interest_rate = validation.data.interestRate;
      if (validation.data.monthlyPayment !== undefined) dbInput.monthly_payment = validation.data.monthlyPayment;
      if (validation.data.dueDate !== undefined) {
        dbInput.due_date = validation.data.dueDate;
      }
      if (validation.data.institution !== undefined) {
        dbInput.institution = validation.data.institution;
      }
      if (validation.data.repaymentAmount !== undefined) {
        dbInput.repayment_amount = validation.data.repaymentAmount;
      }
      if (validation.data.repaymentFrequency !== undefined) {
        dbInput.repayment_frequency = validation.data.repaymentFrequency;
      }

      const { data, error } = await supabase
        .from('liabilities')
        .update(dbInput)
        .eq('id', id)
        .select(this.selectColumns)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return {
            error: {
              error: 'Liability not found.',
              code: LIABILITY_ERROR_CODES.NOT_FOUND,
            },
          };
        }
        console.error('Supabase liabilities update error:', error);
        logger.error('DB:LIABILITY_UPDATE', 'Failed to update liability in Supabase', { liabilityId: id, error: error.message, code: error.code, dbInput }, correlationId || undefined);
        return { error: this.normalizeSupabaseError(error) };
      }

      if (!data) {
        logger.error('DB:LIABILITY_UPDATE', 'Failed to update liability - no data returned from Supabase', { liabilityId: id, dbInput }, correlationId || undefined);
        return {
          error: {
            error: 'Failed to update liability - no data returned',
            code: LIABILITY_ERROR_CODES.UNKNOWN_ERROR,
          },
        };
      }

      // Validate response data
      const responseValidation = liabilityEntitySchema.safeParse(data);
      if (!responseValidation.success) {
        console.error('Liability update response validation error:', responseValidation.error);
        logger.error('DB:LIABILITY_UPDATE', 'Liability update response validation failed', { liabilityId: id, errors: responseValidation.error.errors, data }, correlationId || undefined);
        return {
          error: {
            error: 'Invalid data received from server.',
            code: LIABILITY_ERROR_CODES.VALIDATION_ERROR,
          },
        };
      }

      // Map entity schema to domain Liability type
      const liability = this.mapEntityToLiability(responseValidation.data);

      logger.info(
        'DB:LIABILITY_UPDATE',
        'Liability updated successfully in Supabase',
        { updatedLiabilityId: liability.id, liabilityName: liability.name, liabilityType: liability.type },
        correlationId || undefined
      );

      return { data: liability };
    } catch (error) {
      console.error('Update liability error:', error);
      return { error: this.normalizeSupabaseError(error) };
    }
  }

  async remove(id: string, getToken: () => Promise<string | null>) {
    try {
      const correlationId = getCorrelationId();
      
      logger.warn(
        'DB:LIABILITY_DELETE',
        'SupabaseLiabilitiesRepository.remove called',
        {
          liabilityId: id,
          repoType: 'SupabaseLiabilitiesRepository',
        },
        correlationId || undefined
      );

      // Validate input
      if (!id) {
        return {
          error: {
            error: 'Liability ID is required.',
            code: LIABILITY_ERROR_CODES.VALIDATION_ERROR,
          },
        };
      }

      const supabase = await createAuthenticatedSupabaseClient(getToken);

      const { error } = await supabase
        .from('liabilities')
        .delete()
        .eq('id', id);

      if (error) {
        if (error.code === 'PGRST116') {
          return {
            error: {
              error: 'Liability not found.',
              code: LIABILITY_ERROR_CODES.NOT_FOUND,
            },
          };
        }
        console.error('Supabase liabilities delete error:', error);
        logger.error('DB:LIABILITY_DELETE', 'Failed to delete liability from Supabase', { liabilityId: id, error: error.message, code: error.code }, correlationId || undefined);
        return { error: this.normalizeSupabaseError(error) };
      }

      logger.info('DB:LIABILITY_DELETE', 'Liability deleted successfully from Supabase', { liabilityId: id }, correlationId || undefined);
      return {};
    } catch (error) {
      console.error('Delete liability error:', error);
      return { error: this.normalizeSupabaseError(error) };
    }
  }
}

