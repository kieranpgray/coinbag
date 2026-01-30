import { getSupabaseBrowserClient } from "@/lib/supabase/supabaseBrowserClient";
import { logger } from "@/lib/logger";

/**
 * Debug probe to verify database state after statement import completion
 * 
 * This dev-only function checks:
 * - Transactions exist for the import/account
 * - They belong to the expected user
 * - RLS is working correctly
 * 
 * Use this to diagnose "upload succeeds but UI never renders" issues.
 */
export async function debugImportProbe(opts: {
  statementImportId: string;
  accountId: string;
  correlationId: string;
}): Promise<void> {
  // Only run in development
  if (!import.meta.env.DEV && import.meta.env.VITE_DEBUG_LOGGING !== 'true') {
    return;
  }

  const { statementImportId, accountId, correlationId } = opts;
  const supabase = getSupabaseBrowserClient();

  try {
    // Get current session to verify user context
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    const userId = sessionData?.session?.user?.id || null;

    if (sessionError) {
      logger.warn(
        "IMPORT:PROBE",
        "Could not get session for probe",
        {
          correlationId,
          statementImportId,
          accountId,
          error: sessionError.message,
        },
        correlationId
      );
    }

    // Count transactions for this import
    const { count, error: countError } = await supabase
      .from("transactions")
      .select("id", { count: "exact", head: true })
      .eq("account_id", accountId)
      .eq("statement_import_id", statementImportId);

    // Also get a sample transaction to verify structure
    const { data: sampleTransaction, error: sampleError } = await supabase
      .from("transactions")
      .select("id, account_id, statement_import_id, user_id")
      .eq("account_id", accountId)
      .eq("statement_import_id", statementImportId)
      .limit(1)
      .maybeSingle();

    // Get statement import record
    const { data: statementImport, error: importError } = await supabase
      .from("statement_imports")
      .select("id, status, user_id, account_id, correlation_id, imported_transactions")
      .eq("id", statementImportId)
      .single();

    // Log probe results
    logger.info(
      "IMPORT:PROBE",
      "Import probe results",
      {
        correlationId,
        statementImportId,
        accountId,
        userId,
        transactionCount: count ?? null,
        transactionCountError: countError?.message ?? null,
        sampleTransaction: sampleTransaction
          ? {
              id: sampleTransaction.id,
              accountId: sampleTransaction.account_id,
              statementImportId: sampleTransaction.statement_import_id,
              userId: sampleTransaction.user_id,
            }
          : null,
        sampleTransactionError: sampleError?.message ?? null,
        statementImport: statementImport
          ? {
              id: statementImport.id,
              status: statementImport.status,
              userId: statementImport.user_id,
              accountId: statementImport.account_id,
              correlationId: statementImport.correlation_id,
              importedTransactions: statementImport.imported_transactions,
            }
          : null,
        statementImportError: importError?.message ?? null,
      },
      correlationId
    );

    // Console log for easy filtering
    console.log("[ImportProbe]", {
      correlationId,
      statementImportId,
      accountId,
      userId,
      txnCount: count ?? 0,
      txnCountError: countError?.message,
      sampleTxn: sampleTransaction,
      statementImport: statementImport,
      issues: [
        count === 0 && statementImport?.status === "completed"
          ? "WARNING: Status is completed but no transactions found"
          : null,
        countError
          ? `ERROR: Failed to count transactions: ${countError.message}`
          : null,
        statementImport?.user_id !== userId
          ? `WARNING: Statement import user_id (${statementImport?.user_id}) doesn't match session userId (${userId})`
          : null,
        statementImport?.correlation_id !== correlationId
          ? `WARNING: Statement import correlation_id (${statementImport?.correlation_id}) doesn't match expected (${correlationId})`
          : null,
      ].filter(Boolean),
    });
  } catch (error) {
    logger.error(
      "IMPORT:PROBE",
      "Probe execution failed",
      {
        correlationId,
        statementImportId,
        accountId,
        error: error instanceof Error ? error.message : String(error),
      },
      correlationId
    );
  }
}

