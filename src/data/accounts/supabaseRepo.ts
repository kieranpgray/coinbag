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
  // Select actual database column names (snake_case)
  // Supabase doesn't support column aliasing in select strings, so we map them manually
  private readonly selectColumns =
    'id, institution, account_name, balance, account_type, credit_limit, balance_owed, last_updated, hidden, user_id, created_at, updated_at';
  
  // Fallback select columns without credit fields (for databases without credit_limit/balance_owed columns)
  private readonly selectColumnsWithoutCreditFields =
    'id, institution, account_name, balance, account_type, last_updated, hidden, user_id, created_at, updated_at';

  /**
   * Maps database row (snake_case) to entity schema (camelCase)
   * Converts snake_case database columns to camelCase for entity schema validation
   */
  private mapDbRowToEntity(row: Record<string, unknown>): z.infer<typeof accountEntitySchema> {
    return {
      id: row.id as string,
      userId: row.user_id as string,
      institution: row.institution === null ? undefined : (row.institution as string | undefined),
      accountName: row.account_name as string,
      balance: row.balance as number,
      accountType: row.account_type as string,
      currency: undefined, // Currency field removed from database
      creditLimit: row.credit_limit === null ? undefined : (row.credit_limit as number | undefined),
      balanceOwed: row.balance_owed === null ? undefined : (row.balance_owed as number | undefined),
      lastUpdated: row.last_updated as string,
      hidden: row.hidden as boolean,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    };
  }

  /**
   * Maps account entity (with userId and timestamps) to domain Account type (without userId)
   */
  private mapEntityToAccount(entity: z.infer<typeof accountEntitySchema>): Account {
    return {
      id: entity.id,
      institution: entity.institution,
      accountName: entity.accountName,
      balance: entity.balance,
      accountType: entity.accountType,
      currency: entity.currency,
      creditLimit: entity.creditLimit,
      balanceOwed: entity.balanceOwed,
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
      status?: unknown;
    };
    const errorCode = typeof err.code === 'string' ? err.code : undefined;
    const errorMessage = typeof err.message === 'string' ? err.message : String(err);
    const statusCode = typeof err.status === 'number' ? err.status : undefined;
    
    // Enhanced logging for authentication errors
    if (statusCode === 401 || errorMessage.includes('401') || errorMessage.includes('JWT') || errorMessage.includes('authentication')) {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const keyFormat = import.meta.env.VITE_SUPABASE_ANON_KEY?.startsWith('sb_publishable_') ? 'new (sb_publishable_)' : 
                       import.meta.env.VITE_SUPABASE_ANON_KEY?.startsWith('eyJ') ? 'legacy (JWT)' : 'unknown';
      
      logger.error(
        'AUTH:401',
        'Authentication error in accounts repository',
        {
          statusCode,
          errorCode,
          errorMessage: errorMessage.substring(0, 200),
          supabaseUrl,
          keyFormat,
          hasAnonKey: !!import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        getCorrelationId() || undefined
      );
    }

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

      // Try with all columns first, fallback if columns don't exist
      let { data, error } = await supabase
        .from('accounts')
        .select(this.selectColumns)
        .order('account_name', { ascending: true });

      // Handle different error types
      if (error) {
        const errorMessage = error.message || '';
        const errorCode = error.code || '';
        const errorStatus = (error as any).status;
        
        // Check if it's a missing column error (42703) or 400 with column-related message
        const isMissingColumnError = 
          errorCode === '42703' ||
          errorCode === 'PGRST100' ||
          (errorStatus === 400 && (errorMessage.includes('column') || errorMessage.includes('credit_limit') || errorMessage.includes('balance_owed')));
        
        // Check if it's an RLS/permission error
        const isRLSError = 
          errorCode === '42501' ||
          errorMessage.includes('permission denied') ||
          errorMessage.includes('row-level security');
        
        // If we get a 400 error, try fallback query (columns might not exist)
        // This handles cases where error message format doesn't match expected patterns
        const shouldTryFallback = isMissingColumnError || (errorStatus === 400 && !isRLSError);
        
        if (shouldTryFallback) {
          // Try fallback query without credit fields
          logger.warn('DB:ACCOUNT_LIST', 'Attempting fallback query without credit fields', { 
            originalError: errorMessage,
            code: errorCode,
            status: errorStatus,
          }, correlationId || undefined);
          
          const fallbackResult = await supabase
            .from('accounts')
            .select(this.selectColumnsWithoutCreditFields)
            .order('account_name', { ascending: true });
          
          if (fallbackResult.error) {
            // Fallback also failed - log the original error
            if (isRLSError) {
              logger.error('DB:ACCOUNT_LIST', 'RLS policy may be blocking query', { 
                error: errorMessage, 
                code: errorCode,
                hint: (error as any).hint,
                details: (error as any).details,
              }, correlationId || undefined);
            } else {
              logger.error('DB:ACCOUNT_LIST', 'Failed to list accounts from Supabase (fallback also failed)', { 
                originalError: errorMessage,
                fallbackError: fallbackResult.error,
                code: errorCode,
                status: errorStatus,
                hint: (error as any).hint,
                details: (error as any).details,
              }, correlationId || undefined);
            }
            // Keep original error
          } else {
            // Fallback succeeded - use fallback data
            logger.info('DB:ACCOUNT_LIST', 'Fallback query succeeded (credit fields not available)', {}, correlationId || undefined);
            data = (fallbackResult.data || []).map((row: Record<string, unknown>) => ({
              ...row,
              credit_limit: null,
              balance_owed: null
            })) as any;
            error = null;
          }
        } else if (isRLSError) {
          // RLS error - log with more detail
          logger.error('DB:ACCOUNT_LIST', 'RLS policy may be blocking query', { 
            error: errorMessage, 
            code: errorCode,
            hint: (error as any).hint,
            details: (error as any).details,
          }, correlationId || undefined);
        } else {
          // Other error - log with full details
          logger.error('DB:ACCOUNT_LIST', 'Failed to list accounts from Supabase', { 
            error: errorMessage, 
            code: errorCode,
            status: errorStatus,
            hint: (error as any).hint,
            details: (error as any).details,
          }, correlationId || undefined);
        }
      }

      if (error) {
        console.error('Supabase accounts list error:', error);
        return {
          data: [],
          error: this.normalizeSupabaseError(error),
        };
      }

      // Map database rows (snake_case) to entity schema (camelCase)
      const mappedData = (data || []).map(row => this.mapDbRowToEntity(row));

      // Validate response data
      const validation = accountListSchema.safeParse(mappedData);
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

      // Try with all columns first, fallback if columns don't exist
      let { data, error } = await supabase
        .from('accounts')
        .select(this.selectColumns)
        .eq('id', id)
        .single();

      // Handle missing credit fields with fallback query
      if (error) {
        const errorMessage = error.message || '';
        const errorCode = error.code || '';
        const errorStatus = (error as any).status;
        
        // Check if it's a missing column error (42703) or 400 error
        const isMissingColumnError = 
          errorCode === '42703' ||
          errorCode === 'PGRST100' ||
          (errorStatus === 400 && (errorMessage.includes('column') || errorMessage.includes('credit_limit') || errorMessage.includes('balance_owed')));
        
        // If we get a 400 error or missing column error, try fallback query
        const shouldTryFallback = isMissingColumnError || (errorStatus === 400);
        
        if (shouldTryFallback) {
          // Try fallback query without credit fields
          logger.warn('DB:ACCOUNT_GET', 'Attempting fallback query without credit fields', { 
            accountId: id,
            originalError: errorMessage,
            code: errorCode,
            status: errorStatus,
          }, correlationId || undefined);
          
          const fallbackResult = await supabase
            .from('accounts')
            .select(this.selectColumnsWithoutCreditFields)
            .eq('id', id)
            .single();
          
          if (fallbackResult.error) {
            // Fallback also failed - keep original error
            error = fallbackResult.error;
            data = null;
          } else {
            // Fallback succeeded - use fallback data
            logger.info('DB:ACCOUNT_GET', 'Fallback query succeeded (credit fields not available)', { accountId: id }, correlationId || undefined);
            data = {
              ...fallbackResult.data,
              credit_limit: null,
              balance_owed: null
            } as any;
            error = null;
          }
        }
      }

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

      // Map database row (snake_case) to entity schema (camelCase)
      const mappedData = this.mapDbRowToEntity(data);

      // Validate response data
      const validation = accountEntitySchema.safeParse(mappedData);
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
        account_name: validation.data.accountName,
        balance: validation.data.balance,
        account_type: validation.data.accountType,
        last_updated: validation.data.lastUpdated,
        hidden: validation.data.hidden ?? false,
      };

      // Institution is optional - explicitly handle undefined to null for database
      dbInput.institution = validation.data.institution ?? null;

      // Currency is no longer used - removed from form and database
      // Include credit fields if provided (for credit cards/loans)
      if (validation.data.creditLimit !== undefined) {
        dbInput.credit_limit = validation.data.creditLimit;
      }
      if (validation.data.balanceOwed !== undefined) {
        dbInput.balance_owed = validation.data.balanceOwed;
      }

      // Try insert with all columns first
      let { data, error } = await supabase
        .from('accounts')
        .insert([dbInput])
        .select(this.selectColumns)
        .single();

      // Handle missing credit fields with fallback query
      if (error && (error.code === '42703' || error.code === 'PGRST204')) {
        const errorMessage = error.message || '';
        const missingCreditFields = errorMessage.includes('credit_limit') || errorMessage.includes('balance_owed');
        
        if (missingCreditFields) {
          // Credit fields missing - retry without them
          logger.warn('DB:ACCOUNT_INSERT', 'Credit columns not found, retrying without credit fields', { dbInput }, correlationId || undefined);
          const dbInputWithoutCredit = { ...dbInput };
          delete dbInputWithoutCredit.credit_limit;
          delete dbInputWithoutCredit.balance_owed;
          
          const fallbackResult = await supabase
            .from('accounts')
            .insert([dbInputWithoutCredit])
            .select(this.selectColumnsWithoutCreditFields)
            .single();
          
          if (fallbackResult.error) {
            error = fallbackResult.error;
            data = null;
          } else {
            // Fallback succeeded - use fallback data
            logger.info('DB:ACCOUNT_INSERT', 'Fallback query succeeded (credit fields not available)', {}, correlationId || undefined);
            data = {
              ...fallbackResult.data,
              credit_limit: null,
              balance_owed: null
            } as any;
            error = null;
          }
        }
      }

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

      // Map database row (snake_case) to entity schema (camelCase)
      const mappedData = this.mapDbRowToEntity(data);

      // Validate response data
      const responseValidation = accountEntitySchema.safeParse(mappedData);
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
      // Handle institution: if explicitly provided in input (even if empty/undefined after validation), include it
      // This allows clearing the institution field by setting it to null
      // Explicitly handle undefined to null for consistent database mapping
      if ('institution' in input) {
        // If institution was explicitly provided, use the validated value (which may be undefined)
        // Convert undefined to null for database (to clear the field)
        dbInput.institution = validation.data.institution ?? null;
      }
      if (validation.data.accountName !== undefined) dbInput.account_name = validation.data.accountName;
      if (validation.data.balance !== undefined) dbInput.balance = validation.data.balance;
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

      // Map database row (snake_case) to entity schema (camelCase)
      const mappedData = this.mapDbRowToEntity(data);

      // Validate response data
      const responseValidation = accountEntitySchema.safeParse(mappedData);
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

