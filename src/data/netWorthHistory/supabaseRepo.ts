import type { NetWorthHistoryRepository } from './repo';
import { createAuthenticatedSupabaseClient, getUserIdFromToken } from '@/lib/supabaseClient';
import {
  netWorthHistoryListSchema,
  netWorthHistoryEntitySchema,
  netWorthHistoryCreateSchema,
  NET_WORTH_HISTORY_ERROR_CODES,
} from '@/contracts/netWorthHistory';
import type { NetWorthPoint } from '@/features/dashboard/hooks/useNetWorthHistory';
import { logger, getCorrelationId } from '@/lib/logger';
import { z } from 'zod';

/**
 * Supabase implementation of NetWorthHistoryRepository
 * 
 * Handles all operations for net worth history stored in Supabase PostgreSQL database.
 * Uses Clerk JWT authentication and Row Level Security (RLS) for data isolation.
 */
export class SupabaseNetWorthHistoryRepository implements NetWorthHistoryRepository {
  // Select actual database column names (snake_case)
  private readonly selectColumns =
    'id, user_id, date, net_worth, total_assets, total_liabilities, created_at, updated_at';

  /**
   * Maps database row (snake_case) to entity schema (camelCase)
   * Converts snake_case database columns to camelCase for entity schema validation
   */
  private mapDbRowToEntity(row: Record<string, unknown>): z.infer<typeof netWorthHistoryEntitySchema> {
    const id = row.id;
    const userId = row.user_id;
    if (typeof id !== 'string' || typeof userId !== 'string') {
      throw new Error('Missing required fields: id or user_id must be strings');
    }
    const dateStr = String(row.date).split('T')[0];
    if (!dateStr) {
      throw new Error('Invalid date field in database row');
    }
    return {
      id,
      user_id: userId,
      date: dateStr, // Extract YYYY-MM-DD from date or datetime
      net_worth: Number(row.net_worth),
      total_assets: Number(row.total_assets),
      total_liabilities: Number(row.total_liabilities),
      created_at: row.created_at as string,
      updated_at: row.updated_at as string,
    };
  }

  /**
   * Maps entity schema to NetWorthPoint domain type
   */
  private mapEntityToNetWorthPoint(entity: z.infer<typeof netWorthHistoryEntitySchema>): NetWorthPoint {
    return {
      date: entity.date,
      value: entity.net_worth,
    };
  }

  /**
   * Normalizes Supabase errors to consistent error format
   */
  private normalizeSupabaseError(error: any): { error: string; code: string } {
    if (error?.code === 'PGRST116') {
      return {
        error: 'Net worth history not found.',
        code: NET_WORTH_HISTORY_ERROR_CODES.NOT_FOUND,
      };
    }
    
    if (error?.code === '23505') {
      // Unique constraint violation
      return {
        error: 'A snapshot already exists for this date.',
        code: NET_WORTH_HISTORY_ERROR_CODES.DUPLICATE_DATE,
      };
    }

    if (error?.code === '23502') {
      // Not null constraint violation
      return {
        error: 'Required field is missing.',
        code: 'VALIDATION_ERROR',
      };
    }

    return {
      error: error?.message || 'An unexpected error occurred.',
      code: error?.code || 'UNKNOWN_ERROR',
    };
  }

  async list(
    getToken: () => Promise<string | null>,
    startDate?: string,
    endDate?: string
  ) {
    try {
      const correlationId = getCorrelationId();
      
      const supabase = await createAuthenticatedSupabaseClient(getToken);

      let query = supabase
        .from('net_worth_history')
        .select(this.selectColumns)
        .order('date', { ascending: true });

      // Add date range filters if provided
      if (startDate) {
        query = query.gte('date', startDate);
      }
      if (endDate) {
        query = query.lte('date', endDate);
      }

      const { data, error } = await query;

      if (error) {
        logger.error(
          'DB:NET_WORTH_HISTORY_LIST',
          'Supabase net worth history list error',
          {
            error: error.message,
            code: error.code,
            details: error.details,
            hint: error.hint,
            startDate,
            endDate,
          },
          correlationId || undefined
        );
        
        return {
          data: null,
          error: this.normalizeSupabaseError(error),
        };
      }

      // Map database rows (snake_case) to entity schema (camelCase)
      const mappedData = (data || []).map((row) => this.mapDbRowToEntity(row));

      // Validate response data
      const validation = netWorthHistoryListSchema.safeParse(mappedData);
      if (!validation.success) {
        logger.error(
          'DB:NET_WORTH_HISTORY_LIST',
          'Net worth history list validation error',
          { error: validation.error },
          correlationId || undefined
        );
        return {
          data: null,
          error: {
            error: 'Invalid data received from server.',
            code: 'VALIDATION_ERROR',
          },
        };
      }

      // Map entity schema to domain NetWorthPoint type
      const points: NetWorthPoint[] = validation.data.map((entity) =>
        this.mapEntityToNetWorthPoint(entity)
      );

      logger.info(
        'DB:NET_WORTH_HISTORY_LIST',
        'Net worth history listed successfully',
        {
          count: points.length,
          startDate,
          endDate,
        },
        correlationId || undefined
      );

      return { data: points };
    } catch (error) {
      logger.error(
        'DB:NET_WORTH_HISTORY_LIST',
        'List net worth history error',
        { error },
        getCorrelationId() || undefined
      );
      return {
        data: null,
        error: this.normalizeSupabaseError(error),
      };
    }
  }

  async createSnapshot(
    getToken: () => Promise<string | null>,
    date: string,
    netWorth: number,
    totalAssets: number,
    totalLiabilities: number
  ) {
    try {
      const correlationId = getCorrelationId();
      
      // Validate input
      const validation = netWorthHistoryCreateSchema.safeParse({
        date,
        net_worth: netWorth,
        total_assets: totalAssets,
        total_liabilities: totalLiabilities,
      });

      if (!validation.success) {
        return {
          error: {
            error: `Invalid input: ${validation.error.errors.map(e => e.message).join(', ')}`,
            code: 'VALIDATION_ERROR',
          },
        };
      }

      const supabase = await createAuthenticatedSupabaseClient(getToken);

      // CRITICAL: Explicitly extract and set user_id from JWT
      const userId = await getUserIdFromToken(getToken);
      if (!userId) {
        logger.error(
          'DB:NET_WORTH_HISTORY_CREATE',
          'Cannot create snapshot: Failed to extract user_id from JWT token',
          {},
          correlationId || undefined
        );
        return {
          error: {
            error: 'Authentication failed. Please sign in again.',
            code: 'AUTH_EXPIRED',
          },
        };
      }

      // Use the database function to create/update snapshot
      // This ensures idempotent operations via ON CONFLICT
      const { error } = await supabase.rpc('create_net_worth_snapshot', {
        p_user_id: userId,
        p_date: validation.data.date,
        p_net_worth: validation.data.net_worth,
        p_total_assets: validation.data.total_assets,
        p_total_liabilities: validation.data.total_liabilities,
      });

      if (error) {
        logger.error(
          'DB:NET_WORTH_HISTORY_CREATE',
          'Supabase net worth history create error',
          {
            error: error.message,
            code: error.code,
            date: validation.data.date,
          },
          correlationId || undefined
        );
        return {
          error: this.normalizeSupabaseError(error),
        };
      }

      // Fetch the created/updated record to return it
      const { data: record, error: fetchError } = await supabase
        .from('net_worth_history')
        .select(this.selectColumns)
        .eq('user_id', userId)
        .eq('date', validation.data.date)
        .single();

      if (fetchError || !record) {
        logger.warn(
          'DB:NET_WORTH_HISTORY_CREATE',
          'Snapshot created but failed to fetch record',
          {
            error: fetchError?.message,
            date: validation.data.date,
          },
          correlationId || undefined
        );
        // Still return success since the snapshot was created
        return {
          data: {
            id: '', // Unknown ID
            date: validation.data.date,
            net_worth: validation.data.net_worth,
            total_assets: validation.data.total_assets,
            total_liabilities: validation.data.total_liabilities,
          },
        };
      }

      // Map and validate the fetched record
      const mappedData = this.mapDbRowToEntity(record);
      const entityValidation = netWorthHistoryEntitySchema.safeParse(mappedData);

      if (!entityValidation.success) {
        logger.error(
          'DB:NET_WORTH_HISTORY_CREATE',
          'Created snapshot validation error',
          { error: entityValidation.error },
          correlationId || undefined
        );
        return {
          data: {
            id: mappedData.id,
            date: mappedData.date,
            net_worth: mappedData.net_worth,
            total_assets: mappedData.total_assets,
            total_liabilities: mappedData.total_liabilities,
          },
        };
      }

      logger.info(
        'DB:NET_WORTH_HISTORY_CREATE',
        'Net worth history snapshot created successfully',
        {
          date: validation.data.date,
          net_worth: validation.data.net_worth,
        },
        correlationId || undefined
      );

      return {
        data: {
          id: entityValidation.data.id,
          date: entityValidation.data.date,
          net_worth: entityValidation.data.net_worth,
          total_assets: entityValidation.data.total_assets,
          total_liabilities: entityValidation.data.total_liabilities,
        },
      };
    } catch (error) {
      logger.error(
        'DB:NET_WORTH_HISTORY_CREATE',
        'Create net worth history snapshot error',
        { error },
        getCorrelationId() || undefined
      );
      return {
        error: this.normalizeSupabaseError(error),
      };
    }
  }
}
