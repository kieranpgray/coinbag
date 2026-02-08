import type { GoalsRepository } from './repo';
import { createAuthenticatedSupabaseClient } from '@/lib/supabaseClient';
import { ensureUserIdForInsert, verifyInsertedUserId } from '@/lib/repositoryHelpers';
import {
  goalCreateSchema,
  goalUpdateSchema,
  goalListSchema,
  goalEntitySchema,
  GOAL_ERROR_CODES,
} from '@/contracts/goals';
import type { Goal } from '@/types/domain';
import { logger, getCorrelationId } from '@/lib/logger';
import { z } from 'zod';

/**
 * Supabase implementation of GoalsRepository
 * 
 * Handles all CRUD operations for goals stored in Supabase PostgreSQL database.
 * Uses Clerk JWT authentication and Row Level Security (RLS) for data isolation.
 */
export class SupabaseGoalsRepository implements GoalsRepository {
  // Select actual database column names (snake_case)
  // Supabase doesn't support column aliasing in select strings, so we map them manually
  private readonly selectColumns =
    'id, name, description, source, type, target_amount, current_amount, deadline, status, account_id, user_id, created_at, updated_at';

  // Fallback select columns without account_id (for databases without account_id column)
  private readonly selectColumnsWithoutAccountId =
    'id, name, description, source, type, target_amount, current_amount, deadline, status, user_id, created_at, updated_at';

  /**
   * Maps database row (snake_case) to entity schema (camelCase)
   * Converts snake_case database columns to camelCase for entity schema validation
   */
  private mapDbRowToEntity(row: Record<string, unknown>): z.infer<typeof goalEntitySchema> {
    return {
      id: row.id as string,
      name: row.name as string,
      description: row.description === null ? undefined : (row.description as string | undefined),
      source: row.source === null ? undefined : (row.source as string | undefined),
      type: row.type === null ? undefined : (row.type as 'Grow' | 'Save' | 'Pay Off' | 'Invest' | undefined),
      targetAmount: row.target_amount as number,
      currentAmount: row.current_amount as number,
      deadline: row.deadline === null ? undefined : (row.deadline ? String(row.deadline).split('T')[0] : undefined) as string | undefined,
      status: row.status as 'active' | 'completed' | 'paused',
      accountId: row.account_id === null ? undefined : (row.account_id as string | undefined),
      userId: row.user_id as string,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    };
  }

  /**
   * Maps goal entity (with userId and timestamps) to domain Goal type (without userId)
   * Converts deadline from database format (ISO string or YYYY-MM-DD) to YYYY-MM-DD format
   */
  private mapEntityToGoal(entity: z.infer<typeof goalEntitySchema>): Goal {
    // Convert deadline to YYYY-MM-DD format if it's in ISO format
    let deadline = entity.deadline;
    if (deadline && deadline.includes('T')) {
      deadline = deadline.split('T')[0];
    }

    return {
      id: entity.id,
      name: entity.name,
      description: entity.description,
      source: entity.source,
      type: entity.type,
      targetAmount: entity.targetAmount,
      currentAmount: entity.currentAmount,
      deadline,
      status: entity.status,
      accountId: entity.accountId,
    };
  }

  /**
   * Normalize Supabase errors to user-friendly messages
   */
  private normalizeSupabaseError(error: unknown): { error: string; code: string } {
    if (!error || typeof error !== 'object') {
      return {
        error: 'An unexpected error occurred.',
        code: GOAL_ERROR_CODES.UNKNOWN_ERROR,
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
        error: 'A goal with this name already exists for your account.',
        code: GOAL_ERROR_CODES.DUPLICATE_ENTRY,
      };
    }
    if (errorCode === '23503') { // Foreign key violation
      return {
        error: 'Referenced entity not found or permission denied.',
        code: GOAL_ERROR_CODES.PERMISSION_DENIED,
      };
    }
    if (errorCode === '23514') { // Check constraint violation
      return {
        error: 'Invalid goal data provided (e.g., amount out of range).',
        code: GOAL_ERROR_CODES.VALIDATION_ERROR,
      };
    }
    if (errorCode === 'PGRST116') { // No rows found for single()
      return {
        error: 'Goal not found.',
        code: GOAL_ERROR_CODES.NOT_FOUND,
      };
    }
    if (errorCode === 'PGRST301') { // RLS policy violation
      return {
        error: 'You do not have permission to access this goal.',
        code: GOAL_ERROR_CODES.PERMISSION_DENIED,
      };
    }

    // Handle specific Supabase error patterns
    const message = typeof err.message === 'string' ? err.message : undefined;
    if (message?.includes('JWT')) {
      return {
        error: 'Authentication token expired. Please sign in again.',
        code: GOAL_ERROR_CODES.AUTH_EXPIRED,
      };
    }
    if (message?.includes('permission')) {
      return {
        error: 'You do not have permission to perform this action.',
        code: GOAL_ERROR_CODES.PERMISSION_DENIED,
      };
    }

    // Default error with more context
    return {
      error:
        (typeof err.message === 'string' && err.message) ||
        (typeof err.details === 'string' && err.details) ||
        'An unexpected error occurred.',
      code: GOAL_ERROR_CODES.UNKNOWN_ERROR,
    };
  }

  async list(getToken?: () => Promise<string | null>) {
    try {
      const correlationId = getCorrelationId();
      logger.debug('DB:GOALS_LIST', 'SupabaseGoalsRepository.list called', { repoType: 'SupabaseGoalsRepository' }, correlationId || undefined);

      if (!getToken) {
        return {
          data: [],
          error: {
            error: 'Authentication token is required.',
            code: GOAL_ERROR_CODES.AUTH_EXPIRED,
          },
        };
      }

      const supabase = await createAuthenticatedSupabaseClient(getToken);

      // Try with all columns first, fallback if account_id column doesn't exist
      let { data, error } = await supabase
        .from('goals')
        .select(this.selectColumns)
        .order('created_at', { ascending: false });

      // Handle missing account_id column with fallback query
      if (error && error.code === '42703') {
        const errorMessage = error.message || '';
        const missingAccountId = errorMessage.includes('account_id');
        
        if (missingAccountId) {
          // account_id column missing - use fallback query
          logger.warn('DB:GOALS_LIST', 'account_id column not found, using fallback query (migration may not have been run)', {}, correlationId || undefined);
          const fallbackResult = await supabase
            .from('goals')
            .select(this.selectColumnsWithoutAccountId)
            .order('created_at', { ascending: false });
          
          if (fallbackResult.error) {
            error = fallbackResult.error;
            data = null;
          } else {
            // Success with fallback columns
            // Map to entities and then back to unknown records to satisfy the logic below
            // or just use the raw data and let the mapping happen once at the end
            data = (fallbackResult.data || []).map((row: Record<string, unknown>) => ({
              ...row,
              account_id: null // Explicitly add missing column as null
            })) as any[];
            error = null;
          }
        }
      }

      if (error) {
        console.error('Supabase goals list error:', error);
        logger.error('DB:GOALS_LIST', 'Failed to list goals from Supabase', { error: error.message, code: error.code }, correlationId || undefined);
        return {
          data: [],
          error: this.normalizeSupabaseError(error),
        };
      }

      // Map database rows (snake_case) to entity schema (camelCase)
      const mappedData = (data || []).map(row => this.mapDbRowToEntity(row));

      // Validate response data
      const validation = goalListSchema.safeParse(mappedData);
      if (!validation.success) {
        console.error('Goals list validation error:', validation.error);
        return {
          data: [],
          error: {
            error: 'Invalid data received from server.',
            code: GOAL_ERROR_CODES.VALIDATION_ERROR,
          },
        };
      }

      // Map entity schema to domain Goal type
      const goals = validation.data.map(this.mapEntityToGoal);

      logger.info('DB:GOALS_LIST', 'Goals listed successfully from Supabase', { count: goals.length }, correlationId || undefined);
      return { data: goals };
    } catch (error) {
      console.error('List goals error:', error);
      return {
        data: [],
        error: this.normalizeSupabaseError(error),
      };
    }
  }

  async get(id: string, getToken: () => Promise<string | null>) {
    try {
      const correlationId = getCorrelationId();
      logger.debug('DB:GOALS_GET', 'SupabaseGoalsRepository.get called', { goalId: id, repoType: 'SupabaseGoalsRepository' }, correlationId || undefined);

      // Validate input
      if (!id) {
        return {
          error: {
            error: 'Goal ID is required.',
            code: GOAL_ERROR_CODES.VALIDATION_ERROR,
          },
        };
      }

      const supabase = await createAuthenticatedSupabaseClient(getToken);

      // Try with all columns first, fallback if account_id column doesn't exist
      let { data, error } = await supabase
        .from('goals')
        .select(this.selectColumns)
        .eq('id', id)
        .single();

      // Handle missing account_id column with fallback query
      if (error && error.code === '42703') {
        const errorMessage = error.message || '';
        const missingAccountId = errorMessage.includes('account_id');
        
        if (missingAccountId) {
          // account_id column missing - use fallback query
          logger.warn('DB:GOALS_GET', 'account_id column not found, using fallback query (migration may not have been run)', { goalId: id }, correlationId || undefined);
          const fallbackResult = await supabase
            .from('goals')
            .select(this.selectColumnsWithoutAccountId)
            .eq('id', id)
            .single();
          
          if (fallbackResult.error) {
            error = fallbackResult.error;
            data = null;
          } else {
            // Success with fallback columns
            data = {
              ...fallbackResult.data,
              account_id: null // Explicitly add missing column as null
            } as any;
            error = null;
          }
        }
      }

      if (error) {
        console.error('Supabase goals get error:', error);
        logger.error('DB:GOALS_GET', 'Failed to get goal from Supabase', { goalId: id, error: error.message, code: error.code }, correlationId || undefined);
        return { error: this.normalizeSupabaseError(error) };
      }

      if (!data) {
        return {
          error: {
            error: 'Goal not found.',
            code: GOAL_ERROR_CODES.NOT_FOUND,
          },
        };
      }

      // Map database row (snake_case) to entity schema (camelCase)
      const mappedData = this.mapDbRowToEntity(data);

      // Validate response data
      const validation = goalEntitySchema.safeParse(mappedData);
      if (!validation.success) {
        console.error('Goal validation error:', validation.error);
        return {
          error: {
            error: 'Invalid data received from server.',
            code: GOAL_ERROR_CODES.VALIDATION_ERROR,
          },
        };
      }

      // Map entity schema to domain Goal type
      const goal: Goal = this.mapEntityToGoal(validation.data);

      logger.info('DB:GOALS_GET', 'Goal fetched successfully from Supabase', { goalId: goal.id, goalName: goal.name }, correlationId || undefined);
      return { data: goal };
    } catch (error) {
      console.error('Get goal error:', error);
      return { error: this.normalizeSupabaseError(error) };
    }
  }

  async create(input: Omit<Goal, 'id'>, getToken: () => Promise<string | null>) {
    try {
      const correlationId = getCorrelationId();
      
      logger.info(
        'DB:GOALS_INSERT',
        'SupabaseGoalsRepository.create called',
        {
          inputName: input.name,
          inputAccountId: input.accountId,
          inputTargetAmount: input.targetAmount,
          repoType: 'SupabaseGoalsRepository',
        },
        correlationId || undefined
      );

      // Validate input
      const validation = goalCreateSchema.safeParse(input);
      if (!validation.success) {
        logger.warn('DB:GOALS_INSERT', 'Goal create input validation failed', { errors: validation.error.errors }, correlationId || undefined);
        return {
          error: {
            error: `Invalid input: ${validation.error.errors.map(e => e.message).join(', ')}`,
            code: GOAL_ERROR_CODES.VALIDATION_ERROR,
          },
        };
      }

      const supabase = await createAuthenticatedSupabaseClient(getToken);

      // CRITICAL: Explicitly extract and set user_id from JWT
      const userIdResult = await ensureUserIdForInsert(getToken, 'create goal');
      if ('error' in userIdResult) {
        return { error: userIdResult.error };
      }
      const { userId } = userIdResult;

      // Map camelCase to snake_case for database
      const dbInput: Record<string, unknown> = {
        user_id: userId, // EXPLICIT: Set user_id from JWT
        name: validation.data.name,
        target_amount: validation.data.targetAmount,
        current_amount: validation.data.currentAmount ?? 0,
        status: validation.data.status ?? 'active',
      };

      if (validation.data.description !== undefined) {
        dbInput.description = validation.data.description;
      }
      if (validation.data.source !== undefined) {
        dbInput.source = validation.data.source;
      }
      if (validation.data.type !== undefined) {
        dbInput.type = validation.data.type;
      }
      if (validation.data.deadline !== undefined) {
        dbInput.deadline = validation.data.deadline;
      }
      // Only include account_id if it's provided and the column exists
      // We'll try without it first if there's an error
      if (validation.data.accountId !== undefined) {
        dbInput.account_id = validation.data.accountId;
      }

      // Try insert with all columns first
      let { data, error } = await supabase
        .from('goals')
        .insert([dbInput])
        .select(this.selectColumns)
        .single();

      // Handle missing account_id column with fallback insert
      if (error && (error.code === '42703' || error.code === 'PGRST204')) {
        const errorMessage = error.message || '';
        const missingAccountId = errorMessage.includes('account_id');
        
        if (missingAccountId && validation.data.accountId !== undefined) {
          // account_id column missing - remove it and retry
          logger.warn('DB:GOALS_INSERT', 'account_id column not found, creating without account link (migration may not have been run)', { accountId: validation.data.accountId }, correlationId || undefined);
          const dbInputWithoutAccountId = { ...dbInput };
          delete dbInputWithoutAccountId.account_id;
          
          const fallbackResult = await supabase
            .from('goals')
            .insert([dbInputWithoutAccountId])
            .select(this.selectColumnsWithoutAccountId)
            .single();
          
          if (fallbackResult.error) {
            error = fallbackResult.error;
            data = null;
          } else {
            // Success with fallback columns
            data = {
              ...fallbackResult.data,
              account_id: null
            } as any;
            error = null;
          }
        }
      }

      if (error) {
        console.error('Supabase goals create error:', error);
        logger.error(
          'DB:GOALS_INSERT',
          'Failed to create goal in Supabase',
          { error: error.message, code: error.code, dbInput },
          correlationId || undefined
        );
        return { error: this.normalizeSupabaseError(error) };
      }

      if (!data) {
        logger.error('DB:GOALS_INSERT', 'Failed to create goal - no data returned from Supabase', { dbInput }, correlationId || undefined);
        return {
          error: {
            error: 'Failed to create goal - no data returned',
            code: GOAL_ERROR_CODES.UNKNOWN_ERROR,
          },
        };
      }

      // Map database row (snake_case) to entity schema (camelCase)
      const mappedData = this.mapDbRowToEntity(data);

      // Validate response data
      const responseValidation = goalEntitySchema.safeParse(mappedData);
      if (!responseValidation.success) {
        console.error('Goal create response validation error:', responseValidation.error);
        logger.error('DB:GOALS_INSERT', 'Goal create response validation failed', { errors: responseValidation.error.errors, data }, correlationId || undefined);
        return {
          error: {
            error: 'Invalid data received from server.',
            code: GOAL_ERROR_CODES.VALIDATION_ERROR,
          },
        };
      }

      // Map entity schema to domain Goal type
      const goal = this.mapEntityToGoal(responseValidation.data);

      // CRITICAL: Verify the inserted record has the correct user_id
      verifyInsertedUserId(responseValidation.data, userId, 'create goal', goal.id);

      logger.info(
        'DB:GOALS_INSERT',
        'Goal created successfully in Supabase',
        {
          createdGoalId: goal.id,
          goalName: goal.name,
          goalAccountId: goal.accountId,
          userId: responseValidation.data.userId,
          userIdMatches: responseValidation.data.userId === userId,
        },
        correlationId || undefined
      );

      return { data: goal };
    } catch (error) {
      console.error('Create goal error:', error);
      return { error: this.normalizeSupabaseError(error) };
    }
  }

  async update(
    id: string,
    input: Partial<Omit<Goal, 'id'>>,
    getToken: () => Promise<string | null>
  ) {
    try {
      const correlationId = getCorrelationId();
      logger.info(
        'DB:GOALS_UPDATE',
        'SupabaseGoalsRepository.update called',
        { goalId: id, input, repoType: 'SupabaseGoalsRepository' },
        correlationId || undefined
      );

      // Validate input
      if (!id) {
        return {
          error: {
            error: 'Goal ID is required.',
            code: GOAL_ERROR_CODES.VALIDATION_ERROR,
          },
        };
      }

      const validation = goalUpdateSchema.safeParse(input);
      if (!validation.success) {
        logger.warn('DB:GOALS_UPDATE', 'Goal update input validation failed', { goalId: id, errors: validation.error.errors }, correlationId || undefined);
        return {
          error: {
            error: `Invalid input: ${validation.error.errors.map(e => e.message).join(', ')}`,
            code: GOAL_ERROR_CODES.VALIDATION_ERROR,
          },
        };
      }

      const supabase = await createAuthenticatedSupabaseClient(getToken);

      // Map camelCase to snake_case for database
      const dbInput: Record<string, unknown> = {};
      if (validation.data.name !== undefined) dbInput.name = validation.data.name;
      if (validation.data.description !== undefined) dbInput.description = validation.data.description;
      if (validation.data.source !== undefined) dbInput.source = validation.data.source;
      if (validation.data.type !== undefined) dbInput.type = validation.data.type;
      if (validation.data.targetAmount !== undefined) dbInput.target_amount = validation.data.targetAmount;
      if (validation.data.currentAmount !== undefined) dbInput.current_amount = validation.data.currentAmount;
      if (validation.data.deadline !== undefined) {
        dbInput.deadline = validation.data.deadline;
      }
      if (validation.data.status !== undefined) dbInput.status = validation.data.status;
      // Only include account_id if it's provided
      if (validation.data.accountId !== undefined) {
        dbInput.account_id = validation.data.accountId === null ? null : validation.data.accountId;
      }

      // Try update with all columns first
      let { data, error } = await supabase
        .from('goals')
        .update(dbInput)
        .eq('id', id)
        .select(this.selectColumns)
        .single();

      // Handle missing account_id column with fallback update
      if (error && (error.code === '42703' || error.code === 'PGRST204')) {
        const errorMessage = error.message || '';
        const missingAccountId = errorMessage.includes('account_id');
        
        if (missingAccountId && validation.data.accountId !== undefined) {
          // account_id column missing - remove it and retry
          logger.warn('DB:GOALS_UPDATE', 'account_id column not found, updating without account link (migration may not have been run)', { goalId: id, accountId: validation.data.accountId }, correlationId || undefined);
          const dbInputWithoutAccountId = { ...dbInput };
          delete dbInputWithoutAccountId.account_id;
          
          const fallbackResult = await supabase
            .from('goals')
            .update(dbInputWithoutAccountId)
            .eq('id', id)
            .select(this.selectColumnsWithoutAccountId)
            .single();
          
          if (fallbackResult.error) {
            error = fallbackResult.error;
            data = null;
          } else {
            // Success with fallback columns
            data = {
              ...fallbackResult.data,
              account_id: null
            } as any;
            error = null;
          }
        }
      }

      if (error) {
        if (error.code === 'PGRST116') {
          return {
            error: {
              error: 'Goal not found.',
              code: GOAL_ERROR_CODES.NOT_FOUND,
            },
          };
        }
        console.error('Supabase goals update error:', error);
        logger.error('DB:GOALS_UPDATE', 'Failed to update goal in Supabase', { goalId: id, error: error.message, code: error.code, dbInput }, correlationId || undefined);
        return { error: this.normalizeSupabaseError(error) };
      }

      if (!data) {
        logger.error('DB:GOALS_UPDATE', 'Failed to update goal - no data returned from Supabase', { goalId: id, dbInput }, correlationId || undefined);
        return {
          error: {
            error: 'Failed to update goal - no data returned',
            code: GOAL_ERROR_CODES.UNKNOWN_ERROR,
          },
        };
      }

      // Map database row (snake_case) to entity schema (camelCase)
      const mappedData = this.mapDbRowToEntity(data);

      // Validate response data
      const responseValidation = goalEntitySchema.safeParse(mappedData);
      if (!responseValidation.success) {
        console.error('Goal update response validation error:', responseValidation.error);
        logger.error('DB:GOALS_UPDATE', 'Goal update response validation failed', { goalId: id, errors: responseValidation.error.errors, data }, correlationId || undefined);
        return {
          error: {
            error: 'Invalid data received from server.',
            code: GOAL_ERROR_CODES.VALIDATION_ERROR,
          },
        };
      }

      // Map entity schema to domain Goal type
      const goal = this.mapEntityToGoal(responseValidation.data);

      logger.info(
        'DB:GOALS_UPDATE',
        'Goal updated successfully in Supabase',
        { updatedGoalId: goal.id, goalName: goal.name, goalAccountId: goal.accountId },
        correlationId || undefined
      );

      return { data: goal };
    } catch (error) {
      console.error('Update goal error:', error);
      return { error: this.normalizeSupabaseError(error) };
    }
  }

  async remove(id: string, getToken: () => Promise<string | null>) {
    try {
      const correlationId = getCorrelationId();
      
      logger.warn(
        'DB:GOALS_DELETE',
        'SupabaseGoalsRepository.remove called',
        {
          goalId: id,
          repoType: 'SupabaseGoalsRepository',
        },
        correlationId || undefined
      );

      // Validate input
      if (!id) {
        return {
          error: {
            error: 'Goal ID is required.',
            code: GOAL_ERROR_CODES.VALIDATION_ERROR,
          },
        };
      }

      const supabase = await createAuthenticatedSupabaseClient(getToken);

      const { error } = await supabase
        .from('goals')
        .delete()
        .eq('id', id);

      if (error) {
        if (error.code === 'PGRST116') {
          return {
            error: {
              error: 'Goal not found.',
              code: GOAL_ERROR_CODES.NOT_FOUND,
            },
          };
        }
        console.error('Supabase goals delete error:', error);
        logger.error('DB:GOALS_DELETE', 'Failed to delete goal from Supabase', { goalId: id, error: error.message, code: error.code }, correlationId || undefined);
        return { error: this.normalizeSupabaseError(error) };
      }

      logger.info('DB:GOALS_DELETE', 'Goal deleted successfully from Supabase', { goalId: id }, correlationId || undefined);
      return {};
    } catch (error) {
      console.error('Delete goal error:', error);
      return { error: this.normalizeSupabaseError(error) };
    }
  }
}

