/**
 * Supabase Logger Wrapper
 * 
 * Wraps Supabase client operations to log all DB writes.
 * Only active when VITE_DEBUG_LOGGING=true
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { logger, getCorrelationId } from './logger';

/**
 * Wrap Supabase table operations to add logging
 */
export function wrapSupabaseTableForLogging(
  supabase: SupabaseClient
): SupabaseClient['from'] {
  if (import.meta.env.VITE_DEBUG_LOGGING !== 'true') {
    return supabase.from.bind(supabase);
  }

  const originalFrom = supabase.from.bind(supabase);
  
  return function(table: string) {
    const queryBuilder = originalFrom(table);
    const correlationId = getCorrelationId();

    // Wrap insert
    const originalInsert = queryBuilder.insert.bind(queryBuilder);
    queryBuilder.insert = function(values: unknown) {
      logger.info(
        'DB:INSERT',
        `Inserting into ${table}`,
        {
          table,
          valuesCount: Array.isArray(values) ? values.length : 1,
          operation: 'insert',
        },
        correlationId || undefined
      );
      return originalInsert(values);
    };

    // Wrap update
    const originalUpdate = queryBuilder.update.bind(queryBuilder);
    queryBuilder.update = function(values: unknown) {
      logger.info(
        'DB:UPDATE',
        `Updating ${table}`,
        {
          table,
          values,
          operation: 'update',
        },
        correlationId || undefined
      );
      return originalUpdate(values);
    };

    // Wrap delete
    const originalDelete = queryBuilder.delete.bind(queryBuilder);
    queryBuilder.delete = function() {
      logger.warn(
        'DB:DELETE',
        `Deleting from ${table}`,
        {
          table,
          operation: 'delete',
          warning: 'This is a DELETE operation',
        },
        correlationId || undefined
      );
      return originalDelete();
    };

    // Wrap upsert
    const originalUpsert = queryBuilder.upsert.bind(queryBuilder);
    queryBuilder.upsert = function(values: unknown) {
      logger.info(
        'DB:UPSERT',
        `Upserting into ${table}`,
        {
          table,
          valuesCount: Array.isArray(values) ? values.length : 1,
          operation: 'upsert',
        },
        correlationId || undefined
      );
      return originalUpsert(values);
    };

    return queryBuilder;
  } as typeof supabase.from;
}

