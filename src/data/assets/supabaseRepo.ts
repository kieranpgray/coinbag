import type { AssetsRepository } from './repo';
import { createAuthenticatedSupabaseClient, getUserIdFromToken } from '@/lib/supabaseClient';
import {
  assetCreateSchema,
  assetUpdateSchema,
  assetListSchema,
  assetEntitySchema,
  assetValueHistoryListSchema,
} from '@/contracts/assets';
import type { Asset, AssetValueHistory } from '@/types/domain';
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
  // Select actual database column names (snake_case)
  // Supabase doesn't support column aliasing in select strings, so we map them manually
  private readonly selectColumns =
    'id, name, type, value, change_1d, change_1w, date_added, institution, notes, user_id, created_at, updated_at, ticker, exchange, quantity, purchase_price, purchase_date, todays_price, grant_date, vesting_date, grant_price, address, property_type, last_price_fetched_at, price_source';

  // Fallback when asset-fields migration not applied (no grant_price, address, property_type)
  private readonly selectColumnsWithoutAssetFields =
    'id, name, type, value, change_1d, change_1w, date_added, institution, notes, user_id, created_at, updated_at, ticker, exchange, quantity, purchase_price, purchase_date, todays_price, grant_date, vesting_date, last_price_fetched_at, price_source';

  // Fallback when price caching OR asset-fields not applied (Stock/RSU columns only)
  private readonly selectColumnsWithoutPriceFields =
    'id, name, type, value, change_1d, change_1w, date_added, institution, notes, user_id, created_at, updated_at, ticker, exchange, quantity, purchase_price, purchase_date, todays_price, grant_date, vesting_date';

  // Fallback when Stock/RSU migration has not been applied: columns from original assets table only.
  private readonly selectColumnsBasic =
    'id, name, type, value, change_1d, change_1w, date_added, institution, notes, user_id, created_at, updated_at';

  /**
   * True when the error indicates missing columns (e.g. migration not applied) or 400 Bad Request.
   * Used to trigger fallback select with selectColumnsBasic.
   */
  private isMissingColumnOrBadRequest(error: { code?: string; message?: string; status?: number }): boolean {
    const code = error?.code ?? '';
    const status = typeof error !== 'undefined' && error !== null && 'status' in error
      ? (error as { status?: number }).status
      : undefined;
    const msg = (error?.message ?? '').toLowerCase();
    const looksLikeBadRequest = status === 400 || msg.includes('bad request') || msg.includes('400') || code === 'PGRST204';
    return (
      code === '42703' ||
      code === 'PGRST100' ||
      code === 'PGRST204' ||
      looksLikeBadRequest ||
      (msg.includes('column') && (msg.includes('does not exist') || msg.includes('ticker') || msg.includes('purchase_price') || msg.includes('vesting_date') || msg.includes('last_price_fetched_at') || msg.includes('price_source') || msg.includes('grant_price') || msg.includes('address') || msg.includes('property_type')))
    );
  }

  /**
   * Maps database row (snake_case) to entity schema (camelCase)
   * Converts snake_case database columns to camelCase for entity schema validation
   */
  private mapDbRowToEntity(row: Record<string, unknown>): z.infer<typeof assetEntitySchema> {
    const toDateStr = (val: unknown): string | undefined => {
      if (val === null || val === undefined) return undefined;
      const s = String(val);
      return s.includes('T') ? s.split('T')[0] : s;
    };
    // Normalize legacy types: Investments/Other → Other Investments (migration 20260216120002 may not have run)
    const rawType = row.type as string;
    const type =
      rawType === 'Investments' || rawType === 'Other' ? 'Other Investments' : rawType;
    return {
      id: row.id as string,
      name: row.name as string,
      type: type as 'Real Estate' | 'Other Investments' | 'Vehicles' | 'Crypto' | 'Cash' | 'Superannuation' | 'Stock' | 'RSU',
      value: row.value as number,
      change1D: row.change_1d === null ? undefined : (row.change_1d as number | undefined),
      change1W: row.change_1w === null ? undefined : (row.change_1w as number | undefined),
      dateAdded: (row.date_added ? String(row.date_added).split('T')[0] : new Date().toISOString().split('T')[0]) as string,
      institution: row.institution === null ? undefined : (row.institution as string | undefined),
      notes: row.notes === null ? undefined : (row.notes as string | undefined),
      userId: row.user_id as string,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
      ticker: row.ticker === null || row.ticker === undefined ? undefined : (row.ticker as string),
      exchange: row.exchange === null || row.exchange === undefined ? undefined : (row.exchange as string),
      quantity: row.quantity === null || row.quantity === undefined ? undefined : (row.quantity as number),
      purchasePrice: row.purchase_price === null || row.purchase_price === undefined ? undefined : (row.purchase_price as number),
      purchaseDate: toDateStr(row.purchase_date),
      todaysPrice: row.todays_price === null || row.todays_price === undefined ? undefined : (row.todays_price as number),
      grantDate: toDateStr(row.grant_date),
      vestingDate: toDateStr(row.vesting_date),
      grantPrice: row.grant_price === null || row.grant_price === undefined ? undefined : (row.grant_price as number),
      address: row.address === null || row.address === undefined ? undefined : (row.address as string),
      propertyType: row.property_type === null || row.property_type === undefined ? undefined : (row.property_type as string),
      lastPriceFetchedAt: row.last_price_fetched_at === null || row.last_price_fetched_at === undefined ? undefined : (row.last_price_fetched_at as string),
      priceSource: row.price_source === null || row.price_source === undefined ? undefined : (row.price_source as string),
    };
  }

  /**
   * Maps asset entity (with userId and timestamps) to domain Asset type (without userId)
   * Converts dateAdded from database format (ISO string or YYYY-MM-DD) to YYYY-MM-DD format
   */
  private mapEntityToAsset(entity: z.infer<typeof assetEntitySchema>): Asset {
    // Convert dateAdded to YYYY-MM-DD format if it's in ISO format
    // Supabase may return dates as ISO strings (e.g., "2024-01-01T00:00:00.000Z")
    // but the contract expects YYYY-MM-DD format
    const entityDateAdded = entity.dateAdded;
    const defaultDate = new Date().toISOString().split('T')[0] || '2000-01-01';
    let dateAdded: string = defaultDate;
    if (entityDateAdded !== undefined && entityDateAdded !== null && typeof entityDateAdded === 'string') {
      if (entityDateAdded.includes('T')) {
        // ISO format detected, extract YYYY-MM-DD part
        const parts = entityDateAdded.split('T');
        const extracted = parts[0];
        if (extracted && extracted.length > 0) {
          dateAdded = extracted;
        }
      } else {
        dateAdded = entityDateAdded;
      }
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
      ticker: entity.ticker,
      exchange: entity.exchange,
      quantity: entity.quantity,
      purchasePrice: entity.purchasePrice,
      purchaseDate: entity.purchaseDate,
      todaysPrice: entity.todaysPrice,
      grantDate: entity.grantDate,
      vestingDate: entity.vestingDate,
      grantPrice: entity.grantPrice,
      address: entity.address,
      propertyType: entity.propertyType,
      lastPriceFetchedAt: entity.lastPriceFetchedAt,
      priceSource: entity.priceSource,
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

      let data: unknown[] | null = null;
      let error: { message?: string; code?: string; details?: string; hint?: string; status?: number } | null = null;

      const result = await supabase
        .from('assets')
        .select(this.selectColumns)
        .order('date_added', { ascending: false });

      data = result.data as unknown[] | null;
      error = result.error;

      // Fallback: only when error suggests schema/column mismatch (400, PGRST204, etc.) — not network/RLS/500
      if (error && this.isMissingColumnOrBadRequest(error)) {
        const correlationId = getCorrelationId();
        logger.warn(
          'DB:ASSETS_LIST',
          'Full select failed (schema may be behind). Retrying with reduced columns.',
          { error: error.message, code: error.code },
          correlationId || undefined
        );
        // Retry 1: without asset-fields (grant_price, address, property_type)
        const retry1 = await supabase
          .from('assets')
          .select(this.selectColumnsWithoutAssetFields)
          .order('date_added', { ascending: false });
        if (!retry1.error && retry1.data) {
          data = retry1.data as unknown[];
          error = null;
        } else if (retry1.error && this.isMissingColumnOrBadRequest(retry1.error)) {
          // Retry 2: without price/asset fields (Stock/RSU only)
          const retry2 = await supabase
            .from('assets')
            .select(this.selectColumnsWithoutPriceFields)
            .order('date_added', { ascending: false });
          if (!retry2.error && retry2.data) {
            data = retry2.data as unknown[];
            error = null;
          } else if (retry2.error && this.isMissingColumnOrBadRequest(retry2.error)) {
            // Retry 3: basic columns only (pre-Stock migration)
            const retry3 = await supabase
              .from('assets')
              .select(this.selectColumnsBasic)
              .order('date_added', { ascending: false });
            if (!retry3.error && retry3.data) {
              data = retry3.data as unknown[];
              error = null;
            } else if (retry3.error) {
              logger.error('DB:ASSETS_LIST', 'All fallback selects failed', { error: retry3.error.message }, correlationId || undefined);
            }
          } else if (retry2.error) {
            logger.error('DB:ASSETS_LIST', 'Fallback 2 failed', { error: retry2.error.message }, correlationId || undefined);
          }
        } else if (retry1.error) {
          logger.error('DB:ASSETS_LIST', 'Fallback 1 failed', { error: retry1.error.message }, correlationId || undefined);
        }
      }

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
            isRlsError: error.message?.includes('permission') || error.message?.includes('policy') || error.message?.includes('RLS'),
          },
          correlationId || undefined
        );
        if (error.message?.includes('permission') || error.message?.includes('policy') || error.message?.includes('RLS')) {
          logger.warn(
            'DB:ASSETS_LIST',
            'RLS policy may be blocking query - JWT validation may not be configured',
            { error: error.message, suggestion: 'Check if Supabase JWT validation is configured (see docs/CLERK_SUPABASE_JWT_SETUP.md)' },
            correlationId || undefined
          );
        }
        if (import.meta.env.DEV) {
          console.warn('[Assets] List failed:', error?.message ?? error, { code: error?.code, details: error?.details });
        }
        return {
          data: [],
          error: this.normalizeSupabaseError(error),
        };
      }

      // Map database rows (snake_case) to entity schema (camelCase)
      const mappedData = (data || []).map((row) => this.mapDbRowToEntity(row as Record<string, unknown>));

      // Validate response data
      const validation = assetListSchema.safeParse(mappedData);
      if (!validation.success) {
        logger.error('DB:ASSETS_LIST', 'Assets list validation error', { error: validation.error }, correlationId || undefined);
        if (import.meta.env.DEV) {
          const flat = validation.error.flatten();
          console.warn('[Assets] List validation failed:', flat, 'issues:', validation.error.issues);
        }
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
      logger.error('DB:ASSETS_LIST', 'List assets error', { error }, getCorrelationId() || undefined);
      if (import.meta.env.DEV) {
        console.warn('[Assets] List error (catch):', error);
      }
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

      const result = await supabase
        .from('assets')
        .select(this.selectColumns)
        .eq('id', id)
        .single();

      let data: Record<string, unknown> | null = (result.data ?? null) as Record<string, unknown> | null;
      let error = result.error;

      // Fallback: if select fails due to missing columns or 400, retry with reduced columns
      if (error && this.isMissingColumnOrBadRequest(error)) {
        const correlationId = getCorrelationId();
        logger.warn(
          'DB:ASSETS_GET',
          'Full select failed (missing columns or 400), retrying. Run supabase db push to apply migrations.',
          { error: error.message, code: error.code },
          correlationId || undefined
        );
        const retries = [
          this.selectColumnsWithoutAssetFields,
          this.selectColumnsWithoutPriceFields,
          this.selectColumnsBasic,
        ] as const;
        for (const cols of retries) {
          const retry = await supabase.from('assets').select(cols).eq('id', id).single();
          if (!retry.error && retry.data) {
            data = retry.data as unknown as Record<string, unknown>;
            error = null;
            break;
          }
          if (retry.error && !this.isMissingColumnOrBadRequest(retry.error)) {
            error = retry.error;
            break;
          }
          error = retry.error;
        }
        if (error) {
          logger.error('DB:ASSETS_GET', 'All fallback selects failed', { error }, correlationId || undefined);
        }
      }

      if (error) {
        if (error.code === 'PGRST116') {
          return {
            error: {
              error: 'Asset not found.',
              code: 'NOT_FOUND',
            },
          };
        }
        logger.error('DB:ASSETS_GET', 'Supabase assets get error', { error }, getCorrelationId() || undefined);
        return { error: this.normalizeSupabaseError(error) };
      }

      if (!data) {
        return {
          error: {
            error: 'Asset not found.',
            code: 'NOT_FOUND',
          },
        };
      }

      // Map database row (snake_case) to entity schema (camelCase)
      const mappedData = this.mapDbRowToEntity(data as Record<string, unknown>);

      // Validate response data
      const validation = assetEntitySchema.safeParse(mappedData);
      if (!validation.success) {
        logger.error('DB:ASSETS_GET', 'Asset validation error', { error: validation.error }, getCorrelationId() || undefined);
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
      logger.error('DB:ASSETS_GET', 'Get asset error', { error }, getCorrelationId() || undefined);
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
      // Validate and normalize asset type to ensure it matches database constraint
      const typeValue = String(validation.data.type).trim();
      const allowedTypes = ['Real Estate', 'Other Investments', 'Vehicles', 'Crypto', 'Cash', 'Superannuation', 'Stock', 'RSU'];

      if (!allowedTypes.includes(typeValue)) {
        logger.error('DB:ASSET_INSERT', 'Invalid asset type provided', {
          providedType: typeValue,
          allowedTypes,
        }, correlationId || undefined);
        return {
          error: {
            error: `Invalid asset type: "${typeValue}". Allowed types: ${allowedTypes.join(', ')}`,
            code: 'VALIDATION_ERROR',
          },
        };
      }

      // Stock/RSU/Crypto: derive name from ticker when name is missing or empty
      let nameForDb = validation.data.name?.trim() || '';
      if ((typeValue === 'Stock' || typeValue === 'RSU' || typeValue === 'Crypto') && !nameForDb) {
        const tickerVal = validation.data.ticker?.trim() ?? '';
        const purchaseDate = validation.data.purchaseDate?.trim();
        if (typeValue === 'Stock') {
          nameForDb = tickerVal || 'Unknown';
        } else if (typeValue === 'RSU') {
          nameForDb = tickerVal ? `${tickerVal} (RSU)` : 'RSU';
        } else {
          // Crypto: use ticker or "TICKER (YYYY-MM-DD)" for lot-style display
          nameForDb = purchaseDate ? `${tickerVal || 'Crypto'} (${purchaseDate})` : (tickerVal || 'Crypto');
        }
      }
      // Non-Stock/RSU/Crypto: name is required by contract; already validated
      if (typeValue !== 'Stock' && typeValue !== 'RSU' && typeValue !== 'Crypto' && !nameForDb) {
        return {
          error: {
            error: "Asset name can't be empty.",
            code: 'VALIDATION_ERROR',
          },
        };
      }

      // Type-specific required fields (contract validates; double-check for repo clarity)
      if (typeValue === 'Stock' || typeValue === 'RSU' || typeValue === 'Crypto') {
        const tickerVal = validation.data.ticker?.trim();
        if (!tickerVal) {
          return {
            error: {
              error: typeValue === 'Crypto' ? 'Coin symbol is required for Crypto.' : 'Ticker is required for Stock and RSU.',
              code: 'VALIDATION_ERROR',
            },
          };
        }
        if (validation.data.quantity === undefined || validation.data.quantity === null || validation.data.quantity <= 0) {
          return {
            error: {
              error: 'Quantity is required and must be positive.',
              code: 'VALIDATION_ERROR',
            },
          };
        }
      }

      const dbInput: Record<string, unknown> = {
        user_id: userId, // EXPLICIT: Set user_id from JWT, don't rely on DB default
        name: nameForDb,
        type: typeValue,
        value: validation.data.value,
        date_added: validation.data.dateAdded,
      };

      // Add optional fields only if they are defined
      if (validation.data.change1D !== undefined) {
        dbInput.change_1d = validation.data.change1D;
      }
      if (validation.data.change1W !== undefined) {
        dbInput.change_1w = validation.data.change1W;
      }
      dbInput.institution = validation.data.institution ?? null;
      if (validation.data.notes !== undefined) {
        dbInput.notes = validation.data.notes === '' ? null : validation.data.notes;
      }
      // Stock/RSU columns
      if (validation.data.ticker !== undefined && validation.data.ticker !== '') {
        dbInput.ticker = validation.data.ticker.trim();
      }
      if (validation.data.exchange !== undefined && validation.data.exchange !== '') {
        dbInput.exchange = validation.data.exchange;
      }
      if (validation.data.quantity !== undefined && validation.data.quantity !== null) {
        dbInput.quantity = validation.data.quantity;
      }
      if (validation.data.purchasePrice !== undefined && validation.data.purchasePrice !== null) {
        dbInput.purchase_price = validation.data.purchasePrice;
      }
      if (validation.data.purchaseDate !== undefined && validation.data.purchaseDate !== '') {
        dbInput.purchase_date = validation.data.purchaseDate;
      }
      if (validation.data.todaysPrice !== undefined && validation.data.todaysPrice !== null) {
        dbInput.todays_price = validation.data.todaysPrice;
      }
      if (validation.data.grantDate !== undefined && validation.data.grantDate !== '') {
        dbInput.grant_date = validation.data.grantDate;
      }
      if (validation.data.vestingDate !== undefined && validation.data.vestingDate !== '') {
        dbInput.vesting_date = validation.data.vestingDate;
      }
      if (validation.data.grantPrice !== undefined && validation.data.grantPrice !== null) {
        dbInput.grant_price = validation.data.grantPrice;
      }
      if (validation.data.address !== undefined && validation.data.address !== '') {
        dbInput.address = validation.data.address.trim();
      }
      if (validation.data.propertyType !== undefined && validation.data.propertyType !== '') {
        dbInput.property_type = validation.data.propertyType.trim();
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
        
        logger.error('DB:ASSETS_CREATE', 'Supabase assets create error', { error }, correlationId || undefined);
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

      // Map database row (snake_case) to entity schema (camelCase)
      const mappedData = this.mapDbRowToEntity(data);

      // Validate response data
      const responseValidation = assetEntitySchema.safeParse(mappedData);
      if (!responseValidation.success) {
        logger.error('DB:ASSETS_CREATE', 'Asset create response validation error', { error: responseValidation.error }, correlationId || undefined);
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
      logger.error('DB:ASSETS_CREATE', 'Create asset error', { error }, getCorrelationId() || undefined);
      return { error: this.normalizeSupabaseError(error) };
    }
  }

  async update(
    id: string,
    input: Partial<Omit<Asset, 'id'>>,
    getToken: () => Promise<string | null>
  ) {
    try {
      const correlationId = getCorrelationId();
      
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
      const allowedTypes = ['Real Estate', 'Other Investments', 'Vehicles', 'Crypto', 'Cash', 'Superannuation', 'Stock', 'RSU'];
      const dbInput: Record<string, unknown> = {};

      if (validation.data.name !== undefined) {
        let nameForDb = validation.data.name?.trim() ?? '';
        const typeValue = validation.data.type !== undefined ? String(validation.data.type).trim() : undefined;
        if ((typeValue === 'Stock' || typeValue === 'RSU' || typeValue === 'Crypto') && !nameForDb) {
          const tickerVal = validation.data.ticker?.trim() ?? '';
          const purchaseDate = validation.data.purchaseDate?.trim();
          if (typeValue === 'Stock') {
            nameForDb = tickerVal || 'Unknown';
          } else if (typeValue === 'RSU') {
            nameForDb = tickerVal ? `${tickerVal} (RSU)` : 'RSU';
          } else {
            nameForDb = purchaseDate ? `${tickerVal || 'Crypto'} (${purchaseDate})` : (tickerVal || 'Crypto');
          }
        }
        dbInput.name = nameForDb;
      }
      if (validation.data.type !== undefined) {
        const typeValue = String(validation.data.type).trim();
        if (!allowedTypes.includes(typeValue)) {
          logger.error('DB:ASSET_UPDATE', 'Invalid asset type provided', {
            assetId: id,
            providedType: typeValue,
            allowedTypes,
          }, correlationId || undefined);
          return {
            error: {
              error: `Invalid asset type: "${typeValue}". Allowed types: ${allowedTypes.join(', ')}`,
              code: 'VALIDATION_ERROR',
            },
          };
        }
        dbInput.type = typeValue;
      }
      if (validation.data.value !== undefined) dbInput.value = validation.data.value;
      if (validation.data.dateAdded !== undefined) dbInput.date_added = validation.data.dateAdded;
      if (validation.data.change1D !== undefined) dbInput.change_1d = validation.data.change1D;
      if (validation.data.change1W !== undefined) dbInput.change_1w = validation.data.change1W;
      dbInput.institution = validation.data.institution ?? null;
      if (validation.data.notes !== undefined) {
        dbInput.notes = validation.data.notes === '' ? null : validation.data.notes;
      }
      if (validation.data.ticker !== undefined) dbInput.ticker = validation.data.ticker === '' ? null : validation.data.ticker?.trim();
      if (validation.data.exchange !== undefined) dbInput.exchange = validation.data.exchange === '' ? null : validation.data.exchange;
      if (validation.data.quantity !== undefined) dbInput.quantity = validation.data.quantity;
      if (validation.data.purchasePrice !== undefined) dbInput.purchase_price = validation.data.purchasePrice;
      if (validation.data.purchaseDate !== undefined) dbInput.purchase_date = validation.data.purchaseDate === '' ? null : validation.data.purchaseDate;
      if (validation.data.todaysPrice !== undefined) dbInput.todays_price = validation.data.todaysPrice;
      if (validation.data.grantDate !== undefined) dbInput.grant_date = validation.data.grantDate === '' ? null : validation.data.grantDate;
      if (validation.data.vestingDate !== undefined) dbInput.vesting_date = validation.data.vestingDate === '' ? null : validation.data.vestingDate;
      if (validation.data.grantPrice !== undefined) dbInput.grant_price = validation.data.grantPrice;
      if (validation.data.address !== undefined) dbInput.address = validation.data.address === '' ? null : validation.data.address?.trim();
      if (validation.data.propertyType !== undefined) dbInput.property_type = validation.data.propertyType === '' ? null : validation.data.propertyType?.trim();

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
        
        // Check if it's a constraint violation for type
        if (error.code === '23514' && error.message.includes('assets_type_check')) {
          const providedType = dbInput.type;
          
          logger.error('DB:ASSET_UPDATE', 'Asset type constraint violation', {
            assetId: id,
            error: error.message,
            code: error.code,
            dbInput,
            providedType,
            allowedTypes,
            hint: 'The database constraint may not include all types. Check if migrations have been run.',
          }, correlationId || undefined);
          
          logger.error('DB:ASSETS_UPDATE', 'Asset type constraint violation', {
            providedType,
            allowedTypes,
            error: error.message,
            hint: 'Ensure migration 20251229160001_add_superannuation_asset_type.sql has been run',
          }, correlationId || undefined);
          
          return {
            error: {
              error: `Invalid asset type "${providedType}". The database constraint may not include this type. Please ensure all migrations have been run, including: 20251229160001_add_superannuation_asset_type.sql`,
              code: 'VALIDATION_ERROR',
            },
          };
        }
        
        logger.error('DB:ASSETS_UPDATE', 'Supabase assets update error', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
          dbInput,
        }, correlationId || undefined);
        logger.error('DB:ASSET_UPDATE', 'Failed to update asset in Supabase', {
          error: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
          dbInput,
        }, correlationId || undefined);
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

      // Map database row (snake_case) to entity schema (camelCase)
      const mappedData = this.mapDbRowToEntity(data);

      // Validate response data
      const responseValidation = assetEntitySchema.safeParse(mappedData);
      if (!responseValidation.success) {
        logger.error('DB:ASSETS_UPDATE', 'Asset update response validation error', { error: responseValidation.error }, correlationId || undefined);
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
      logger.error('DB:ASSETS_UPDATE', 'Update asset error', { error }, getCorrelationId() || undefined);
      return { error: this.normalizeSupabaseError(error) };
    }
  }

  async getValueHistory(
    assetId: string,
    getToken: () => Promise<string | null>
  ) {
    try {
      const correlationId = getCorrelationId();

      if (!assetId) {
        return {
          error: {
            error: 'Asset ID is required.',
            code: 'VALIDATION_ERROR',
          },
        };
      }

      const supabase = await createAuthenticatedSupabaseClient(getToken);

      const { data, error } = await supabase
        .from('asset_value_history')
        .select('id, asset_id, previous_value, new_value, change_amount, created_at, value_as_at_date')
        .eq('asset_id', assetId)
        .order('created_at', { ascending: false });

      if (error) {
        logger.error(
          'DB:ASSET_VALUE_HISTORY',
          'Failed to fetch asset value history',
          { assetId, error: error.message },
          correlationId || undefined
        );
        return { error: this.normalizeSupabaseError(error) };
      }

      if (!data) {
        return { data: [] };
      }

      // Map database rows to domain types
      const toDateStr = (val: unknown): string | undefined | null => {
        if (val === null || val === undefined) return undefined;
        const s = String(val);
        return s.includes('T') ? s.split('T')[0] : s;
      };
      const history: AssetValueHistory[] = data.map((row) => ({
        id: row.id as string,
        assetId: row.asset_id as string,
        previousValue: row.previous_value === null ? null : (row.previous_value as number),
        newValue: row.new_value as number,
        changeAmount: row.change_amount as number,
        createdAt: row.created_at as string,
        valueAsAtDate: row.value_as_at_date != null ? toDateStr(row.value_as_at_date) ?? undefined : undefined,
      }));

      // Validate with Zod schema
      const validation = assetValueHistoryListSchema.safeParse(history);
      if (!validation.success) {
        logger.error(
          'DB:ASSET_VALUE_HISTORY',
          'Asset value history validation error',
          { assetId, error: validation.error },
          correlationId || undefined
        );
        return {
          error: {
            error: 'Invalid data received from server.',
            code: 'VALIDATION_ERROR',
          },
        };
      }

      return { data: validation.data };
    } catch (error) {
      logger.error(
        'DB:ASSET_VALUE_HISTORY',
        'Get asset value history error',
        { assetId, error },
        getCorrelationId() || undefined
      );
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
        logger.error('DB:ASSETS_DELETE', 'Supabase assets delete error', { error }, correlationId || undefined);
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
      logger.error('DB:ASSETS_DELETE', 'Delete asset error', { error }, getCorrelationId() || undefined);
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

