/**
 * Correlation ID utilities for end-to-end tracing
 * 
 * Provides standardized correlation ID generation and management
 * for tracing user actions across frontend, edge functions, and database.
 */

/**
 * Generate a correlation ID with optional prefix
 * Format: {prefix}-{timestamp}-{random}
 * 
 * @param prefix - Optional prefix (default: "ui")
 * @returns Correlation ID string
 */
export function makeCorrelationId(prefix = "ui"): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
}

/**
 * Extract prefix from a correlation ID
 * Useful for identifying the source of a correlation ID
 */
export function getCorrelationPrefix(correlationId: string): string {
  const parts = correlationId.split("-");
  return parts[0] || "unknown";
}

/**
 * Check if a correlation ID is valid format
 */
export function isValidCorrelationId(correlationId: string): boolean {
  return /^[a-z]+-\d+-[a-f0-9]+$/i.test(correlationId);
}

