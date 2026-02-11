import { createAssetsRepository } from '@/data/assets/repo';
import { createAuthenticatedSupabaseClient, getUserIdFromToken } from '@/lib/supabaseClient';
import type { Asset } from '@/types/domain';
import { logger, getCorrelationId } from '@/lib/logger';

/**
 * Service to bulk import history from existing asset data
 * Creates history entries for assets that don't have history yet
 * Uses the asset's created_at date for the history entry timestamp
 */
export async function bulkImportAssetHistory(
  assets: Asset[],
  getToken: () => Promise<string | null>
): Promise<{ success: number; failed: number; errors: string[] }> {
  const correlationId = getCorrelationId();
  const repository = createAssetsRepository();
  const supabase = await createAuthenticatedSupabaseClient(getToken);
  const userId = await getUserIdFromToken(getToken);
  
  if (!userId) {
    logger.error(
      'BULK_IMPORT:ASSET_HISTORY',
      'Cannot import history: Failed to get user ID',
      {},
      correlationId || undefined
    );
    return {
      success: 0,
      failed: assets.length,
      errors: ['Authentication failed. Please sign in again.'],
    };
  }

  let success = 0;
  let failed = 0;
  const errors: string[] = [];

  logger.info(
    'BULK_IMPORT:ASSET_HISTORY',
    'Starting bulk import of asset history',
    { assetCount: assets.length },
    correlationId || undefined
  );

  for (const asset of assets) {
    try {
      // Check if history already exists
      const historyResult = await repository.getValueHistory(asset.id, getToken);
      
      if (historyResult.error && historyResult.error.code !== 'NOT_FOUND') {
        logger.warn(
          'BULK_IMPORT:ASSET_HISTORY',
          'Failed to check existing history',
          { assetId: asset.id, error: historyResult.error },
          correlationId || undefined
        );
        failed++;
        errors.push(`Asset ${asset.name}: ${historyResult.error.error}`);
        continue;
      }

      // Skip if history already exists
      if (historyResult.data && historyResult.data.length > 0) {
        logger.debug(
          'BULK_IMPORT:ASSET_HISTORY',
          'Asset already has history, skipping',
          { assetId: asset.id },
          correlationId || undefined
        );
        continue;
      }

      // Get asset's created_at date from database
      const assetData = await supabase
        .from('assets')
        .select('created_at')
        .eq('id', asset.id)
        .single();

      const createdAt = assetData.data?.created_at || new Date().toISOString();

      // Directly insert initial history entry
      const insertResult = await supabase
        .from('asset_value_history')
        .insert([{
          asset_id: asset.id,
          previous_value: null, // NULL for initial creation
          new_value: asset.value,
          user_id: userId,
          created_at: createdAt, // Use asset's creation date
        }])
        .select('id')
        .single();

      if (insertResult.error) {
        logger.error(
          'BULK_IMPORT:ASSET_HISTORY',
          'Failed to create history entry',
          { assetId: asset.id, error: insertResult.error.message },
          correlationId || undefined
        );
        failed++;
        errors.push(`Asset ${asset.name}: ${insertResult.error.message}`);
      } else {
        success++;
        logger.debug(
          'BULK_IMPORT:ASSET_HISTORY',
          'Created history entry for asset',
          { assetId: asset.id, historyId: insertResult.data?.id },
          correlationId || undefined
        );
      }
    } catch (error) {
      logger.error(
        'BULK_IMPORT:ASSET_HISTORY',
        'Exception while importing asset history',
        { assetId: asset.id, error },
        correlationId || undefined
      );
      failed++;
      errors.push(`Asset ${asset.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  logger.info(
    'BULK_IMPORT:ASSET_HISTORY',
    'Bulk import completed',
    { success, failed, total: assets.length },
    correlationId || undefined
  );

  return { success, failed, errors };
}
