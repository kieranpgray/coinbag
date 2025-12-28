/**
 * Repository Helper Functions
 * 
 * Common utilities for Supabase repositories to ensure data integrity
 */

import { getUserIdFromToken } from './supabaseClient';
import { logger, getCorrelationId } from './logger';

/**
 * Extract and validate user_id from JWT token
 * This is CRITICAL for data integrity - ensures user_id is always set correctly
 */
export async function ensureUserIdForInsert(
  getToken: () => Promise<string | null>,
  operation: string
): Promise<{ userId: string } | { error: { error: string; code: string } }> {
  const userId = await getUserIdFromToken(getToken);
  
  if (!userId) {
    const correlationId = getCorrelationId();
    logger.error(
      'DB:USER_ID_VALIDATION',
      `Cannot perform ${operation}: Failed to extract user_id from JWT token`,
      {
        operation,
        suggestion: 'Check if JWT validation is configured in Supabase (see docs/CLERK_SUPABASE_JWT_SETUP.md)',
      },
      correlationId || undefined
    );
    return {
      error: {
        error: 'Authentication failed. Please sign in again.',
        code: 'AUTH_EXPIRED',
      },
    };
  }

  return { userId };
}

/**
 * Verify that inserted record has correct user_id
 * This catches cases where DB defaults fail silently
 */
export function verifyInsertedUserId<T extends { userId?: string }>(
  insertedRecord: T,
  expectedUserId: string,
  operation: string,
  recordId: string
): void {
  const insertedUserId = insertedRecord.userId;
  
  if (!insertedUserId) {
    const correlationId = getCorrelationId();
    logger.error(
      'DB:USER_ID_VERIFICATION',
      `CRITICAL: Inserted record has NULL user_id`,
      {
        operation,
        recordId,
        expectedUserId,
        suggestion: 'This indicates a serious data integrity issue. Check Supabase JWT configuration.',
      },
      correlationId || undefined
    );
    return;
  }

  if (insertedUserId !== expectedUserId) {
    const correlationId = getCorrelationId();
    logger.error(
      'DB:USER_ID_VERIFICATION',
      `CRITICAL: Inserted record has incorrect user_id`,
      {
        operation,
        recordId,
        expectedUserId,
        actualUserId: insertedUserId,
        suggestion: 'This indicates a serious data integrity issue. Check Supabase JWT configuration.',
      },
      correlationId || undefined
    );
  } else {
    const correlationId = getCorrelationId();
    logger.debug(
      'DB:USER_ID_VERIFICATION',
      `Inserted record has correct user_id`,
      {
        operation,
        recordId,
        userId: insertedUserId,
      },
      correlationId || undefined
    );
  }
}

