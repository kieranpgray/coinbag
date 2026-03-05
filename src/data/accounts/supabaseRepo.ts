import type { AccountsRepository } from './repo';
import { createAuthenticatedSupabaseClient } from '@/lib/supabaseClient';
import type { PostgrestError } from '@supabase/supabase-js';
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
import { isSupabaseError } from '@/lib/errorTypes';

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

  // Fallback for very old schemas: minimal columns (no last_updated, hidden)
  private readonly selectColumnsMinimal =
    'id, institution, account_name, balance, account_type, user_id, created_at, updated_at';

  /**
   * Maps database row (snake_case) to entity schema (camelCase)
   * Converts snake_case database columns to camelCase for entity schema validation
   */
  private mapDbRowToEntity(row: Record<string, unknown>): z.infer<typeof accountEntitySchema> {
    const lastUpdated = (row.last_updated ?? row.updated_at ?? row.created_at ?? new Date().toISOString()) as string;
    const hidden = row.hidden === true;
    return {
      id: row.id as string,
      userId: row.user_id as string,
      institution: (row.institution === null || row.institution === '') ? undefined : (row.institution as string),
      accountName: row.account_name as string,
      balance: row.balance as number,
      accountType: row.account_type as string,
      currency: undefined, // Currency field removed from database
      creditLimit: row.credit_limit === null || row.credit_limit === undefined ? undefined : (row.credit_limit as number),
      balanceOwed: row.balance_owed === null || row.balance_owed === undefined ? undefined : (row.balance_owed as number),
      lastUpdated,
      hidden,
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
    if (errorCode === '23502') { // Not-null constraint violation
      return {
        error: 'Required account fields are missing. Please check your input and try again.',
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
        // Check if it's a missing column error (42703, PGRST204) or 400 Bad Request
        const status = typeof error !== 'undefined' && error !== null && 'status' in error
          ? (error as { status?: number }).status
          : undefined;
        const isMissingColumnError = 
          errorCode === '42703' ||
          errorCode === 'PGRST100' ||
          errorCode === 'PGRST204' ||
          status === 400 ||
          (errorMessage.includes('column') || errorMessage.includes('credit_limit') || errorMessage.includes('balance_owed') || errorMessage.toLowerCase().includes('bad request'));
        
        // Check if it's an RLS/permission error
        const isRLSError = 
          errorCode === '42501' ||
          errorMessage.includes('permission denied') ||
          errorMessage.includes('row-level security');
        
        // If we get a 400 error, try fallback query (columns might not exist)
        // This handles cases where error message format doesn't match expected patterns
        const shouldTryFallback = isMissingColumnError || (!isRLSError);
        
        if (shouldTryFallback) {
          // Try fallback 1: without credit fields
          logger.warn('DB:ACCOUNT_LIST', 'Attempting fallback query without credit fields', { 
            originalError: errorMessage,
            code: errorCode,
          }, correlationId || undefined);
          
          const fallback1Result = await supabase
            .from('accounts')
            .select(this.selectColumnsWithoutCreditFields)
            .order('account_name', { ascending: true });
          
          let fallbackResult: { data: Array<Record<string, unknown>> | null; error: PostgrestError | null } = fallback1Result;
          let usedMinimal = false;
          if (fallback1Result.error && isMissingColumnError) {
            // Try fallback 2: minimal columns (very old schema)
            logger.warn('DB:ACCOUNT_LIST', 'Attempting fallback with minimal columns', {
              fallback1Error: fallback1Result.error.message,
            }, correlationId || undefined);
            const fallback2Result = await supabase
              .from('accounts')
              .select(this.selectColumnsMinimal)
              .order('account_name', { ascending: true });
            fallbackResult = fallback2Result;
            usedMinimal = !fallback2Result.error;
          }

          if (fallbackResult.error) {
            // Fallback(s) failed - log the error
            if (isRLSError) {
              logger.error('DB:ACCOUNT_LIST', 'RLS policy may be blocking query', { 
                error: errorMessage, 
                code: errorCode,
                hint: isSupabaseError(error) ? error.hint : undefined,
                details: isSupabaseError(error) ? error.details : undefined,
              }, correlationId || undefined);
            } else {
              logger.error('DB:ACCOUNT_LIST', 'Failed to list accounts from Supabase (fallbacks failed)', { 
                originalError: errorMessage,
                fallbackError: fallbackResult.error,
                code: errorCode,
                hint: isSupabaseError(error) ? error.hint : undefined,
                details: isSupabaseError(error) ? error.details : undefined,
              }, correlationId || undefined);
            }
            // Keep original error
          } else {
            // Fallback succeeded - use fallback data
            logger.info('DB:ACCOUNT_LIST', usedMinimal 
              ? 'Fallback query succeeded with selectColumnsMinimal (schema fallback workaround)' 
              : 'Fallback query succeeded (credit fields not available)', {}, correlationId || undefined);
            data = (fallbackResult.data || []).map((row: Record<string, unknown>) => ({
              ...row,
              credit_limit: (row as { credit_limit?: unknown }).credit_limit ?? null,
              balance_owed: (row as { balance_owed?: unknown }).balance_owed ?? null,
            })) as typeof data;
            error = null;
          }
        } else if (isRLSError) {
          // RLS error - log with more detail
          logger.error('DB:ACCOUNT_LIST', 'RLS policy may be blocking query', {
            error: errorMessage,
            code: errorCode,
            hint: isSupabaseError(error) ? error.hint : undefined,
            details: isSupabaseError(error) ? error.details : undefined,
          }, correlationId || undefined);
        } else {
          // Other error - log with full details
          logger.error('DB:ACCOUNT_LIST', 'Failed to list accounts from Supabase', { 
            error: errorMessage, 
            code: errorCode,
            hint: isSupabaseError(error) ? error.hint : undefined,
            details: isSupabaseError(error) ? error.details : undefined,
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
        const status = typeof error !== 'undefined' && error !== null && 'status' in error
          ? (error as { status?: number }).status
          : undefined;
        const isMissingColumnError = 
          errorCode === '42703' ||
          errorCode === 'PGRST100' ||
          errorCode === 'PGRST204' ||
          status === 400 ||
          (errorMessage.includes('column') || errorMessage.includes('credit_limit') || errorMessage.includes('balance_owed') || errorMessage.toLowerCase().includes('bad request'));
        
        if (isMissingColumnError) {
          // Try fallback 1: without credit fields
          logger.warn('DB:ACCOUNT_GET', 'Attempting fallback query without credit fields', { 
            accountId: id,
            originalError: errorMessage,
            code: errorCode,
          }, correlationId || undefined);
          
          let fallbackResult = await supabase
            .from('accounts')
            .select(this.selectColumnsWithoutCreditFields)
            .eq('id', id)
            .single();
          
          if (fallbackResult.error && isMissingColumnError) {
            // Try fallback 2: minimal columns
            logger.warn('DB:ACCOUNT_GET', 'Attempting fallback with minimal columns', { accountId: id }, correlationId || undefined);
            fallbackResult = await supabase
              .from('accounts')
              .select(this.selectColumnsMinimal)
              .eq('id', id)
              .single();
          }
          
          if (fallbackResult.error) {
            error = fallbackResult.error;
            data = null;
          } else if (fallbackResult.data) {
            logger.info('DB:ACCOUNT_GET', 'Fallback query succeeded', { accountId: id }, correlationId || undefined);
            const row = fallbackResult.data as Record<string, unknown>;
            data = {
              ...row,
              credit_limit: row?.credit_limit ?? null,
              balance_owed: row?.balance_owed ?? null,
              last_updated: row?.last_updated ?? row?.updated_at ?? row?.created_at ?? new Date().toISOString(),
              hidden: row?.hidden === true,
            } as typeof data;
            error = null;
          } else {
            // .single() returned no row
            data = null;
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

      // Institution is optional - use empty string when blank (works with NOT NULL schema)
      dbInput.institution = validation.data.institution ?? '';

      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/d532c30b-ba28-48ae-9049-e559308d64b6', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '0a9435' }, body: JSON.stringify({ sessionId: '0a9435', location: 'supabaseRepo.ts:create', message: 'dbInput before insert', data: { validationInstitution: validation.data.institution, dbInputInstitution: dbInput.institution, typeofInstitution: typeof dbInput.institution, hasInstitutionKey: 'institution' in dbInput, dbInputKeys: Object.keys(dbInput) }, timestamp: Date.now(), hypothesisId: 'H1' }) }).catch(() => {});
      // #endregion

      // Currency is no longer used - removed from form and database
      // Include credit fields if provided (for credit cards/loans)
      if (validation.data.creditLimit !== undefined) {
        dbInput.credit_limit = validation.data.creditLimit;
      }
      if (validation.data.balanceOwed !== undefined) {
        dbInput.balance_owed = validation.data.balanceOwed;
      }

      // Try insert with all columns first
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/d532c30b-ba28-48ae-9049-e559308d64b6', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '0a9435' }, body: JSON.stringify({ sessionId: '0a9435', location: 'supabaseRepo.ts:beforeFirstInsert', message: 'payload right before first insert', data: { institutionValue: dbInput.institution, institutionType: typeof dbInput.institution }, timestamp: Date.now(), hypothesisId: 'H2' }) }).catch(() => {});
      // #endregion
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
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/d532c30b-ba28-48ae-9049-e559308d64b6', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '0a9435' }, body: JSON.stringify({ sessionId: '0a9435', location: 'supabaseRepo.ts:fallbackInsert', message: 'dbInputWithoutCredit before fallback insert', data: { institutionValue: dbInputWithoutCredit.institution, hasInstitutionKey: 'institution' in dbInputWithoutCredit }, timestamp: Date.now(), hypothesisId: 'H5' }) }).catch(() => {});
          // #endregion
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
            } as typeof data;
            error = null;
          }
        }
      }

      // Backward compatibility: retry with available_balance when DB still has old schema (column NOT NULL)
      if (error && String(error?.code) === '23502' && (error?.message?.includes('available_balance') ?? false)) {
        logger.info('DB:ACCOUNT_INSERT:RETRY_AVAILABLE_BALANCE', 'Retrying insert with available_balance for legacy schema', {}, correlationId || undefined);
        dbInput.available_balance = validation.data.balance ?? 0;
        const retryResult = await supabase
          .from('accounts')
          .insert([dbInput])
          .select(this.selectColumns)
          .single();

        if (retryResult.error && (retryResult.error.code === '42703' || retryResult.error.code === 'PGRST204')) {
          const retryErrorMessage = retryResult.error.message || '';
          const missingCreditFieldsOnRetry = retryErrorMessage.includes('credit_limit') || retryErrorMessage.includes('balance_owed');
          if (missingCreditFieldsOnRetry) {
            logger.warn('DB:ACCOUNT_INSERT', 'Credit columns not found on retry, retrying without credit fields', { dbInput }, correlationId || undefined);
            const dbInputWithoutCredit = { ...dbInput };
            delete dbInputWithoutCredit.credit_limit;
            delete dbInputWithoutCredit.balance_owed;
            const retryFallbackResult = await supabase
              .from('accounts')
              .insert([dbInputWithoutCredit])
              .select(this.selectColumnsWithoutCreditFields)
              .single();
            if (retryFallbackResult.error) {
              console.error('Supabase accounts create error (retry fallback):', retryFallbackResult.error);
              return { error: this.normalizeSupabaseError(retryFallbackResult.error) };
            }
            data = {
              ...retryFallbackResult.data,
              credit_limit: null,
              balance_owed: null
            } as typeof data;
            error = null;
          } else {
            return { error: this.normalizeSupabaseError(retryResult.error) };
          }
        } else if (retryResult.error) {
          console.error('Supabase accounts create error (retry):', retryResult.error);
          return { error: this.normalizeSupabaseError(retryResult.error) };
        } else {
          data = retryResult.data;
          error = null;
        }
      }

      if (error) {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/d532c30b-ba28-48ae-9049-e559308d64b6', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '0a9435' }, body: JSON.stringify({ sessionId: '0a9435', location: 'supabaseRepo.ts:createError', message: 'create failed with error', data: { errorCode: error?.code, errorMessage: error?.message, dbInputInstitution: dbInput.institution }, timestamp: Date.now(), hypothesisId: 'H4' }) }).catch(() => {});
        // #endregion
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
      // Convert undefined to empty string for database (works with NOT NULL schema)
      if ('institution' in input) {
        dbInput.institution = validation.data.institution ?? '';
      }
      if (validation.data.accountName !== undefined) dbInput.account_name = validation.data.accountName;
      if (validation.data.balance !== undefined) dbInput.balance = validation.data.balance;
      if (validation.data.accountType !== undefined) dbInput.account_type = validation.data.accountType;
      if (validation.data.lastUpdated !== undefined) dbInput.last_updated = validation.data.lastUpdated;
      if (validation.data.hidden !== undefined) dbInput.hidden = validation.data.hidden;

      let data: Record<string, unknown> | null = null;
      let error: { message?: string; code?: string } | null = null;

      const result = await supabase
        .from('accounts')
        .update(dbInput)
        .eq('id', id)
        .select(this.selectColumns)
        .single();

      data = result.data as Record<string, unknown> | null;
      error = result.error;

      // Fallback: when select fails due to missing columns, retry with reduced select
      if (error) {
        const errorMessage = error.message || '';
        const errorCode = error.code || '';
        const status = typeof error !== 'undefined' && error !== null && 'status' in error
          ? (error as { status?: number }).status
          : undefined;
        const isMissingColumnError = 
          errorCode === '42703' ||
          errorCode === 'PGRST100' ||
          errorCode === 'PGRST204' ||
          status === 400 ||
          (errorMessage.includes('column') || errorMessage.toLowerCase().includes('bad request'));

        if (isMissingColumnError) {
          // Retry 1: without credit fields in select
          const retry1 = await supabase
            .from('accounts')
            .update(dbInput)
            .eq('id', id)
            .select(this.selectColumnsWithoutCreditFields)
            .single();
          if (!retry1.error && retry1.data) {
            data = { ...retry1.data, credit_limit: null, balance_owed: null } as Record<string, unknown>;
            error = null;
            logger.info('DB:ACCOUNT_UPDATE', 'Succeeded with selectColumnsWithoutCreditFields', { accountId: id }, correlationId || undefined);
          } else if (retry1.error && isMissingColumnError) {
            // Retry 2: minimal select, strip last_updated/hidden from payload if they might not exist
            const minimalDbInput = { ...dbInput };
            delete minimalDbInput.last_updated;
            delete minimalDbInput.hidden;
            const retry2 = await supabase
              .from('accounts')
              .update(minimalDbInput)
              .eq('id', id)
              .select(this.selectColumnsMinimal)
              .single();
            if (!retry2.error && retry2.data) {
              data = retry2.data as Record<string, unknown>;
              error = null;
              logger.info('DB:ACCOUNT_UPDATE', 'Succeeded with selectColumnsMinimal (schema fallback workaround)', { accountId: id }, correlationId || undefined);
            } else {
              error = retry2.error ?? retry1.error ?? error;
            }
          } else {
            error = retry1.error ?? error;
          }
        }
      }

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

