/**
 * Utility functions for account error handling
 */

export type AccountError = {
  error: string;
  code: string;
};

/**
 * Type guard to check if an error is an AccountError
 */
export function isAccountError(error: unknown): error is AccountError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'error' in error &&
    'code' in error &&
    typeof (error as Record<string, unknown>).error === 'string' &&
    typeof (error as Record<string, unknown>).code === 'string'
  );
}

