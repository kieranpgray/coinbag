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

  async list(accountId?: string, getToken?: () => Promise<string | null>) {
    try {
      const correlationId = getCorrelationId();
      
      if (!getToken) {
        throw new Error('getToken function is required');
      }

      const supabase = await createAuthenticatedSupabaseClient(getToken);

      let query = supabase
        .from('transactions')
        .select(this.selectColumns)
        .order('date', { ascending: false });

      if (accountId) {
        query = query.eq('account_id', accountId);
      }

      const { data, error } = await query;

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

      logger.info('DB:TRANSACTION_LIST', 'Transactions listed successfully from Supabase', { count: validation.data.length, accountId }, correlationId || undefined);
      return { data: validation.data };
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

