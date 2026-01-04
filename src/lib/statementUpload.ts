/**
 * Statement Upload Service
 * 
 * Handles uploading statement files to Supabase Storage and creating statement import records.
 */

import { createAuthenticatedSupabaseClient } from './supabaseClient';
import { computeFileHash } from './fileHash';
import { createStatementImportsRepository } from '@/data/statementImports/repo';
import type { StatementImportCreate } from '@/contracts/statementImports';
import { logger, getCorrelationId } from './logger';

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export interface UploadResult {
  statementImportId: string;
  filePath: string;
  fileHash: string;
}

export interface UploadError {
  error: string;
  code: string;
}

/**
 * Upload a statement file to Supabase Storage and create a statement import record
 */
export async function uploadStatementFile(
  file: File,
  accountId: string,
  getToken: () => Promise<string | null>
): Promise<{ data?: UploadResult; error?: UploadError }> {
  try {
    const correlationId = getCorrelationId();
    
    logger.info(
      'UPLOAD:STATEMENT',
      'Starting statement file upload',
      {
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        accountId,
      },
      correlationId || undefined
    );

    // Compute file hash for deduplication
    const fileHash = await computeFileHash(file);
    
    // Get user ID for folder structure
    const supabase = await createAuthenticatedSupabaseClient(getToken);
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return {
        error: {
          error: 'User not authenticated.',
          code: 'AUTH_REQUIRED',
        },
      };
    }

    const userId = user.id;
    
    // Create file path: {userId}/{accountId}/{timestamp}-{filename}
    const timestamp = Date.now();
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filePath = `${userId}/${accountId}/${timestamp}-${sanitizedFileName}`;

    // Upload file to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('statements')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false, // Don't overwrite existing files
      });

    if (uploadError) {
      logger.error(
        'UPLOAD:STATEMENT',
        'Failed to upload file to Supabase Storage',
        { error: uploadError.message, filePath },
        correlationId || undefined
      );
      
      // Handle specific storage errors
      if (uploadError.message.includes('already exists')) {
        return {
          error: {
            error: 'A file with this name already exists. Please rename the file and try again.',
            code: 'DUPLICATE_FILE',
          },
        };
      }
      
      return {
        error: {
          error: `Upload failed: ${uploadError.message}`,
          code: 'UPLOAD_ERROR',
        },
      };
    }

    if (!uploadData) {
      return {
        error: {
          error: 'Upload failed - no data returned.',
          code: 'UPLOAD_ERROR',
        },
      };
    }

    // Create statement import record
    const repository = await createStatementImportsRepository();
    const createInput: StatementImportCreate = {
      accountId,
      fileName: file.name,
      filePath: uploadData.path,
      fileHash,
      fileSize: file.size,
      mimeType: file.type,
    };

    const createResult = await repository.create(createInput, getToken);

    if (createResult.error) {
      // If record creation fails, try to delete the uploaded file
      await supabase.storage.from('statements').remove([filePath]);
      
      logger.error(
        'UPLOAD:STATEMENT',
        'Failed to create statement import record',
        { error: createResult.error.error, filePath },
        correlationId || undefined
      );
      
      return {
        error: {
          error: createResult.error.error,
          code: createResult.error.code,
        },
      };
    }

    if (!createResult.data) {
      return {
        error: {
          error: 'Failed to create statement import record.',
          code: 'CREATE_ERROR',
        },
      };
    }

    logger.info(
      'UPLOAD:STATEMENT',
      'Statement file uploaded successfully',
      {
        statementImportId: createResult.data.id,
        filePath: uploadData.path,
        fileHash,
      },
      correlationId || undefined
    );

    return {
      data: {
        statementImportId: createResult.data.id,
        filePath: uploadData.path,
        fileHash,
      },
    };
  } catch (error) {
    const correlationId = getCorrelationId();
    logger.error(
      'UPLOAD:STATEMENT',
      'Unexpected error during statement upload',
      { error: error instanceof Error ? error.message : String(error) },
      correlationId || undefined
    );
    
    return {
      error: {
        error: error instanceof Error ? error.message : 'An unexpected error occurred.',
        code: 'UNKNOWN_ERROR',
      },
    };
  }
}

