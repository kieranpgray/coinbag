/**
 * Error Type Definitions
 * 
 * Provides type-safe error handling for Supabase and API operations.
 * Replaces `as any` assertions with proper type guards.
 */

/**
 * Standard error response structure used throughout the application
 */
export interface AppError {
  error: string;
  code: string;
}

/**
 * Supabase error structure
 */
export interface SupabaseError {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
  status?: number;
  statusCode?: number;
}

/**
 * Statement Import Error Codes
 */
export const STATEMENT_IMPORT_ERROR_CODES = {
  UPLOAD_FAILED: 'UPLOAD_FAILED',
  PROCESSING_FAILED: 'PROCESSING_FAILED',
  OCR_FAILED: 'OCR_FAILED',
  PARSING_FAILED: 'PARSING_FAILED',
  TIMEOUT: 'TIMEOUT',
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  INVALID_FORMAT: 'INVALID_FORMAT',
  RATE_LIMITED: 'RATE_LIMITED',
} as const;

/**
 * Statement Import Error Messages
 */
export const STATEMENT_IMPORT_ERROR_MESSAGES = {
  UPLOAD_FAILED: 'Failed to upload file. Please check your internet connection and try again.',
  PROCESSING_FAILED: 'Failed to process statement. Please try again or contact support.',
  OCR_FAILED: 'Could not read statement text. The file may be corrupted or password-protected.',
  PARSING_FAILED: 'Could not extract transactions. The statement format may not be supported.',
  TIMEOUT: 'Processing timed out. Please try again with a smaller file.',
  FILE_TOO_LARGE: 'File is too large. Please use a file smaller than 10MB.',
  INVALID_FORMAT: 'Invalid file format. Please upload a PDF or image file.',
  RATE_LIMITED: 'Too many requests. Please wait a few minutes and try again.',
} as const;

/**
 * Type guard to check if an error is a Supabase error
 */
export function isSupabaseError(error: unknown): error is SupabaseError {
  if (!error || typeof error !== 'object') {
    return false;
  }
  
  const err = error as Record<string, unknown>;
  return (
    typeof err.code === 'string' ||
    typeof err.message === 'string' ||
    typeof err.details === 'string' ||
    typeof err.hint === 'string' ||
    typeof err.status === 'number' ||
    typeof err.statusCode === 'number'
  );
}

/**
 * Extract error code from various error types
 */
export function getErrorCode(error: unknown): string | undefined {
  if (isSupabaseError(error)) {
    return error.code || error.statusCode?.toString();
  }
  
  if (error instanceof Error) {
    // Check for common error patterns
    const message = error.message.toLowerCase();
    if (message.includes('jwt') || message.includes('token') || message.includes('authentication')) {
      return 'AUTH_EXPIRED';
    }
    if (message.includes('permission') || message.includes('policy') || message.includes('rls')) {
      return 'PERMISSION_DENIED';
    }
    if (message.includes('connection') || message.includes('timeout')) {
      return 'CONNECTION_ERROR';
    }
  }
  
  return undefined;
}

/**
 * Extract error message from various error types
 */
export function getErrorMessage(error: unknown): string {
  if (isSupabaseError(error)) {
    return error.message || error.details || error.hint || 'An unexpected error occurred.';
  }
  
  if (error instanceof Error) {
    return error.message;
  }
  
  if (typeof error === 'string') {
    return error;
  }
  
  return 'An unexpected error occurred.';
}

/**
 * Normalize any error to AppError format
 */
export function normalizeError(error: unknown): AppError {
  const code = getErrorCode(error) || 'UNKNOWN_ERROR';
  let message = getErrorMessage(error);
  
  // Sanitize error messages for production
  const isProduction = import.meta.env.MODE === 'production' || import.meta.env.PROD === true;
  
  if (isProduction) {
    // Remove any potential sensitive information from error messages
    // Replace detailed error messages with generic ones
    if (code === 'AUTH_EXPIRED') {
      message = 'Authentication token expired or invalid. Please sign in again.';
    } else if (code === 'PERMISSION_DENIED') {
      message = 'You do not have permission to perform this action.';
    } else if (code === 'CONNECTION_ERROR') {
      message = 'Database connection error. Please try again.';
    } else if (code === 'UNKNOWN_ERROR') {
      message = 'An unexpected error occurred. Please try again.';
    }
  }
  
  return {
    error: message,
    code,
  };
}

