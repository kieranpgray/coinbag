/**
 * JWT Diagnostic Utilities
 * 
 * Helper functions to diagnose JWT token issues with Clerk and Supabase integration.
 */

import { logger, getCorrelationId } from './logger';

/**
 * Decode JWT payload without verification (for diagnostics only)
 * This is safe because we're only reading the payload, not verifying the signature
 */
export function decodeJwtPayload(token: string): { sub?: string; exp?: number; iat?: number; [key: string]: unknown } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }
    const payload = parts[1];
    if (!payload) {
      return null;
    }
    try {
      const decodedPayload = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
      if (!decodedPayload || typeof decodedPayload !== 'object') {
        return null;
      }
      const decoded = decodedPayload as Record<string, unknown>;
      return decoded as { sub?: string; exp?: number; iat?: number; [key: string]: unknown };
    } catch {
      return null;
    }
  } catch (error) {
    logger.warn('JWT:DIAGNOSTICS', 'Failed to decode JWT payload', { error: error instanceof Error ? error.message : String(error) }, getCorrelationId() || undefined);
    return null;
  }
}

/**
 * Log JWT token information for diagnostics
 * Only logs non-sensitive information (sub claim, expiration, etc.)
 */
export function logJwtDiagnostics(token: string | null, context: string): void {
  const correlationId = getCorrelationId();
  
  if (!token) {
    logger.warn(
      'JWT:DIAGNOSTICS',
      `No JWT token available in ${context}`,
      { context },
      correlationId || undefined
    );
    return;
  }

  const payload = decodeJwtPayload(token);
  
  if (!payload) {
    logger.warn(
      'JWT:DIAGNOSTICS',
      `Failed to decode JWT token in ${context}`,
      { context, tokenLength: token.length },
      correlationId || undefined
    );
    return;
  }

  const sub = payload.sub;
  const exp = payload.exp;
  const iat = payload.iat;
  const now = Math.floor(Date.now() / 1000);
  const isExpired = exp ? exp < now : false;
  const expiresIn = exp ? exp - now : null;

  logger.info(
    'JWT:DIAGNOSTICS',
    `JWT token retrieved in ${context}`,
    {
      context,
      hasSub: !!sub,
      sub: sub || 'MISSING',
      isExpired,
      expiresIn: expiresIn !== null ? `${expiresIn}s` : 'unknown',
      issuedAt: iat ? new Date(iat * 1000).toISOString() : 'unknown',
      expiresAt: exp ? new Date(exp * 1000).toISOString() : 'unknown',
    },
    correlationId || undefined
  );

  if (!sub) {
    logger.error(
      'JWT:DIAGNOSTICS',
      `JWT token missing 'sub' claim in ${context}`,
      {
        context,
        payloadKeys: Object.keys(payload),
      },
      correlationId || undefined
    );
  }

  if (isExpired) {
    logger.warn(
      'JWT:DIAGNOSTICS',
      `JWT token is expired in ${context}`,
      {
        context,
        expiredAt: exp ? new Date(exp * 1000).toISOString() : 'unknown',
      },
      correlationId || undefined
    );
  }
}

/**
 * Log when JWT is being sent to Supabase
 */
export function logJwtSentToSupabase(token: string | null, operation: string): void {
  const correlationId = getCorrelationId();
  
  if (!token) {
    logger.error(
      'JWT:DIAGNOSTICS',
      `Attempting to send request to Supabase without JWT token: ${operation}`,
      { operation },
      correlationId || undefined
    );
    return;
  }

  const payload = decodeJwtPayload(token);
  const sub = payload?.sub;

  logger.debug(
    'JWT:DIAGNOSTICS',
    `Sending JWT to Supabase for ${operation}`,
    {
      operation,
      hasSub: !!sub,
      sub: sub || 'MISSING',
      tokenLength: token.length,
    },
    correlationId || undefined
  );
}

/**
 * Extract user ID from JWT token
 * This is the critical function that ensures we always have a user_id for inserts
 */
export function extractUserIdFromToken(token: string | null): string | null {
  if (!token) {
    return null;
  }

  const payload = decodeJwtPayload(token);
  if (!payload || !payload.sub) {
    const correlationId = getCorrelationId();
    logger.error(
      'JWT:ERROR',
      'Failed to extract user_id from JWT token',
      {
        hasPayload: !!payload,
        payloadKeys: payload ? Object.keys(payload) : [],
      },
      correlationId || undefined
    );
    return null;
  }

  return payload.sub as string;
}

/**
 * Check if JWT token is expired or will expire soon
 */
export function isTokenExpiredOrExpiringSoon(token: string | null, bufferSeconds: number = 60): boolean {
  if (!token) {
    return true;
  }

  const payload = decodeJwtPayload(token);
  if (!payload || !payload.exp) {
    return true; // If we can't determine expiration, assume expired
  }

  const exp = payload.exp as number;
  const now = Math.floor(Date.now() / 1000);
  const expiresIn = exp - now;

  // Consider expired if already expired or expiring within bufferSeconds
  return expiresIn <= bufferSeconds;
}

