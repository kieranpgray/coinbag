import type { TransactionsRepository } from './repo';
import { createAuthenticatedSupabaseClient } from '@/lib/supabaseClient';
import { ensureUserIdForInsert } from '@/lib/repositoryHelpers';
import {
  transactionCreateSchema,
  transactionUpdateSchema,
  transactionBatchCreateSchema,
  transactionListSchema,
  transactionEntitySchema,
  TRANSACTION_ERROR_CODES,
} from '@/contracts/transactions';
import { logger, getCorrelationId } from '@/lib/logger';
import { z } from 'zod';

/**
 * Supabase implementation of TransactionsRepository
 * 
 * Handles all CRUD operations for transactions stored in Supabase PostgreSQL database.
 * Uses Clerk JWT authentication and Row Level Security (RLS) for data isolation.
 */
export class SupabaseTransactionsRepository implements TransactionsRepository {
  private readonly selectColumns =
    'id, userId:user_id, accountId:account_id, date, description, amount, type, category, transactionReference:transaction_reference, statementImportId:statement_import_id, createdAt:created_at, updatedAt:updated_at';

  /**
   * Normalize Supabase errors to user-friendly messages
   */
  private normalizeSupabaseError(error: unknown): { error: string; code: string } {
    if (!error || typeof error !== 'object') {
      return {
        error: 'An unexpected error occurred.',
        code: TRANSACTION_ERROR_CODES.UNKNOWN_ERROR,
      };
    }

    const err = error as Record<string, unknown> & {
      code?: unknown;
      message?: unknown;
      details?: unknown;
    };
    const errorCode = typeof err.code === 'string' ? err.code : undefined;

    // Handle known PostgreSQL/Supabase error codes
    if (errorCode === '23505') { // Unique violation (duplicate transaction reference)
      return {
        error: 'A transaction with this reference already exists for this account.',
        code: TRANSACTION_ERROR_CODES.DUPLICATE_ENTRY,
      };
    }
    if (errorCode === '23503') { // Foreign key violation
      return {
        error: 'Referenced account or statement import not found.',
        code: TRANSACTION_ERROR_CODES.PERMISSION_DENIED,
      };
    }
    if (errorCode === '23514') { // Check constraint violation
      return {
        error: 'Invalid transaction data provided.',
        code: TRANSACTION_ERROR_CODES.VALIDATION_ERROR,
      };
    }
    if (errorCode === 'PGRST116') { // No rows found for single()
      return {
        error: 'Transaction not found.',
        code: TRANSACTION_ERROR_CODES.NOT_FOUND,
      };
    }
    if (errorCode === 'PGRST301') { // RLS policy violation
      return {
        error: 'You do not have permission to access this transaction.',
        code: TRANSACTION_ERROR_CODES.PERMISSION_DENIED,
      };
    }

    // Handle specific Supabase error patterns
    const message = typeof err.message === 'string' ? err.message : undefined;
    if (message?.includes('JWT')) {
      return {
        error: 'Authentication token expired. Please sign in again.',
        code: TRANSACTION_ERROR_CODES.AUTH_EXPIRED,
      };
    }
    if (message?.includes('permission')) {
      return {
        error: 'You do not have permission to perform this action.',
        code: TRANSACTION_ERROR_CODES.PERMISSION_DENIED,
      };
    }

    return {
      error: typeof message === 'string' ? message : 'An unexpected error occurred.',
      code: TRANSACTION_ERROR_CODES.UNKNOWN_ERROR,
    };
  }

  async list(accountId?: string, getToken?: () => Promise<string | null>, statementImportId?: string) {
    try {
      const correlationId = getCorrelationId();
      const isProduction = import.meta.env.MODE === 'production' || import.meta.env.PROD === true;
      const dataSource = import.meta.env.VITE_DATA_SOURCE || 'supabase';
      
      // CRITICAL: Verify we're using Supabase, not mock data
      if (dataSource === 'mock') {
        logger.error('DB:TRANSACTION_LIST', 'CRITICAL: Mock data source detected! Transactions will not persist.', {
          dataSource,
          accountId,
          statementImportId,
          note: 'Set VITE_DATA_SOURCE=supabase in environment variables'
        }, correlationId || undefined);
        throw new Error('Mock data source is not supported for transactions. Set VITE_DATA_SOURCE=supabase');
      }
      
      if (!getToken) {
        throw new Error('getToken function is required');
      }

      logger.info('DB:TRANSACTION_LIST', 'Fetching transactions from Supabase', {
        dataSource,
        accountId,
        statementImportId,
        isProduction
      }, correlationId || undefined);

      // Dev-only: Log auth context for RLS diagnostics
      if (import.meta.env.DEV || import.meta.env.VITE_DEBUG_LOGGING === 'true') {
        try {
          const { getUserIdFromToken } = await import('@/lib/supabaseClient');
          const userId = await getUserIdFromToken(getToken);
          const { data: sessionData } = await (await import('@/lib/supabase/supabaseBrowserClient')).getSupabaseBrowserClient().auth.getSession();
          const sessionUserId = sessionData?.session?.user?.id;
          
          console.log("[TX Fetch]", {
            correlationId,
            userId,
            sessionUserId,
            accountId,
            statementImportId,
            hasSession: !!sessionData?.session,
          });
          
          logger.debug(
            'DB:TRANSACTION_LIST:AUTH',
            'Auth context for transaction fetch',
            {
              correlationId,
              userId,
              sessionUserId,
              accountId,
              statementImportId,
              hasSession: !!sessionData?.session,
            },
            correlationId || undefined
          );
        } catch (authError) {
          // Non-fatal - just log and continue
          logger.debug(
            'DB:TRANSACTION_LIST:AUTH',
            'Could not get auth context for diagnostics',
            {
              correlationId,
              error: authError instanceof Error ? authError.message : String(authError),
            },
            correlationId || undefined
          );
        }
      }

      const supabase = await createAuthenticatedSupabaseClient(getToken);

      let query = supabase
        .from('transactions')
        .select(this.selectColumns)
        .order('date', { ascending: false });

      if (accountId) {
        query = query.eq('account_id', accountId);
      }

      // CRITICAL: Filter by statement_import_id if provided (provenance filtering)
      if (statementImportId) {
        query = query.eq('statement_import_id', statementImportId);
        logger.info('DB:TRANSACTION_LIST', 'Filtering transactions by statement_import_id', { accountId, statementImportId }, correlationId || undefined);
      }

      // CRITICAL: In production, only show transactions with statement_import_id (provenance from OCR)
      // This prevents showing test/manual transactions in production views
      // Allow null in dev/test for manual testing
      if (isProduction && !statementImportId) {
        query = query.not('statement_import_id', 'is', null);
        logger.info('DB:TRANSACTION_LIST', 'Production mode: filtering out transactions without statement_import_id', { accountId }, correlationId || undefined);
      }

      const { data, error } = await query;

      // === CHECKPOINT 6: API RESPONSE ===
      const transactionsReturned = data?.length || 0
      console.log('=== CHECKPOINT 6: API RESPONSE ===')
      console.log('File: src/data/transactions/supabaseRepo.ts:193')
      console.log('Query parameters:', { accountId, statementImportId })
      console.log('Transactions returned to UI:', transactionsReturned)
      console.log('Sample transactions (first 3):', data?.slice(0, 3))
      console.log('Status:', transactionsReturned >= 40 ? `✅ ${transactionsReturned} transactions (expected ~43)` : `❌ Only ${transactionsReturned} transactions (expected 43)`)
      
      logger.info('CHECKPOINT:API_RESPONSE', 'API response checkpoint', {
        file: 'src/data/transactions/supabaseRepo.ts:193',
        queryParameters: { accountId, statementImportId },
        transactionsReturned: transactionsReturned,
        sampleTransactions: data?.slice(0, 3),
        status: transactionsReturned >= 40 ? 'OK' : 'LOSS_DETECTED',
        expectedCount: 43
      }, correlationId || undefined)

      if (error) {
        console.error('Supabase transactions list error:', error);
        logger.error(
          'DB:TRANSACTION_LIST',
          'Failed to list transactions from Supabase',
          { error: error.message, code: error.code, accountId },
          correlationId || undefined
        );
        return { error: this.normalizeSupabaseError(error), data: [] };
      }

      if (!data) {
        return { data: [] };
      }

      // Validate response data
      const validation = transactionListSchema.safeParse(data);
      if (!validation.success) {
        console.error('Transactions validation error:', validation.error);
        return {
          error: {
            error: 'Invalid data received from server.',
            code: TRANSACTION_ERROR_CODES.VALIDATION_ERROR,
          },
          data: [],
        };
      }

      // CRITICAL: Runtime validation - filter out any transactions without statement_import_id in production
      // This is a safety net in case the query filter didn't work as expected
      let validatedTransactions = validation.data;
      if (isProduction && !statementImportId) {
        const beforeCount = validatedTransactions.length;
        validatedTransactions = validatedTransactions.filter(tx => tx.statementImportId !== null && tx.statementImportId !== undefined);
        const filteredCount = beforeCount - validatedTransactions.length;
        if (filteredCount > 0) {
          logger.warn('DB:TRANSACTION_LIST', 'Filtered out transactions without statement_import_id (runtime safety check)', { 
            accountId, 
            beforeCount, 
            afterCount: validatedTransactions.length,
            filteredCount 
          }, correlationId || undefined);
        }
      }

      // CRITICAL: If statementImportId was provided, ensure ALL returned transactions match
      // This prevents data leakage if query filter fails
      if (statementImportId) {
        const mismatched = validatedTransactions.filter(tx => tx.statementImportId !== statementImportId);
        if (mismatched.length > 0) {
          logger.error('DB:TRANSACTION_LIST', 'CRITICAL: Transactions returned with mismatched statement_import_id', { 
            accountId, 
            expectedStatementImportId: statementImportId,
            mismatchedCount: mismatched.length,
            mismatchedIds: mismatched.map(tx => tx.id)
          }, correlationId || undefined);
          // In production, filter them out for safety
          if (isProduction) {
            validatedTransactions = validatedTransactions.filter(tx => tx.statementImportId === statementImportId);
          }
        }
      }

      logger.info('DB:TRANSACTION_LIST', 'Transactions listed successfully from Supabase', { 
        count: validatedTransactions.length, 
        accountId, 
        statementImportId,
        hasProvenanceFilter: !!statementImportId || (isProduction && !statementImportId)
      }, correlationId || undefined);
      
      // CRITICAL: Log query results for debugging
      const incomeCount = validatedTransactions.filter(tx => tx.type === 'income').length;
      const expenseCount = validatedTransactions.filter(tx => tx.type === 'expense').length;
      const positiveAmountCount = validatedTransactions.filter(tx => tx.amount > 0).length;
      const negativeAmountCount = validatedTransactions.filter(tx => tx.amount < 0).length;
      
      logger.info('DB:TRANSACTION_LIST:QUERY_RESULT', 'Transaction query results with sample data', {
        accountId,
        statementImportId,
        totalCount: validatedTransactions.length,
        incomeCount,
        expenseCount,
        positiveAmountCount,
        negativeAmountCount,
        sampleTransactions: validatedTransactions.slice(0, 5).map(tx => ({
          id: tx.id,
          amount: tx.amount,
          type: tx.type,
          description: tx.description?.substring(0, 50),
          date: tx.date,
          amountSignMatchesType: (tx.type === 'income' && tx.amount > 0) || (tx.type === 'expense' && tx.amount < 0)
        }))
      }, correlationId || undefined);
      
      return { data: validatedTransactions };
    } catch (error) {
      console.error('List transactions error:', error);
      return { error: this.normalizeSupabaseError(error), data: [] };
    }
  }

  async get(id: string, getToken: () => Promise<string | null>) {
    try {
      const correlationId = getCorrelationId();
      
      const supabase = await createAuthenticatedSupabaseClient(getToken);

      const { data, error } = await supabase
        .from('transactions')
        .select(this.selectColumns)
        .eq('id', id)
        .single();

      if (error) {
        console.error('Supabase transaction get error:', error);
        logger.error(
          'DB:TRANSACTION_GET',
          'Failed to get transaction from Supabase',
          { error: error.message, code: error.code, transactionId: id },
          correlationId || undefined
        );
        return { error: this.normalizeSupabaseError(error) };
      }

      if (!data) {
        return {
          error: {
            error: 'Transaction not found.',
            code: TRANSACTION_ERROR_CODES.NOT_FOUND,
          },
        };
      }

      // Validate response data
      const validation = transactionEntitySchema.safeParse(data);
      if (!validation.success) {
        console.error('Transaction validation error:', validation.error);
        return {
          error: {
            error: 'Invalid data received from server.',
            code: TRANSACTION_ERROR_CODES.VALIDATION_ERROR,
          },
        };
      }

      logger.info('DB:TRANSACTION_GET', 'Transaction fetched successfully from Supabase', { transactionId: validation.data.id }, correlationId || undefined);
      return { data: validation.data };
    } catch (error) {
      console.error('Get transaction error:', error);
      return { error: this.normalizeSupabaseError(error) };
    }
  }

  async create(input: Omit<z.infer<typeof transactionEntitySchema>, 'id' | 'userId' | 'createdAt' | 'updatedAt'>, getToken: () => Promise<string | null>) {
    try {
      const correlationId = getCorrelationId();
      
      // Validate input
      const validation = transactionCreateSchema.safeParse(input);
      if (!validation.success) {
        return {
          error: {
            error: `Invalid input: ${validation.error.errors.map(e => e.message).join(', ')}`,
            code: TRANSACTION_ERROR_CODES.VALIDATION_ERROR,
          },
        };
      }

      const supabase = await createAuthenticatedSupabaseClient(getToken);

      // CRITICAL: Explicitly extract and set user_id from JWT
      const userIdResult = await ensureUserIdForInsert(getToken, 'create transaction');
      if ('error' in userIdResult) {
        return { error: userIdResult.error };
      }
      const { userId } = userIdResult;

      // Map camelCase to snake_case for database
      const dbInput: Record<string, unknown> = {
        user_id: userId,
        account_id: validation.data.accountId,
        date: validation.data.date,
        description: validation.data.description,
        amount: validation.data.amount,
        type: validation.data.type,
        category: validation.data.category || null,
        transaction_reference: validation.data.transactionReference || null,
        statement_import_id: validation.data.statementImportId || null,
      };

      const { data, error } = await supabase
        .from('transactions')
        .insert([dbInput])
        .select(this.selectColumns)
        .single();

      if (error) {
        console.error('Supabase transaction create error:', error);
        logger.error(
          'DB:TRANSACTION_INSERT',
          'Failed to create transaction in Supabase',
          { error: error.message, code: error.code, dbInput },
          correlationId || undefined
        );
        return { error: this.normalizeSupabaseError(error) };
      }

      if (!data) {
        return {
          error: {
            error: 'Failed to create transaction - no data returned',
            code: TRANSACTION_ERROR_CODES.UNKNOWN_ERROR,
          },
        };
      }

      // Validate response data
      const responseValidation = transactionEntitySchema.safeParse(data);
      if (!responseValidation.success) {
        console.error('Transaction response validation error:', responseValidation.error);
        return {
          error: {
            error: 'Invalid data received from server.',
            code: TRANSACTION_ERROR_CODES.VALIDATION_ERROR,
          },
        };
      }

      logger.info('DB:TRANSACTION_INSERT', 'Transaction created successfully in Supabase', { transactionId: responseValidation.data.id }, correlationId || undefined);
      return { data: responseValidation.data };
    } catch (error) {
      console.error('Create transaction error:', error);
      return { error: this.normalizeSupabaseError(error) };
    }
  }

  async createBatch(inputs: Array<Omit<z.infer<typeof transactionEntitySchema>, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>, getToken: () => Promise<string | null>) {
    try {
      const correlationId = getCorrelationId();
      
      if (inputs.length === 0) {
        return { data: [] };
      }

      // Validate all inputs
      const validation = transactionBatchCreateSchema.safeParse({ transactions: inputs });
      if (!validation.success) {
        return {
          error: {
            error: `Invalid input: ${validation.error.errors.map(e => e.message).join(', ')}`,
            code: TRANSACTION_ERROR_CODES.VALIDATION_ERROR,
          },
        };
      }

      const supabase = await createAuthenticatedSupabaseClient(getToken);

      // CRITICAL: Explicitly extract and set user_id from JWT
      const userIdResult = await ensureUserIdForInsert(getToken, 'create transactions batch');
      if ('error' in userIdResult) {
        return { error: userIdResult.error };
      }
      const { userId } = userIdResult;

      // Map camelCase to snake_case for database
      const dbInputs = validation.data.transactions.map((input) => ({
        user_id: userId,
        account_id: input.accountId,
        date: input.date,
        description: input.description,
        amount: input.amount,
        type: input.type,
        category: input.category || null,
        transaction_reference: input.transactionReference || null,
        statement_import_id: input.statementImportId || null,
      }));

      // Use a transaction to ensure atomicity
      const { data, error } = await supabase
        .from('transactions')
        .insert(dbInputs)
        .select(this.selectColumns);

      if (error) {
        console.error('Supabase transactions batch create error:', error);
        logger.error(
          'DB:TRANSACTION_BATCH_INSERT',
          'Failed to create transactions batch in Supabase',
          { error: error.message, code: error.code, count: dbInputs.length },
          correlationId || undefined
        );
        return { error: this.normalizeSupabaseError(error) };
      }

      if (!data || data.length === 0) {
        return {
          error: {
            error: 'Failed to create transactions - no data returned',
            code: TRANSACTION_ERROR_CODES.UNKNOWN_ERROR,
          },
        };
      }

      // Validate response data
      const responseValidation = transactionListSchema.safeParse(data);
      if (!responseValidation.success) {
        console.error('Transactions batch response validation error:', responseValidation.error);
        return {
          error: {
            error: 'Invalid data received from server.',
            code: TRANSACTION_ERROR_CODES.VALIDATION_ERROR,
          },
        };
      }

      logger.info('DB:TRANSACTION_BATCH_INSERT', 'Transactions batch created successfully in Supabase', { count: responseValidation.data.length }, correlationId || undefined);
      return { data: responseValidation.data };
    } catch (error) {
      console.error('Create transactions batch error:', error);
      return { error: this.normalizeSupabaseError(error) };
    }
  }

  async update(id: string, input: Partial<Omit<z.infer<typeof transactionEntitySchema>, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>, getToken: () => Promise<string | null>) {
    try {
      const correlationId = getCorrelationId();
      
      const supabase = await createAuthenticatedSupabaseClient(getToken);

      // Validate input
      const validation = transactionUpdateSchema.safeParse(input);
      if (!validation.success) {
        return {
          error: {
            error: `Invalid input: ${validation.error.errors.map(e => e.message).join(', ')}`,
            code: TRANSACTION_ERROR_CODES.VALIDATION_ERROR,
          },
        };
      }

      // Map camelCase to snake_case for database
      const dbInput: Record<string, unknown> = {};
      if (validation.data.accountId !== undefined) dbInput.account_id = validation.data.accountId;
      if (validation.data.date !== undefined) dbInput.date = validation.data.date;
      if (validation.data.description !== undefined) dbInput.description = validation.data.description;
      if (validation.data.amount !== undefined) dbInput.amount = validation.data.amount;
      if (validation.data.type !== undefined) dbInput.type = validation.data.type;
      if (validation.data.category !== undefined) dbInput.category = validation.data.category;
      if (validation.data.transactionReference !== undefined) dbInput.transaction_reference = validation.data.transactionReference;

      if (Object.keys(dbInput).length === 0) {
        // No changes to update
        return this.get(id, getToken);
      }

      const { data, error } = await supabase
        .from('transactions')
        .update(dbInput)
        .eq('id', id)
        .select(this.selectColumns)
        .single();

      if (error) {
        console.error('Supabase transaction update error:', error);
        logger.error(
          'DB:TRANSACTION_UPDATE',
          'Failed to update transaction in Supabase',
          { error: error.message, code: error.code, transactionId: id },
          correlationId || undefined
        );
        return { error: this.normalizeSupabaseError(error) };
      }

      if (!data) {
        return {
          error: {
            error: 'Transaction not found.',
            code: TRANSACTION_ERROR_CODES.NOT_FOUND,
          },
        };
      }

      // Validate response data
      const responseValidation = transactionEntitySchema.safeParse(data);
      if (!responseValidation.success) {
        console.error('Transaction response validation error:', responseValidation.error);
        return {
          error: {
            error: 'Invalid data received from server.',
            code: TRANSACTION_ERROR_CODES.VALIDATION_ERROR,
          },
        };
      }

      logger.info('DB:TRANSACTION_UPDATE', 'Transaction updated successfully in Supabase', { transactionId: responseValidation.data.id }, correlationId || undefined);
      return { data: responseValidation.data };
    } catch (error) {
      console.error('Update transaction error:', error);
      return { error: this.normalizeSupabaseError(error) };
    }
  }

  async remove(id: string, getToken: () => Promise<string | null>) {
    try {
      const correlationId = getCorrelationId();
      
      const supabase = await createAuthenticatedSupabaseClient(getToken);

      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Supabase transaction delete error:', error);
        logger.error(
          'DB:TRANSACTION_DELETE',
          'Failed to delete transaction from Supabase',
          { error: error.message, code: error.code, transactionId: id },
          correlationId || undefined
        );
        return { error: this.normalizeSupabaseError(error) };
      }

      logger.info('DB:TRANSACTION_DELETE', 'Transaction deleted successfully from Supabase', { transactionId: id }, correlationId || undefined);
      return {};
    } catch (error) {
      console.error('Delete transaction error:', error);
      return { error: this.normalizeSupabaseError(error) };
    }
  }
}

