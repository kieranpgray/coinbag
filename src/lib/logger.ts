/**
 * Debug Logger Utility
 * 
 * Provides structured logging for debugging P0 issues.
 * Gated behind VITE_DEBUG_LOGGING environment variable.
 * 
 * Usage:
 *   import { logger, createCorrelationId } from '@/lib/logger';
 *   
 *   const correlationId = createCorrelationId();
 *   logger.debug('NAV:DASHBOARD_ADD_INVESTMENT', 'Button clicked', { route: '/dashboard' }, correlationId);
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  scope: string;
  message: string;
  correlationId?: string;
  route?: string;
  userId?: string;
  data?: unknown;
}

const DEBUG_ENABLED = import.meta.env.VITE_DEBUG_LOGGING === 'true';

// Store current correlation ID for the active flow
let currentCorrelationId: string | null = null;

/**
 * Generate a unique correlation ID for tracing a user action across client/server
 */
export function createCorrelationId(): string {
  return `corr-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Set the current correlation ID for the active flow
 */
export function setCorrelationId(id: string | null): void {
  currentCorrelationId = id;
}

/**
 * Get the current correlation ID
 */
export function getCorrelationId(): string | null {
  return currentCorrelationId;
}

/**
 * Sanitize data to remove sensitive information
 */
function sanitizeData(data: unknown): unknown {
  if (!data || typeof data !== 'object') {
    return data;
  }

  const sanitized = { ...data as Record<string, unknown> };
  const sensitiveKeys = ['password', 'token', 'secret', 'apiKey', 'authorization'];
  
  for (const key of sensitiveKeys) {
    if (key in sanitized) {
      sanitized[key] = '[REDACTED]';
    }
  }

  return sanitized;
}

/**
 * Get current route from window.location
 */
function getCurrentRoute(): string {
  if (typeof window === 'undefined') return 'unknown';
  return window.location.pathname + window.location.search;
}

/**
 * Get user ID from Clerk (if available)
 */
function getUserId(): string | undefined {
  // Try to get from window if Clerk is available
  // This is a best-effort approach
  try {
    if (typeof window !== 'undefined' && (window as any).__clerk_user_id) {
      return (window as any).__clerk_user_id;
    }
  } catch {
    // Ignore errors
  }
  return undefined;
}

/**
 * Format log entry as JSON string
 */
function formatLog(entry: LogEntry): string {
  return JSON.stringify(entry);
}

/**
 * Core logging function
 */
function log(
  level: LogLevel,
  scope: string,
  message: string,
  data?: unknown,
  correlationId?: string
): void {
  if (!DEBUG_ENABLED) return;

  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    scope,
    message,
    correlationId: correlationId || currentCorrelationId || undefined,
    route: getCurrentRoute(),
    userId: getUserId(),
    data: data ? sanitizeData(data) : undefined,
  };

  const formatted = formatLog(entry);

  // Use appropriate console method
  switch (level) {
    case 'debug':
      console.debug(`[DEBUG] ${formatted}`);
      break;
    case 'info':
      console.info(`[INFO] ${formatted}`);
      break;
    case 'warn':
      console.warn(`[WARN] ${formatted}`);
      break;
    case 'error':
      console.error(`[ERROR] ${formatted}`);
      break;
  }
}

/**
 * Logger API
 */
export const logger = {
  debug: (scope: string, message: string, data?: unknown, correlationId?: string) => {
    log('debug', scope, message, data, correlationId);
  },
  info: (scope: string, message: string, data?: unknown, correlationId?: string) => {
    log('info', scope, message, data, correlationId);
  },
  warn: (scope: string, message: string, data?: unknown, correlationId?: string) => {
    log('warn', scope, message, data, correlationId);
  },
  error: (scope: string, message: string, data?: unknown, correlationId?: string) => {
    log('error', scope, message, data, correlationId);
  },
};

/**
 * Check if debug logging is enabled
 */
export function isDebugLoggingEnabled(): boolean {
  return DEBUG_ENABLED;
}

