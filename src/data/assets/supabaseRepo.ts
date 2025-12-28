import type { AssetsRepository } from './repo';
import { createAuthenticatedSupabaseClient, getUserIdFromToken } from '@/lib/supabaseClient';
import {
  assetCreateSchema,
  assetUpdateSchema,
  assetListSchema,
  assetEntitySchema,
} from '@/contracts/assets';
import type { Asset } from '@/types/domain';
import { logger, getCorrelationId } from '@/lib/logger';
import { decodeJwtPayload } from '@/lib/jwtDiagnostics';
import { z } from 'zod';

/**
 * Supabase implementation of AssetsRepository
 * 
 * Handles all CRUD operations for assets stored in Supabase PostgreSQL database.
 * Uses Clerk JWT authentication and Row Level Security (RLS) for data isolation.
 */
export class SupabaseAssetsRepository implements AssetsRepository {
  private readonly selectColumns =
    'id, name, type, value, change1D:change_1d, change1W:change_1w, dateAdded:date_added, institution, notes, userId:user_id, createdAt:created_at, updatedAt:updated_at';

  /**
   * Maps asset entity (with userId and timestamps) to domain Asset type (without userId)
   * Converts dateAdded from database format (ISO string or YYYY-MM-DD) to YYYY-MM-DD format
   */
  private mapEntityToAsset(entity: z.infer<typeof assetEntitySchema>): Asset {
    // Convert dateAdded to YYYY-MM-DD format if it's in ISO format
    // Supabase may return dates as ISO strings (e.g., "2024-01-01T00:00:00.000Z")
    // but the contract expects YYYY-MM-DD format
    let dateAdded = entity.dateAdded;
    if (dateAdded.includes('T')) {
      // ISO format detected, extract YYYY-MM-DD part
      dateAdded = dateAdded.split('T')[0];
    }
    
    return {
      id: entity.id,
      name: entity.name,
      type: entity.type,
      value: entity.value,
      change1D: entity.change1D,
      change1W: entity.change1W,
      dateAdded,
      institution: entity.institution,
      notes: entity.notes,
    };
  }

  async list(getToken: () => Promise<string | null>) {
    try {
      const correlationId = getCorrelationId();
      
      // Log JWT diagnostics if debug logging is enabled
      if (import.meta.env.VITE_DEBUG_LOGGING === 'true') {
        const token = await getToken();
        if (token) {
          const payload = decodeJwtPayload(token);
          logger.debug(
            'DB:ASSETS_LIST',
            'Listing assets with JWT',
            {
              hasSub: !!payload?.sub,
              sub: payload?.sub || 'MISSING',
            },
            correlationId || undefined
          );
        }
      }

      const supabase = await createAuthenticatedSupabaseClient(getToken);

      const { data, error } = await supabase
        .from('assets')
        .select(this.selectColumns)
        .order('date_added', { ascending: false });

      if (error) {
        const correlationId = getCorrelationId();
        logger.error(
          'DB:ASSETS_LIST',
          'Supabase assets list error',
          {
            error: error.message,
            code: error.code,
            details: error.details,
            hint: error.hint,
            isRlsError: error.message.includes('permission') || error.message.includes('policy') || error.message.includes('RLS'),
          },
          correlationId || undefined
        );
        
        // Check if this is an RLS-related error
        if (error.message.includes('permission') || error.message.includes('policy') || error.message.includes('RLS')) {
          logger.warn(
            'DB:ASSETS_LIST',
            'RLS policy may be blocking query - JWT validation may not be configured',
            {
              error: error.message,
              suggestion: 'Check if Supabase JWT validation is configured (see docs/CLERK_SUPABASE_JWT_SETUP.md)',
            },
            correlationId || undefined
          );
        }
        
        console.error('Supabase assets list error:', error);
        return {
          data: [],
          error: this.normalizeSupabaseError(error),
        };
      }

      // Validate response data
      const validation = assetListSchema.safeParse(data || []);
      if (!validation.success) {
        console.error('Assets list validation error:', validation.error);
        return {
          data: [],
          error: {
            error: 'Invalid data received from server.',
            code: 'VALIDATION_ERROR',
          },
        };
      }

      // Map entity schema (with userId) to domain Asset type (without userId)
      const assets: Asset[] = validation.data.map((entity) => this.mapEntityToAsset(entity));

      logger.info(
        'DB:ASSETS_LIST',
        'Assets listed successfully',
        {
          count: assets.length,
          assetIds: assets.slice(0, 5).map(a => a.id),
        },
        correlationId || undefined
      );

      return { data: assets };
    } catch (error) {
      console.error('List assets error:', error);
      return {
        data: [],
        error: this.normalizeSupabaseError(error),
      };
    }
  }

  async get(id: string, getToken: () => Promise<string | null>) {
    try {
      // Validate input
      if (!id) {
        return {
          error: {
            error: 'Asset ID is required.',
            code: 'VALIDATION_ERROR',
          },
        };
      }

      const supabase = await createAuthenticatedSupabaseClient(getToken);

      const { data, error } = await supabase
        .from('assets')
        .select(this.selectColumns)
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return {
            error: {
              error: 'Asset not found.',
              code: 'NOT_FOUND',
            },
          };
        }
        console.error('Supabase assets get error:', error);
        return { error: this.normalizeSupabaseError(error) };
      }

      // Validate response data
      const validation = assetEntitySchema.safeParse(data);
      if (!validation.success) {
        console.error('Asset validation error:', validation.error);
        return {
          error: {
            error: 'Invalid data received from server.',
            code: 'VALIDATION_ERROR',
          },
        };
      }

      // Map entity schema to domain Asset type
      const asset = this.mapEntityToAsset(validation.data);

      return { data: asset };
    } catch (error) {
      console.error('Get asset error:', error);
      return { error: this.normalizeSupabaseError(error) };
    }
  }

  async create(input: Omit<Asset, 'id'>, getToken: () => Promise<string | null>) {
    try {
      const correlationId = getCorrelationId();
      
      logger.info(
        'DB:ASSET_INSERT',
        'SupabaseAssetsRepository.create called',
        {
          inputType: input.type,
          inputName: input.name,
          inputValue: input.value,
          repoType: 'SupabaseAssetsRepository',
        },
        correlationId || undefined
      );

      // Validate input
      const validation = assetCreateSchema.safeParse(input);
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
      // This ensures data is always associated with the correct user, even if DB defaults fail
      const userId = await getUserIdFromToken(getToken);
      if (!userId) {
        const correlationId = getCorrelationId();
        logger.error(
          'DB:ASSET_INSERT',
          'Cannot create asset: Failed to extract user_id from JWT token',
          {
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

      // Map camelCase to snake_case for database
      const dbInput: Record<string, unknown> = {
        user_id: userId, // EXPLICIT: Set user_id from JWT, don't rely on DB default
        name: validation.data.name,
        type: validation.data.type,
        value: validation.data.value,
        date_added: validation.data.dateAdded,
      };

      // Add optional fields only if they are defined and not empty strings
      if (validation.data.change1D !== undefined) {
        dbInput.change_1d = validation.data.change1D;
      }
      if (validation.data.change1W !== undefined) {
        dbInput.change_1w = validation.data.change1W;
      }
      // Normalize empty strings to null for optional text fields
      if (validation.data.institution !== undefined) {
        dbInput.institution = validation.data.institution === '' ? null : validation.data.institution;
      }
      if (validation.data.notes !== undefined) {
        dbInput.notes = validation.data.notes === '' ? null : validation.data.notes;
      }

      const { data, error } = await supabase
        .from('assets')
        .insert([dbInput])
        .select(this.selectColumns)
        .single();

      if (error) {
        const correlationId = getCorrelationId();
        const isRlsError = error.message.includes('permission') || error.message.includes('policy') || error.message.includes('RLS');
        
        logger.error(
          'DB:ASSET_INSERT',
          'Failed to create asset in Supabase',
          {
            error: error.message,
            code: error.code,
            details: error.details,
            hint: error.hint,
            isRlsError,
          },
          correlationId || undefined
        );
        
        if (isRlsError) {
          logger.warn(
            'DB:ASSET_INSERT',
            'RLS policy may be blocking insert - JWT validation may not be configured',
            {
              error: error.message,
              suggestion: 'Check if Supabase JWT validation is configured (see docs/CLERK_SUPABASE_JWT_SETUP.md)',
              dbInput,
            },
            correlationId || undefined
          );
        }
        
        console.error('Supabase assets create error:', error);
        return { error: this.normalizeSupabaseError(error) };
      }

      if (!data) {
        logger.error(
          'DB:ASSET_INSERT',
          'Failed to create asset - no data returned from Supabase',
          {},
          correlationId || undefined
        );
        return {
          error: {
            error: 'Failed to create asset - no data returned',
            code: 'UNKNOWN_ERROR',
          },
        };
      }

      // Validate response data
      const responseValidation = assetEntitySchema.safeParse(data);
      if (!responseValidation.success) {
        console.error('Asset create response validation error:', responseValidation.error);
        return {
          error: {
            error: 'Invalid data received from server.',
            code: 'VALIDATION_ERROR',
          },
        };
      }

      // Map entity schema to domain Asset type
      const asset = this.mapEntityToAsset(responseValidation.data);

      // CRITICAL: Verify the inserted record has the correct user_id
      // This catches cases where DB defaults fail silently
      const insertedUserId = responseValidation.data.userId;
      if (insertedUserId !== userId) {
        const correlationId = getCorrelationId();
        logger.error(
          'DB:ASSET_INSERT',
          'CRITICAL: Inserted asset has incorrect user_id',
          {
            expectedUserId: userId,
            actualUserId: insertedUserId,
            assetId: asset.id,
            suggestion: 'This indicates a serious data integrity issue. Check Supabase JWT configuration.',
          },
          correlationId || undefined
        );
        // Still return the asset, but log the error
        // In production, you might want to delete the incorrectly inserted record
      }

      logger.info(
        'DB:ASSET_INSERT',
        'Asset created successfully in Supabase',
        {
          newAssetId: asset.id,
          newAssetName: asset.name,
          newAssetType: asset.type,
          userId: insertedUserId,
          userIdMatches: insertedUserId === userId,
          operation: 'insert',
        },
        correlationId || undefined
      );

      return { data: asset };
    } catch (error) {
      console.error('Create asset error:', error);
      return { error: this.normalizeSupabaseError(error) };
    }
  }

  async update(
    id: string,
    input: Partial<Omit<Asset, 'id'>>,
    getToken: () => Promise<string | null>
  ) {
    try {
      // Validate input
      if (!id) {
        return {
          error: {
            error: 'Asset ID is required.',
            code: 'VALIDATION_ERROR',
          },
        };
      }

      const validation = assetUpdateSchema.safeParse(input);
      if (!validation.success) {
        return {
          error: {
            error: `Invalid input: ${validation.error.errors.map(e => e.message).join(', ')}`,
            code: 'VALIDATION_ERROR',
          },
        };
      }

      const supabase = await createAuthenticatedSupabaseClient(getToken);

      // Map camelCase to snake_case for database
      const dbInput: Record<string, unknown> = {};
      if (validation.data.name !== undefined) dbInput.name = validation.data.name;
      if (validation.data.type !== undefined) dbInput.type = validation.data.type;
      if (validation.data.value !== undefined) dbInput.value = validation.data.value;
      if (validation.data.dateAdded !== undefined) dbInput.date_added = validation.data.dateAdded;
      if (validation.data.change1D !== undefined) dbInput.change_1d = validation.data.change1D;
      if (validation.data.change1W !== undefined) dbInput.change_1w = validation.data.change1W;
      if (validation.data.institution !== undefined) {
        dbInput.institution = validation.data.institution === '' ? null : validation.data.institution;
      }
      if (validation.data.notes !== undefined) {
        dbInput.notes = validation.data.notes === '' ? null : validation.data.notes;
      }

      const { data, error } = await supabase
        .from('assets')
        .update(dbInput)
        .eq('id', id)
        .select(this.selectColumns)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return {
            error: {
              error: 'Asset not found.',
              code: 'NOT_FOUND',
            },
          };
        }
        console.error('Supabase assets update error:', error);
        return { error: this.normalizeSupabaseError(error) };
      }

      if (!data) {
        return {
          error: {
            error: 'Failed to update asset - no data returned',
            code: 'UNKNOWN_ERROR',
          },
        };
      }

      // Validate response data
      const responseValidation = assetEntitySchema.safeParse(data);
      if (!responseValidation.success) {
        console.error('Asset update response validation error:', responseValidation.error);
        return {
          error: {
            error: 'Invalid data received from server.',
            code: 'VALIDATION_ERROR',
          },
        };
      }

      // Map entity schema to domain Asset type
      const asset = this.mapEntityToAsset(responseValidation.data);

      return { data: asset };
    } catch (error) {
      console.error('Update asset error:', error);
      return { error: this.normalizeSupabaseError(error) };
    }
  }

  async remove(id: string, getToken: () => Promise<string | null>) {
    try {
      const correlationId = getCorrelationId();
      
      logger.warn(
        'DB:ASSET_DELETE',
        'SupabaseAssetsRepository.remove called',
        {
          assetId: id,
          repoType: 'SupabaseAssetsRepository',
        },
        correlationId || undefined
      );

      // Validate input
      if (!id) {
        return {
          error: {
            error: 'Asset ID is required.',
            code: 'VALIDATION_ERROR',
          },
        };
      }

      const supabase = await createAuthenticatedSupabaseClient(getToken);

      const { error } = await supabase.from('assets').delete().eq('id', id);

      if (error) {
        if (error.code === 'PGRST116') {
          return {
            error: {
              error: 'Asset not found.',
              code: 'NOT_FOUND',
            },
          };
        }
        console.error('Supabase assets delete error:', error);
        logger.error(
          'DB:ASSET_DELETE',
          'Failed to delete asset from Supabase',
          { error: error.message, code: error.code },
          correlationId || undefined
        );
        return { error: this.normalizeSupabaseError(error) };
      }

      logger.warn(
        'DB:ASSET_DELETE',
        'Asset deleted successfully from Supabase',
        {
          assetId: id,
          operation: 'delete',
        },
        correlationId || undefined
      );

      return {};
    } catch (error) {
      console.error('Delete asset error:', error);
      return { error: this.normalizeSupabaseError(error) };
    }
  }

  /**
   * Normalizes Supabase/PostgreSQL errors to a consistent format
   * Maps database-specific error codes to application error codes
   */
  private normalizeSupabaseError(error: unknown): { error: string; code: string } {
    if (!error || typeof error !== 'object') {
      return {
        error: 'An unexpected error occurred.',
        code: 'UNKNOWN_ERROR',
      };
    }

    const err = error as Record<string, unknown> & {
      code?: unknown;
      message?: unknown;
      details?: unknown;
      hint?: unknown;
    };
    const errorCode = typeof err.code === 'string' ? err.code : undefined;
    const message = typeof err.message === 'string' ? err.message : undefined;
    const details = typeof err.details === 'string' ? err.details : undefined;
    const hint = typeof err.hint === 'string' ? err.hint : undefined;

    // Handle known PostgreSQL/Supabase error codes
    if (errorCode === '23505') {
      // Unique constraint violation
      return {
        error: 'An asset with this name already exists for your account.',
        code: 'DUPLICATE_ENTRY',
      };
    }

    if (errorCode === '23514') {
      // Check constraint violation
      return {
        error: `Invalid asset data: ${details || message || 'Constraint violation'}`,
        code: 'VALIDATION_ERROR',
      };
    }

    if (errorCode === '23503') {
      // Foreign key constraint violation
      return {
        error: 'Referenced record does not exist.',
        code: 'VALIDATION_ERROR',
      };
    }

    if (errorCode === 'PGRST116') {
      // No rows returned (PostgREST)
      return {
        error: 'Asset not found.',
        code: 'NOT_FOUND',
      };
    }

    if (errorCode === 'PGRST301') {
      // Multiple rows returned when single expected
      return {
        error: 'Multiple assets found - data inconsistency detected.',
        code: 'UNKNOWN_ERROR',
      };
    }

    // Handle specific Supabase error patterns
    if (message?.includes('JWT') || message?.includes('token') || message?.includes('authentication')) {
      return {
        error: 'Authentication token expired or invalid. Please sign in again.',
        code: 'AUTH_EXPIRED',
      };
    }

    if (message?.includes('permission') || message?.includes('policy') || message?.includes('RLS')) {
      return {
        error: 'You do not have permission to perform this action. This asset may not belong to you.',
        code: 'PERMISSION_DENIED',
      };
    }

    if (message?.includes('connection') || message?.includes('timeout')) {
      return {
        error: 'Database connection error. Please try again.',
        code: 'UNKNOWN_ERROR',
      };
    }

    // Default error with more context
    const errorMessage = message || details || hint || 'An unexpected error occurred.';
    return {
      error: errorMessage,
      code: 'UNKNOWN_ERROR',
    };
  }
}

