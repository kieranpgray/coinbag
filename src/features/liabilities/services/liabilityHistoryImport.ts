import { createLiabilitiesRepository } from '@/data/liabilities/repo';
import { createAuthenticatedSupabaseClient, getUserIdFromToken } from '@/lib/supabaseClient';
import type { Liability } from '@/types/domain';
import { logger, getCorrelationId } from '@/lib/logger';

/**
 * Service to bulk import history from existing liability data
 * Creates history entries for liabilities that don't have history yet
 * Uses the liability's created_at date for the history entry timestamp
 */
export async function bulkImportLiabilityHistory(
  liabilities: Liability[],
  getToken: () => Promise<string | null>
): Promise<{ success: number; failed: number; errors: string[] }> {
  const correlationId = getCorrelationId();
  const repository = createLiabilitiesRepository();
  const supabase = await createAuthenticatedSupabaseClient(getToken);
  const userId = await getUserIdFromToken(getToken);
  
  if (!userId) {
    logger.error(
      'BULK_IMPORT:LIABILITY_HISTORY',
      'Cannot import history: Failed to get user ID',
      {},
      correlationId || undefined
    );
    return {
      success: 0,
      failed: liabilities.length,
      errors: ['Authentication failed. Please sign in again.'],
    };
  }

  let success = 0;
  let failed = 0;
  const errors: string[] = [];

  logger.info(
    'BULK_IMPORT:LIABILITY_HISTORY',
    'Starting bulk import of liability history',
    { liabilityCount: liabilities.length },
    correlationId || undefined
  );

  for (const liability of liabilities) {
    try {
      // Check if history already exists
      const historyResult = await repository.getBalanceHistory(liability.id, getToken);
      
      if (historyResult.error && historyResult.error.code !== 'NOT_FOUND') {
        logger.warn(
          'BULK_IMPORT:LIABILITY_HISTORY',
          'Failed to check existing history',
          { liabilityId: liability.id, error: historyResult.error },
          correlationId || undefined
        );
        failed++;
        errors.push(`Liability ${liability.name}: ${historyResult.error.error}`);
        continue;
      }

      // Skip if history already exists
      if (historyResult.data && historyResult.data.length > 0) {
        logger.debug(
          'BULK_IMPORT:LIABILITY_HISTORY',
          'Liability already has history, skipping',
          { liabilityId: liability.id },
          correlationId || undefined
        );
        continue;
      }

      // Get liability's created_at date from database
      const liabilityData = await supabase
        .from('liabilities')
        .select('created_at')
        .eq('id', liability.id)
        .single();

      const createdAt = liabilityData.data?.created_at || new Date().toISOString();

      // Directly insert initial history entry
      const insertResult = await supabase
        .from('liability_balance_history')
        .insert([{
          liability_id: liability.id,
          previous_balance: null, // NULL for initial creation
          new_balance: liability.balance,
          user_id: userId,
          created_at: createdAt, // Use liability's creation date
        }])
        .select('id')
        .single();

      if (insertResult.error) {
        logger.error(
          'BULK_IMPORT:LIABILITY_HISTORY',
          'Failed to create history entry',
          { liabilityId: liability.id, error: insertResult.error.message },
          correlationId || undefined
        );
        failed++;
        errors.push(`Liability ${liability.name}: ${insertResult.error.message}`);
      } else {
        success++;
        logger.debug(
          'BULK_IMPORT:LIABILITY_HISTORY',
          'Created history entry for liability',
          { liabilityId: liability.id, historyId: insertResult.data?.id },
          correlationId || undefined
        );
      }
    } catch (error) {
      logger.error(
        'BULK_IMPORT:LIABILITY_HISTORY',
        'Exception while importing liability history',
        { liabilityId: liability.id, error },
        correlationId || undefined
      );
      failed++;
      errors.push(`Liability ${liability.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  logger.info(
    'BULK_IMPORT:LIABILITY_HISTORY',
    'Bulk import completed',
    { success, failed, total: liabilities.length },
    correlationId || undefined
  );

  return { success, failed, errors };
}
