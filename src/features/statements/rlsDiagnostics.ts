/**
 * RLS Diagnostics Utilities
 * 
 * Dev-only tools to verify auth/RLS context matches between frontend and backend
 */

import { getSupabaseBrowserClient } from "@/lib/supabase/supabaseBrowserClient";
import { getUserIdFromToken } from "@/lib/supabaseClient";
import { logger } from "@/lib/logger";

/**
 * Check if the current user's auth context matches the statement import's user_id
 * This helps diagnose "backend worked but UI shows nothing" issues due to RLS mismatches
 */
export async function checkRLSMatch(opts: {
  statementImportId: string;
  getToken: () => Promise<string | null>;
  correlationId?: string;
}): Promise<{
  match: boolean;
  frontendUserId: string | null;
  importUserId: string | null;
  accountId: string | null;
  error?: string;
}> {
  // Only run in development
  if (!import.meta.env.DEV && import.meta.env.VITE_DEBUG_LOGGING !== 'true') {
    return {
      match: true, // Assume match in production
      frontendUserId: null,
      importUserId: null,
      accountId: null,
    };
  }

  const { statementImportId, getToken, correlationId } = opts;
  const corrId = correlationId || 'unknown';

  try {
    // Get frontend user ID
    const frontendUserId = await getUserIdFromToken(getToken);

    // Get statement import record to check user_id
    const supabase = getSupabaseBrowserClient();
    const { data: statementImport, error: importError } = await supabase
      .from('statement_imports')
      .select('user_id, account_id')
      .eq('id', statementImportId)
      .single();

    if (importError) {
      logger.error(
        'RLS:Diagnostics',
        'Failed to fetch statement import for RLS check',
        {
          correlationId: corrId,
          statementImportId,
          error: importError.message,
        },
        corrId
      );
      return {
        match: false,
        frontendUserId,
        importUserId: null,
        accountId: null,
        error: importError.message,
      };
    }

    const match = frontendUserId === statementImport?.user_id;

    if (!match) {
      logger.error(
        'RLS:MISMATCH',
        'Frontend user ID does not match statement import user_id - RLS will filter results',
        {
          correlationId: corrId,
          statementImportId,
          frontendUserId,
          importUserId: statementImport?.user_id,
          accountId: statementImport?.account_id,
        },
        corrId
      );
      
      console.error('[RLS Diagnostics] MISMATCH DETECTED:', {
        correlationId: corrId,
        statementImportId,
        frontendUserId,
        importUserId: statementImport?.user_id,
        accountId: statementImport?.account_id,
        message: 'Frontend user ID does not match statement import user_id. RLS policies will filter out transactions, causing "backend worked but UI shows nothing" issue.',
      });
    } else {
      logger.debug(
        'RLS:MATCH',
        'Frontend user ID matches statement import user_id',
        {
          correlationId: corrId,
          statementImportId,
          userId: frontendUserId,
          accountId: statementImport?.account_id,
        },
        corrId
      );
    }

    return {
      match,
      frontendUserId,
      importUserId: statementImport?.user_id || null,
      accountId: statementImport?.account_id || null,
    };
  } catch (error) {
    logger.error(
      'RLS:Diagnostics',
      'Error checking RLS match',
      {
        correlationId: corrId,
        statementImportId,
        error: error instanceof Error ? error.message : String(error),
      },
      corrId
    );
    
    return {
      match: false,
      frontendUserId: null,
      importUserId: null,
      accountId: null,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

