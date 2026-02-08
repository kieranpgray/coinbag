/**
 * Statement Upload Service
 * 
 * Handles uploading statement files to Supabase Storage and creating statement import records.
 */

import { createAuthenticatedSupabaseClient, getUserIdFromToken } from './supabaseClient';
import { computeFileHash } from './fileHash';
import { createStatementImportsRepository } from '@/data/statementImports/repo';
import type { StatementImportCreate } from '@/contracts/statementImports';
import { logger, getCorrelationId, setCorrelationId } from './logger';
import { makeCorrelationId } from './telemetry/correlation';

// Get Supabase URL for error logging
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';

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
  // Generate correlation ID at the start of upload flow
  const correlationId = getCorrelationId() || makeCorrelationId("ui");
  setCorrelationId(correlationId);
  
  try {
    logger.info(
      'UploadFlow:start',
      'Starting statement file upload',
      {
        correlationId,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        accountId,
      },
      correlationId
    );

    // Compute file hash for deduplication
    const fileHash = await computeFileHash(file);
    
    // Get user ID for folder structure (extract from JWT token directly)
    const userId = await getUserIdFromToken(getToken);

    if (!userId) {
      return {
        error: {
          error: 'User not authenticated.',
          code: 'AUTH_REQUIRED',
        },
      };
    }

    const supabase = await createAuthenticatedSupabaseClient(getToken);
    
    // Try to check if the statements bucket exists (non-blocking)
    // Note: listBuckets() may fail for authenticated users due to permissions
    // We'll attempt the upload anyway and let the upload error tell us if bucket is missing
    logger.info(
      'UPLOAD:STATEMENT',
      'Checking if statements bucket exists (non-blocking)',
      {},
      correlationId || undefined
    );
    
    const bucketCheckResult: { exists?: boolean; error?: string } = {};
    
    try {
      const { data: buckets, error: listBucketsError } = await supabase.storage.listBuckets();
      
      if (listBucketsError) {
        // This is expected - authenticated users may not have permission to list buckets
        logger.info(
          'UPLOAD:STATEMENT',
          'Cannot list buckets (may require admin permissions) - proceeding with upload attempt',
          { 
            error: listBucketsError.message,
            note: 'This is normal for authenticated users. Upload will proceed.',
          },
          correlationId || undefined
        );
        bucketCheckResult.error = listBucketsError.message;
      } else {
        const bucketExists = buckets?.some(bucket => bucket.id === 'statements' || bucket.name === 'statements');
        bucketCheckResult.exists = bucketExists;
        
        logger.info(
          'UPLOAD:STATEMENT',
          'Bucket existence check complete',
          { 
            bucketExists,
            availableBuckets: buckets?.map(b => ({ id: b.id, name: b.name })) || [],
          },
          correlationId || undefined
        );
        
        if (!bucketExists) {
          logger.warn(
            'UPLOAD:STATEMENT',
            'Bucket not found in list - will attempt upload anyway',
            { 
              availableBuckets: buckets?.map(b => ({ id: b.id, name: b.name })) || [],
            },
            correlationId || undefined
          );
        }
      }
    } catch (error) {
      // Non-fatal - we'll try the upload anyway
      logger.info(
        'UPLOAD:STATEMENT',
        'Bucket check failed (non-fatal) - proceeding with upload',
        { error: error instanceof Error ? error.message : String(error) },
        correlationId || undefined
      );
    }
    
    // Don't block on bucket check - proceed with upload attempt
    // The upload itself will fail with a clear error if bucket doesn't exist
    
    // Create file path: {userId}/{accountId}/{timestamp}-{filename}
    const timestamp = Date.now();
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filePath = `${userId}/${accountId}/${timestamp}-${sanitizedFileName}`;

    logger.info(
      'UPLOAD:STATEMENT',
      'Attempting file upload to storage',
      { 
        filePath,
        bucketId: 'statements',
        contentType: file.type,
      },
      correlationId || undefined
    );

    // Upload file to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('statements')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false, // Don't overwrite existing files
        contentType: file.type, // Explicitly set content type
      });

    if (uploadError) {
      // Extract all possible error details for comprehensive debugging
      const errorObj = uploadError as any;

      // Try multiple ways to get response body
      let responseBody: any = null;
      try {
        responseBody = 
          errorObj.response?.data || 
          errorObj.response?.body || 
          errorObj.data || 
          errorObj.body ||
          (errorObj.response && await errorObj.response.clone().json().catch(() => null)) ||
          null;
      } catch {
        // Ignore errors extracting response body
      }

      const errorDetails = {
        message: uploadError.message,
        statusCode: errorObj.statusCode || errorObj.status,
        statusText: errorObj.statusText,
        error: errorObj.error,
        name: errorObj.name,
        code: errorObj.code,
        hint: errorObj.hint,
        details: errorObj.details,
        responseBody: responseBody,
        context: errorObj.context,
        // Full error serialization for deep debugging
        fullError: JSON.stringify(uploadError, Object.getOwnPropertyNames(uploadError)),
      };
      
      logger.error(
        'UPLOAD:STATEMENT',
        'Failed to upload file to Supabase Storage',
        { 
          ...errorDetails,
          filePath,
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type,
          userId,
          accountId,
          requestUrl: `${supabaseUrl}/storage/v1/object/${filePath}`,
          requestMethod: 'POST',
        },
        correlationId || undefined
      );
      
      // Always log to console for visibility, even if debug logging is disabled
      console.error('[UPLOAD:STATEMENT] Upload error details:', {
        message: uploadError.message,
        statusCode: errorDetails.statusCode,
        statusText: errorDetails.statusText,
        error: errorDetails.error,
        code: errorDetails.code,
        hint: errorDetails.hint,
        details: errorDetails.details,
        responseBody: errorDetails.responseBody,
        filePath,
        bucketId: 'statements',
        userId,
        accountId,
        correlationId,
        requestUrl: `${supabaseUrl}/storage/v1/object/${filePath}`,
      });
      
      // Handle specific storage errors
      if (uploadError.message.includes('already exists') || uploadError.message.includes('duplicate')) {
        return {
          error: {
            error: 'A file with this name already exists. Please rename the file and try again.',
            code: 'DUPLICATE_FILE',
          },
        };
      }
      
      // Check for bucket not found errors (in case bucket was deleted after check)
      if (
        uploadError.message.includes('bucket') && 
        (uploadError.message.includes('not found') || uploadError.message.includes('does not exist'))
      ) {
        return {
          error: {
            error: 'Storage bucket "statements" not found. Please contact support.',
            code: 'BUCKET_NOT_FOUND',
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

    // Create statement import record with correlation ID
    const repository = await createStatementImportsRepository();
    const createInput: StatementImportCreate = {
      accountId,
      fileName: file.name,
      filePath: uploadData.path,
      fileHash,
      fileSize: file.size,
      mimeType: file.type,
      correlationId,
    };

    logger.info(
      'UploadFlow:creating_record',
      'Creating statement import record',
      {
        correlationId,
        accountId,
        fileName: file.name,
      },
      correlationId
    );

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
      'UploadFlow:got_statementImportId',
      'Statement file uploaded successfully',
      {
        correlationId,
        statementImportId: createResult.data.id,
        filePath: uploadData.path,
        fileHash,
      },
      correlationId
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

