import type { AccountsRepository } from './repo';
import { createAuthenticatedSupabaseClient } from '@/lib/supabaseClient';
import { ensureUserIdForInsert, verifyInsertedUserId } from '@/lib/repositoryHelpers';
import {
  accountCreateSchema,
  accountUpdateSchema,
  accountListSchema,
  accountEntitySchema,
  ACCOUNT_ERROR_CODES,
} from '@/contracts/accounts';
import type { Account } from '@/types/domain';
import { logger, getCorrelationId } from '@/lib/logger';
import { z } from 'zod';

/**
 * Supabase implementation of AccountsRepository
 * 
 * Handles all CRUD operations for accounts stored in Supabase PostgreSQL database.
 * Uses Clerk JWT authentication and Row Level Security (RLS) for data isolation.
 */
export class SupabaseAccountsRepository implements AccountsRepository {
  private readonly selectColumns =
    'id, institution, accountName:account_name, balance, availableBalance:available_balance, accountType:account_type, lastUpdated:last_updated, hidden, userId:user_id, createdAt:created_at, updatedAt:updated_at';

  /**
   * Maps account entity (with userId and timestamps) to domain Account type (without userId)
   */
  private mapEntityToAccount(entity: z.infer<typeof accountEntitySchema>): Account {
    return {
      id: entity.id,
      institution: entity.institution,
      accountName: entity.accountName,
      balance: entity.balance,
      availableBalance: entity.availableBalance,
      accountType: entity.accountType,
      lastUpdated: entity.lastUpdated,
      hidden: entity.hidden,
    };
  }

  /**
   * Normalize Supabase errors to user-friendly messages
   */
  private normalizeSupabaseError(error: unknown): { error: string; code: string } {
    if (!error || typeof error !== 'object') {
      return {
        error: 'An unexpected error occurred.',
        code: ACCOUNT_ERROR_CODES.UNKNOWN_ERROR,
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
        error: 'An account with this name already exists for your account.',
        code: ACCOUNT_ERROR_CODES.DUPLICATE_ENTRY,
      };
    }
    if (errorCode === '23503') { // Foreign key violation
      return {
        error: 'Referenced entity not found or permission denied.',
        code: ACCOUNT_ERROR_CODES.PERMISSION_DENIED,
      };
    }
    if (errorCode === '23514') { // Check constraint violation
      return {
        error: 'Invalid account data provided.',
        code: ACCOUNT_ERROR_CODES.VALIDATION_ERROR,
      };
    }
    if (errorCode === 'PGRST116') { // No rows found for single()
      return {
        error: 'Account not found.',
        code: ACCOUNT_ERROR_CODES.NOT_FOUND,
      };
    }
    if (errorCode === 'PGRST301') { // RLS policy violation
      return {
        error: 'You do not have permission to access this account.',
        code: ACCOUNT_ERROR_CODES.PERMISSION_DENIED,
      };
    }

    // Handle specific Supabase error patterns
    const message = typeof err.message === 'string' ? err.message : undefined;
    if (message?.includes('JWT')) {
      return {
        error: 'Authentication token expired. Please sign in again.',
        code: ACCOUNT_ERROR_CODES.AUTH_EXPIRED,
      };
    }
    if (message?.includes('permission')) {
      return {
        error: 'You do not have permission to perform this action.',
        code: ACCOUNT_ERROR_CODES.PERMISSION_DENIED,
      };
    }

    // Default error with more context
    return {
      error:
        (typeof err.message === 'string' && err.message) ||
        (typeof err.details === 'string' && err.details) ||
        'An unexpected error occurred.',
      code: ACCOUNT_ERROR_CODES.UNKNOWN_ERROR,
    };
  }

  async list(getToken: () => Promise<string | null>) {
    try {
      const correlationId = getCorrelationId();
      logger.debug('DB:ACCOUNT_LIST', 'SupabaseAccountsRepository.list called', { repoType: 'SupabaseAccountsRepository' }, correlationId || undefined);

      const supabase = await createAuthenticatedSupabaseClient(getToken);

      const { data, error } = await supabase
        .from('accounts')
        .select(this.selectColumns)
        .order('account_name', { ascending: true });

      if (error) {
        console.error('Supabase accounts list error:', error);
        logger.error('DB:ACCOUNT_LIST', 'Failed to list accounts from Supabase', { error: error.message, code: error.code }, correlationId || undefined);
        return {
          data: [],
          error: this.normalizeSupabaseError(error),
        };
      }

      // Validate response data
      const validation = accountListSchema.safeParse(data || []);
      if (!validation.success) {
        console.error('Account list validation error:', validation.error);
        return {
          data: [],
          error: {
            error: 'Invalid data received from server.',
            code: ACCOUNT_ERROR_CODES.VALIDATION_ERROR,
          },
        };
      }

      // Map entity schema to domain Account type
      const accounts = validation.data.map(this.mapEntityToAccount);

      logger.info('DB:ACCOUNT_LIST', 'Accounts listed successfully from Supabase', { count: accounts.length }, correlationId || undefined);
      return { data: accounts };
    } catch (error) {
      console.error('List accounts error:', error);
      return {
        data: [],
        error: this.normalizeSupabaseError(error),
      };
    }
  }

  async get(id: string, getToken: () => Promise<string | null>) {
    try {
      const correlationId = getCorrelationId();
      logger.debug('DB:ACCOUNT_GET', 'SupabaseAccountsRepository.get called', { accountId: id, repoType: 'SupabaseAccountsRepository' }, correlationId || undefined);

      // Validate input
      if (!id) {
        return {
          error: {
            error: 'Account ID is required.',
            code: ACCOUNT_ERROR_CODES.VALIDATION_ERROR,
          },
        };
      }

      const supabase = await createAuthenticatedSupabaseClient(getToken);

      const { data, error } = await supabase
        .from('accounts')
        .select(this.selectColumns)
        .eq('id', id)
        .single();

      if (error) {
        console.error('Supabase accounts get error:', error);
        logger.error('DB:ACCOUNT_GET', 'Failed to get account from Supabase', { accountId: id, error: error.message, code: error.code }, correlationId || undefined);
        return { error: this.normalizeSupabaseError(error) };
      }

      if (!data) {
        return {
          error: {
            error: 'Account not found.',
            code: ACCOUNT_ERROR_CODES.NOT_FOUND,
          },
        };
      }

      // Validate response data
      const validation = accountEntitySchema.safeParse(data);
      if (!validation.success) {
        console.error('Account validation error:', validation.error);
        return {
          error: {
            error: 'Invalid data received from server.',
            code: ACCOUNT_ERROR_CODES.VALIDATION_ERROR,
          },
        };
      }

      // Map entity schema to domain Account type
      const account: Account = this.mapEntityToAccount(validation.data);

      logger.info('DB:ACCOUNT_GET', 'Account fetched successfully from Supabase', { accountId: account.id, accountName: account.accountName }, correlationId || undefined);
      return { data: account };
    } catch (error) {
      console.error('Get account error:', error);
      return { error: this.normalizeSupabaseError(error) };
    }
  }

  async create(input: Omit<Account, 'id'>, getToken: () => Promise<string | null>) {
    try {
      const correlationId = getCorrelationId();
      
      logger.info(
        'DB:ACCOUNT_INSERT',
        'SupabaseAccountsRepository.create called',
        {
          inputInstitution: input.institution,
          inputAccountName: input.accountName,
          inputAccountType: input.accountType,
          repoType: 'SupabaseAccountsRepository',
        },
        correlationId || undefined
      );

      // Validate input
      const validation = accountCreateSchema.safeParse(input);
      if (!validation.success) {
        logger.warn('DB:ACCOUNT_INSERT', 'Account create input validation failed', { errors: validation.error.errors }, correlationId || undefined);
        return {
          error: {
            error: `Invalid input: ${validation.error.errors.map(e => e.message).join(', ')}`,
            code: ACCOUNT_ERROR_CODES.VALIDATION_ERROR,
          },
        };
      }

      const supabase = await createAuthenticatedSupabaseClient(getToken);

      // CRITICAL: Explicitly extract and set user_id from JWT
      const userIdResult = await ensureUserIdForInsert(getToken, 'create account');
      if ('error' in userIdResult) {
        return { error: userIdResult.error };
      }
      const { userId } = userIdResult;

      // Map camelCase to snake_case for database
      const dbInput: Record<string, unknown> = {
        user_id: userId, // EXPLICIT: Set user_id from JWT
        institution: validation.data.institution,
        account_name: validation.data.accountName,
        balance: validation.data.balance,
        available_balance: validation.data.availableBalance,
        account_type: validation.data.accountType,
        last_updated: validation.data.lastUpdated,
        hidden: validation.data.hidden ?? false,
      };

      const { data, error } = await supabase
        .from('accounts')
        .insert([dbInput])
        .select(this.selectColumns)
        .single();

      if (error) {
        console.error('Supabase accounts create error:', error);
        logger.error(
          'DB:ACCOUNT_INSERT',
          'Failed to create account in Supabase',
          { error: error.message, code: error.code, dbInput },
          correlationId || undefined
        );
        return { error: this.normalizeSupabaseError(error) };
      }

      if (!data) {
        logger.error('DB:ACCOUNT_INSERT', 'Failed to create account - no data returned from Supabase', { dbInput }, correlationId || undefined);
        return {
          error: {
            error: 'Failed to create account - no data returned',
            code: ACCOUNT_ERROR_CODES.UNKNOWN_ERROR,
          },
        };
      }

      // Validate response data
      const responseValidation = accountEntitySchema.safeParse(data);
      if (!responseValidation.success) {
        console.error('Account create response validation error:', responseValidation.error);
        logger.error('DB:ACCOUNT_INSERT', 'Account create response validation failed', { errors: responseValidation.error.errors, data }, correlationId || undefined);
        return {
          error: {
            error: 'Invalid data received from server.',
            code: ACCOUNT_ERROR_CODES.VALIDATION_ERROR,
          },
        };
      }

      // Map entity schema to domain Account type
      const account = this.mapEntityToAccount(responseValidation.data);

      // CRITICAL: Verify the inserted record has the correct user_id
      verifyInsertedUserId(responseValidation.data, userId, 'create account', account.id);

      logger.info(
        'DB:ACCOUNT_INSERT',
        'Account created successfully in Supabase',
        {
          createdAccountId: account.id,
          accountName: account.accountName,
          accountType: account.accountType,
          userId: responseValidation.data.userId,
          userIdMatches: responseValidation.data.userId === userId,
        },
        correlationId || undefined
      );

      return { data: account };
    } catch (error) {
      console.error('Create account error:', error);
      return { error: this.normalizeSupabaseError(error) };
    }
  }

  async update(
    id: string,
    input: Partial<Omit<Account, 'id'>>,
    getToken: () => Promise<string | null>
  ) {
    try {
      const correlationId = getCorrelationId();
      logger.info(
        'DB:ACCOUNT_UPDATE',
        'SupabaseAccountsRepository.update called',
        { accountId: id, input, repoType: 'SupabaseAccountsRepository' },
        correlationId || undefined
      );

      // Validate input
      if (!id) {
        return {
          error: {
            error: 'Account ID is required.',
            code: ACCOUNT_ERROR_CODES.VALIDATION_ERROR,
          },
        };
      }

      const validation = accountUpdateSchema.safeParse(input);
      if (!validation.success) {
        logger.warn('DB:ACCOUNT_UPDATE', 'Account update input validation failed', { accountId: id, errors: validation.error.errors }, correlationId || undefined);
        return {
          error: {
            error: `Invalid input: ${validation.error.errors.map(e => e.message).join(', ')}`,
            code: ACCOUNT_ERROR_CODES.VALIDATION_ERROR,
          },
        };
      }

      const supabase = await createAuthenticatedSupabaseClient(getToken);

      // Map camelCase to snake_case for database
      const dbInput: Record<string, unknown> = {};
      if (validation.data.institution !== undefined) dbInput.institution = validation.data.institution;
      if (validation.data.accountName !== undefined) dbInput.account_name = validation.data.accountName;
      if (validation.data.balance !== undefined) dbInput.balance = validation.data.balance;
      if (validation.data.availableBalance !== undefined) dbInput.available_balance = validation.data.availableBalance;
      if (validation.data.accountType !== undefined) dbInput.account_type = validation.data.accountType;
      if (validation.data.lastUpdated !== undefined) dbInput.last_updated = validation.data.lastUpdated;
      if (validation.data.hidden !== undefined) dbInput.hidden = validation.data.hidden;

      const { data, error } = await supabase
        .from('accounts')
        .update(dbInput)
        .eq('id', id)
        .select(this.selectColumns)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return {
            error: {
              error: 'Account not found.',
              code: ACCOUNT_ERROR_CODES.NOT_FOUND,
            },
          };
        }
        console.error('Supabase accounts update error:', error);
        logger.error('DB:ACCOUNT_UPDATE', 'Failed to update account in Supabase', { accountId: id, error: error.message, code: error.code, dbInput }, correlationId || undefined);
        return { error: this.normalizeSupabaseError(error) };
      }

      if (!data) {
        logger.error('DB:ACCOUNT_UPDATE', 'Failed to update account - no data returned from Supabase', { accountId: id, dbInput }, correlationId || undefined);
        return {
          error: {
            error: 'Failed to update account - no data returned',
            code: ACCOUNT_ERROR_CODES.UNKNOWN_ERROR,
          },
        };
      }

      // Validate response data
      const responseValidation = accountEntitySchema.safeParse(data);
      if (!responseValidation.success) {
        console.error('Account update response validation error:', responseValidation.error);
        logger.error('DB:ACCOUNT_UPDATE', 'Account update response validation failed', { accountId: id, errors: responseValidation.error.errors, data }, correlationId || undefined);
        return {
          error: {
            error: 'Invalid data received from server.',
            code: ACCOUNT_ERROR_CODES.VALIDATION_ERROR,
          },
        };
      }

      // Map entity schema to domain Account type
      const account = this.mapEntityToAccount(responseValidation.data);

      logger.info(
        'DB:ACCOUNT_UPDATE',
        'Account updated successfully in Supabase',
        { updatedAccountId: account.id, accountName: account.accountName, accountType: account.accountType },
        correlationId || undefined
      );

      return { data: account };
    } catch (error) {
      console.error('Update account error:', error);
      return { error: this.normalizeSupabaseError(error) };
    }
  }

  async remove(id: string, getToken: () => Promise<string | null>) {
    try {
      const correlationId = getCorrelationId();
      
      logger.warn(
        'DB:ACCOUNT_DELETE',
        'SupabaseAccountsRepository.remove called',
        {
          accountId: id,
          repoType: 'SupabaseAccountsRepository',
        },
        correlationId || undefined
      );

      // Validate input
      if (!id) {
        return {
          error: {
            error: 'Account ID is required.',
            code: ACCOUNT_ERROR_CODES.VALIDATION_ERROR,
          },
        };
      }

      const supabase = await createAuthenticatedSupabaseClient(getToken);

      const { error } = await supabase
        .from('accounts')
        .delete()
        .eq('id', id);

      if (error) {
        if (error.code === 'PGRST116') {
          return {
            error: {
              error: 'Account not found.',
              code: ACCOUNT_ERROR_CODES.NOT_FOUND,
            },
          };
        }
        console.error('Supabase accounts delete error:', error);
        logger.error('DB:ACCOUNT_DELETE', 'Failed to delete account from Supabase', { accountId: id, error: error.message, code: error.code }, correlationId || undefined);
        return { error: this.normalizeSupabaseError(error) };
      }

      logger.info('DB:ACCOUNT_DELETE', 'Account deleted successfully from Supabase', { accountId: id }, correlationId || undefined);
      return {};
    } catch (error) {
      console.error('Delete account error:', error);
      return { error: this.normalizeSupabaseError(error) };
    }
  }
}

