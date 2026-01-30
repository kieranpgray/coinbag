import type { StatementImportsRepository } from './repo';
import { createAuthenticatedSupabaseClient } from '@/lib/supabaseClient';
import { ensureUserIdForInsert } from '@/lib/repositoryHelpers';
import {
  statementImportCreateSchema,
  statementImportUpdateSchema,
  statementImportListSchema,
  statementImportEntitySchema,
  STATEMENT_IMPORT_ERROR_CODES,
} from '@/contracts/statementImports';
import { logger, getCorrelationId } from '@/lib/logger';
import { z } from 'zod';

/**
 * Supabase implementation of StatementImportsRepository
 * 
 * Handles all CRUD operations for statement imports stored in Supabase PostgreSQL database.
 * Uses Clerk JWT authentication and Row Level Security (RLS) for data isolation.
 */
export class SupabaseStatementImportsRepository implements StatementImportsRepository {
  private readonly selectColumns =
    'id, userId:user_id, accountId:account_id, fileName:file_name, filePath:file_path, fileHash:file_hash, fileSize:file_size, mimeType:mime_type, status, parsingMethod:parsing_method, totalTransactions:total_transactions, importedTransactions:imported_transactions, failedTransactions:failed_transactions, confidenceScore:confidence_score, errorMessage:error_message, metadata, correlationId:correlation_id, createdAt:created_at, updatedAt:updated_at, completedAt:completed_at';

  /**
   * Normalize Supabase errors to user-friendly messages
   */
  private normalizeSupabaseError(error: unknown): { error: string; code: string } {
    if (!error || typeof error !== 'object') {
      return {
        error: 'An unexpected error occurred.',
        code: STATEMENT_IMPORT_ERROR_CODES.UNKNOWN_ERROR,
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
        error: 'A statement import with this file hash already exists.',
        code: STATEMENT_IMPORT_ERROR_CODES.DUPLICATE_FILE,
      };
    }
    if (errorCode === '23503') { // Foreign key violation
      return {
        error: 'Referenced account not found or permission denied.',
        code: STATEMENT_IMPORT_ERROR_CODES.PERMISSION_DENIED,
      };
    }
    if (errorCode === '23514') { // Check constraint violation
      return {
        error: 'Invalid statement import data provided.',
        code: STATEMENT_IMPORT_ERROR_CODES.VALIDATION_ERROR,
      };
    }
    if (errorCode === 'PGRST116') { // No rows found for single()
      return {
        error: 'Statement import not found.',
        code: STATEMENT_IMPORT_ERROR_CODES.NOT_FOUND,
      };
    }
    if (errorCode === 'PGRST301') { // RLS policy violation
      return {
        error: 'You do not have permission to access this statement import.',
        code: STATEMENT_IMPORT_ERROR_CODES.PERMISSION_DENIED,
      };
    }

    // Handle specific Supabase error patterns
    const message = typeof err.message === 'string' ? err.message : undefined;
    if (message?.includes('JWT')) {
      return {
        error: 'Authentication token expired. Please sign in again.',
        code: STATEMENT_IMPORT_ERROR_CODES.AUTH_EXPIRED,
      };
    }
    if (message?.includes('permission')) {
      return {
        error: 'You do not have permission to perform this action.',
        code: STATEMENT_IMPORT_ERROR_CODES.PERMISSION_DENIED,
      };
    }

    return {
      error: typeof message === 'string' ? message : 'An unexpected error occurred.',
      code: STATEMENT_IMPORT_ERROR_CODES.UNKNOWN_ERROR,
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
        .from('statement_imports')
        .select(this.selectColumns)
        .order('created_at', { ascending: false });

      if (accountId) {
        query = query.eq('account_id', accountId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Supabase statement imports list error:', error);
        logger.error(
          'DB:STATEMENT_IMPORT_LIST',
          'Failed to list statement imports from Supabase',
          { error: error.message, code: error.code, accountId },
          correlationId || undefined
        );
        return { error: this.normalizeSupabaseError(error), data: [] };
      }

      if (!data) {
        return { data: [] };
      }

      // Validate response data
      const validation = statementImportListSchema.safeParse(data);
      if (!validation.success) {
        console.error('Statement imports validation error:', validation.error);
        return {
          error: {
            error: 'Invalid data received from server.',
            code: STATEMENT_IMPORT_ERROR_CODES.VALIDATION_ERROR,
          },
          data: [],
        };
      }

      logger.info('DB:STATEMENT_IMPORT_LIST', 'Statement imports listed successfully from Supabase', { count: validation.data.length, accountId }, correlationId || undefined);
      return { data: validation.data };
    } catch (error) {
      console.error('List statement imports error:', error);
      return { error: this.normalizeSupabaseError(error), data: [] };
    }
  }

  async get(id: string, getToken: () => Promise<string | null>) {
    try {
      const correlationId = getCorrelationId();
      
      const supabase = await createAuthenticatedSupabaseClient(getToken);

      const { data, error } = await supabase
        .from('statement_imports')
        .select(this.selectColumns)
        .eq('id', id)
        .single();

      if (error) {
        console.error('Supabase statement import get error:', error);
        logger.error(
          'DB:STATEMENT_IMPORT_GET',
          'Failed to get statement import from Supabase',
          { error: error.message, code: error.code, statementImportId: id },
          correlationId || undefined
        );
        return { error: this.normalizeSupabaseError(error) };
      }

      if (!data) {
        return {
          error: {
            error: 'Statement import not found.',
            code: STATEMENT_IMPORT_ERROR_CODES.NOT_FOUND,
          },
        };
      }

      // Validate response data
      const validation = statementImportEntitySchema.safeParse(data);
      if (!validation.success) {
        console.error('Statement import validation error:', validation.error);
        return {
          error: {
            error: 'Invalid data received from server.',
            code: STATEMENT_IMPORT_ERROR_CODES.VALIDATION_ERROR,
          },
        };
      }

      logger.info('DB:STATEMENT_IMPORT_GET', 'Statement import fetched successfully from Supabase', { statementImportId: validation.data.id }, correlationId || undefined);
      return { data: validation.data };
    } catch (error) {
      console.error('Get statement import error:', error);
      return { error: this.normalizeSupabaseError(error) };
    }
  }

  async create(input: z.infer<typeof statementImportCreateSchema>, getToken: () => Promise<string | null>) {
    try {
      const correlationId = getCorrelationId();
      
      logger.info(
        'DB:STATEMENT_IMPORT_INSERT',
        'SupabaseStatementImportsRepository.create called',
        {
          inputFileName: input.fileName,
          inputAccountId: input.accountId,
          repoType: 'SupabaseStatementImportsRepository',
        },
        correlationId || undefined
      );

      // Validate input
      const validation = statementImportCreateSchema.safeParse(input);
      if (!validation.success) {
        logger.warn('DB:STATEMENT_IMPORT_INSERT', 'Statement import create input validation failed', { errors: validation.error.errors }, correlationId || undefined);
        return {
          error: {
            error: `Invalid input: ${validation.error.errors.map(e => e.message).join(', ')}`,
            code: STATEMENT_IMPORT_ERROR_CODES.VALIDATION_ERROR,
          },
        };
      }

      const supabase = await createAuthenticatedSupabaseClient(getToken);

      // CRITICAL: Explicitly extract and set user_id from JWT
      const userIdResult = await ensureUserIdForInsert(getToken, 'create statement import');
      if ('error' in userIdResult) {
        return { error: userIdResult.error };
      }
      const { userId } = userIdResult;

      // Map camelCase to snake_case for database
      const dbInput: Record<string, unknown> = {
        user_id: userId, // EXPLICIT: Set user_id from JWT
        account_id: validation.data.accountId,
        file_name: validation.data.fileName,
        file_path: validation.data.filePath,
        file_hash: validation.data.fileHash,
        file_size: validation.data.fileSize,
        mime_type: validation.data.mimeType,
        status: 'pending',
        correlation_id: validation.data.correlationId || correlationId || null, // Use provided correlationId or fallback to current
      };

      const { data, error } = await supabase
        .from('statement_imports')
        .insert([dbInput])
        .select(this.selectColumns)
        .single();

      if (error) {
        console.error('Supabase statement import create error:', error);
        logger.error(
          'DB:STATEMENT_IMPORT_INSERT',
          'Failed to create statement import in Supabase',
          { error: error.message, code: error.code, dbInput },
          correlationId || undefined
        );
        return { error: this.normalizeSupabaseError(error) };
      }

      if (!data) {
        logger.error('DB:STATEMENT_IMPORT_INSERT', 'Failed to create statement import - no data returned from Supabase', { dbInput }, correlationId || undefined);
        return {
          error: {
            error: 'Failed to create statement import - no data returned',
            code: STATEMENT_IMPORT_ERROR_CODES.UNKNOWN_ERROR,
          },
        };
      }

      // Validate response data
      const responseValidation = statementImportEntitySchema.safeParse(data);
      if (!responseValidation.success) {
        console.error('Statement import response validation error:', responseValidation.error);
        logger.error('DB:STATEMENT_IMPORT_INSERT', 'Invalid response data from Supabase', { errors: responseValidation.error.errors }, correlationId || undefined);
        return {
          error: {
            error: 'Invalid data received from server.',
            code: STATEMENT_IMPORT_ERROR_CODES.VALIDATION_ERROR,
          },
        };
      }

      logger.info('DB:STATEMENT_IMPORT_INSERT', 'Statement import created successfully in Supabase', { statementImportId: responseValidation.data.id }, correlationId || undefined);
      return { data: responseValidation.data };
    } catch (error) {
      console.error('Create statement import error:', error);
      return { error: this.normalizeSupabaseError(error) };
    }
  }

  async update(id: string, input: z.infer<typeof statementImportUpdateSchema>, getToken: () => Promise<string | null>) {
    try {
      const correlationId = getCorrelationId();
      
      const supabase = await createAuthenticatedSupabaseClient(getToken);

      // Validate input
      const validation = statementImportUpdateSchema.safeParse(input);
      if (!validation.success) {
        return {
          error: {
            error: `Invalid input: ${validation.error.errors.map(e => e.message).join(', ')}`,
            code: STATEMENT_IMPORT_ERROR_CODES.VALIDATION_ERROR,
          },
        };
      }

      // Map camelCase to snake_case for database
      const dbInput: Record<string, unknown> = {};
      if (validation.data.status !== undefined) dbInput.status = validation.data.status;
      if (validation.data.parsingMethod !== undefined) dbInput.parsing_method = validation.data.parsingMethod;
      if (validation.data.totalTransactions !== undefined) dbInput.total_transactions = validation.data.totalTransactions;
      if (validation.data.importedTransactions !== undefined) dbInput.imported_transactions = validation.data.importedTransactions;
      if (validation.data.failedTransactions !== undefined) dbInput.failed_transactions = validation.data.failedTransactions;
      if (validation.data.confidenceScore !== undefined) dbInput.confidence_score = validation.data.confidenceScore;
      if (validation.data.errorMessage !== undefined) dbInput.error_message = validation.data.errorMessage;
      if (validation.data.metadata !== undefined) dbInput.metadata = validation.data.metadata;
      if (validation.data.completedAt !== undefined) dbInput.completed_at = validation.data.completedAt;

      const { data, error } = await supabase
        .from('statement_imports')
        .update(dbInput)
        .eq('id', id)
        .select(this.selectColumns)
        .single();

      if (error) {
        console.error('Supabase statement import update error:', error);
        logger.error(
          'DB:STATEMENT_IMPORT_UPDATE',
          'Failed to update statement import in Supabase',
          { error: error.message, code: error.code, statementImportId: id },
          correlationId || undefined
        );
        return { error: this.normalizeSupabaseError(error) };
      }

      if (!data) {
        return {
          error: {
            error: 'Statement import not found.',
            code: STATEMENT_IMPORT_ERROR_CODES.NOT_FOUND,
          },
        };
      }

      // Validate response data
      const responseValidation = statementImportEntitySchema.safeParse(data);
      if (!responseValidation.success) {
        console.error('Statement import response validation error:', responseValidation.error);
        return {
          error: {
            error: 'Invalid data received from server.',
            code: STATEMENT_IMPORT_ERROR_CODES.VALIDATION_ERROR,
          },
        };
      }

      logger.info('DB:STATEMENT_IMPORT_UPDATE', 'Statement import updated successfully in Supabase', { statementImportId: responseValidation.data.id }, correlationId || undefined);
      return { data: responseValidation.data };
    } catch (error) {
      console.error('Update statement import error:', error);
      return { error: this.normalizeSupabaseError(error) };
    }
  }

  async remove(id: string, getToken: () => Promise<string | null>) {
    try {
      const correlationId = getCorrelationId();
      
      const supabase = await createAuthenticatedSupabaseClient(getToken);

      const { error } = await supabase
        .from('statement_imports')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Supabase statement import delete error:', error);
        logger.error(
          'DB:STATEMENT_IMPORT_DELETE',
          'Failed to delete statement import from Supabase',
          { error: error.message, code: error.code, statementImportId: id },
          correlationId || undefined
        );
        return { error: this.normalizeSupabaseError(error) };
      }

      logger.info('DB:STATEMENT_IMPORT_DELETE', 'Statement import deleted successfully from Supabase', { statementImportId: id }, correlationId || undefined);
      return {};
    } catch (error) {
      console.error('Delete statement import error:', error);
      return { error: this.normalizeSupabaseError(error) };
    }
  }
}

