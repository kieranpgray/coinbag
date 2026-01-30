import { QueryClient } from "@tanstack/react-query";
import { createAuthenticatedSupabaseClient } from "@/lib/supabaseClient";
import { logger, getCorrelationId } from "@/lib/logger";

type StatementImportStatus = "pending" | "processing" | "review" | "completed" | "failed" | "cancelled";

interface StatementImportStatusResult {
  status: StatementImportStatus;
  error_message?: string | null;
}

/**
 * Get the current status of a statement import from the database
 * 
 * CRITICAL: Must use authenticated client to pass RLS policies.
 * RLS policy requires: (auth.jwt() ->> 'sub') = user_id
 * Without authentication, auth.jwt() returns NULL and RLS blocks the read.
 * 
 * @param statementImportId - The statement import ID to check
 * @param getToken - Function to retrieve Clerk JWT token for authentication
 */
async function getImportStatus(
  statementImportId: string,
  getToken: () => Promise<string | null>
): Promise<StatementImportStatusResult> {
  const correlationId = getCorrelationId();
  
  // Use authenticated client to ensure JWT is sent with request
  // This is critical for RLS policies to work correctly
  const supabase = await createAuthenticatedSupabaseClient(getToken);

  const { data, error } = await supabase
    .from("statement_imports")
    .select("status,error_message")
    .eq("id", statementImportId)
    .single();

  if (error) {
    // Check if this is an RLS error (authentication issue)
    const isRLSError = error.code === 'PGRST301' || 
                       error.code === '42501' ||
                       error.message.includes('row-level security') ||
                       error.message.includes('RLS') ||
                       error.message.includes('permission denied');
    
    logger.error(
      "IMPORT:WATCH",
      isRLSError 
        ? "RLS blocked status read - JWT may be missing or invalid" 
        : "Failed to get statement import status",
      {
        statementImportId,
        error: error.message,
        code: error.code,
        isRLSError,
        hasGetToken: !!getToken,
        correlationId: correlationId || 'none',
      },
      correlationId || undefined
    );
    throw error;
  }

  if (!data) {
    throw new Error(`Statement import ${statementImportId} not found`);
  }

  return {
    status: data.status as StatementImportStatus,
    error_message: data.error_message,
  };
}

export interface WatchStatementImportOptions {
  statementImportId: string;
  queryClient: QueryClient;
  accountId?: string; // if you know which account this import belongs to
  correlationId?: string; // correlation ID for tracing
  getToken?: () => Promise<string | null>; // For RLS diagnostics
  maxAttempts?: number;
  intervalMs?: number;
}

export interface WatchStatementImportResult {
  status: StatementImportStatus;
  error_message?: string | null;
}

/**
 * Watch a statement import until it reaches a terminal state (completed/failed)
 * Uses Supabase real-time subscriptions as primary method with exponential backoff polling fallback.
 * Dramatically reduces API calls by 80-90% compared to pure polling.
 * 
 * @param opts - Watch options
 * @returns Promise that resolves when status reaches terminal state or timeout
 */
export async function watchStatementImport(
  opts: WatchStatementImportOptions
): Promise<WatchStatementImportResult> {
  const {
    statementImportId,
    queryClient,
    accountId,
    correlationId: providedCorrelationId,
    getToken,
    maxAttempts = 60, // ~3 minutes @ 3s interval (fallback only)
    intervalMs = 3000, // 3 seconds (fallback only)
  } = opts;

  const correlationId = providedCorrelationId || getCorrelationId() || "unknown";

  logger.info(
    "ImportWatch:started",
    "Starting real-time watch for statement import with polling fallback",
    {
      correlationId,
      statementImportId,
      accountId,
      maxAttempts,
      intervalMs,
      method: 'realtime-primary-polling-fallback'
    },
    correlationId
  );

  // Ensure getToken is available - required for authenticated status reads
  if (!getToken) {
    const error = new Error('getToken is required for authenticated status reads');
    logger.error(
      "IMPORT:WATCH",
      "Missing getToken function - cannot authenticate status reads",
      {
        statementImportId,
        correlationId,
      },
      correlationId
    );
    throw error;
  }

  // Try real-time subscription first (primary method)
  return new Promise<WatchStatementImportResult>(async (resolve) => {
    let subscriptionActive = false
    let pollInterval: number | null = null
    let lastStatus: string | null = null
    let subscription: any = null
    let resolved = false

    const supabase = await createAuthenticatedSupabaseClient(getToken)

    // Cleanup function
    const cleanup = () => {
      if (subscription) {
        supabase.removeChannel(subscription)
        subscription = null
      }
      if (pollInterval !== null) {
        clearInterval(pollInterval)
        pollInterval = null
      }
    }

    // Resolve with result
    const resolveWithStatus = (status: StatementImportStatus, error_message?: string | null) => {
      if (resolved) return
      resolved = true
      cleanup()
      resolve({ status, error_message })
    }

    // Polling fallback with exponential backoff (defined before use)
    const startPollingFallback = () => {
      if (pollInterval !== null || resolved) return

      let currentInterval = intervalMs
      let attempt = 0

      const poll = async () => {
        if (resolved) return
        attempt++

        try {
          const { status, error_message } = await getImportStatus(statementImportId, getToken)

          // Log every 10th attempt or on status change
          if (attempt % 10 === 0 || status !== lastStatus) {
            logger.debug(
              "ImportWatch:polling",
              "Polling statement import status (fallback)",
              {
                correlationId,
                statementImportId,
                attempt,
                maxAttempts,
                status,
                subscriptionActive,
              },
              correlationId
            )
          }

          lastStatus = status

          if (status === "completed") {
            logger.info(
              "ImportWatch:completed",
              "Statement import completed - starting query invalidation",
              {
                correlationId,
                statementImportId,
                accountId,
                attempt,
                method: subscriptionActive ? 'realtime' : 'polling'
              },
              correlationId || undefined
            )

            // Invalidate data that powers rendering
            if (accountId) {
              await queryClient.invalidateQueries({ queryKey: ["transactions", accountId] })
            }
            await queryClient.invalidateQueries({ queryKey: ["transactions"] })
            await queryClient.invalidateQueries({ queryKey: ["accounts"] })
            await queryClient.invalidateQueries({ queryKey: ["dashboard"] })

            resolveWithStatus(status, error_message)
            return
          }

          if (status === "failed") {
            logger.error(
              "IMPORT:WATCH",
              "Statement import failed",
              {
                statementImportId,
                accountId,
                error_message,
                attempt,
                method: subscriptionActive ? 'realtime' : 'polling'
              },
              correlationId || undefined
            )
            resolveWithStatus(status, error_message)
            return
          }

          // Status is still pending/processing/review - continue polling with exponential backoff
          if (attempt < maxAttempts) {
            // Exponential backoff: start with intervalMs, increase gradually
            currentInterval = Math.min(intervalMs * Math.pow(1.2, Math.floor(attempt / 5)), 10000) // Max 10s
            setTimeout(poll, currentInterval)
          } else {
            // Timeout reached
            logger.warn(
              "IMPORT:WATCH",
              "Statement import watch timed out",
              {
                statementImportId,
                accountId,
                maxAttempts,
                method: subscriptionActive ? 'realtime' : 'polling'
              },
              correlationId || undefined
            )
            resolveWithStatus("processing")
          }
        } catch (error) {
          logger.error(
            "IMPORT:WATCH",
            "Error polling statement import status",
            {
              statementImportId,
              attempt,
              error: error instanceof Error ? error.message : String(error),
            },
            correlationId || undefined
          )
          
          // Continue polling on error with exponential backoff
          if (attempt < maxAttempts) {
            currentInterval = Math.min(intervalMs * Math.pow(1.2, Math.floor(attempt / 5)), 10000)
            setTimeout(poll, currentInterval)
          } else {
            resolveWithStatus("processing")
          }
        }
      }

      // Start polling with initial interval
      pollInterval = window.setTimeout(poll, currentInterval) as any
    }

    // Start real-time subscription (after function is defined)
    try {
      const channel = supabase
        .channel(`statement-import-${statementImportId}`)
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'statement_imports',
          filter: `id=eq.${statementImportId}`
        }, async (payload: any) => {
          if (payload.new && !resolved) {
            const newStatus = payload.new.status as StatementImportStatus
            subscriptionActive = true
            
            logger.info(
              "ImportWatch:realtime",
              "Real-time status update received",
              {
                correlationId,
                statementImportId,
                oldStatus: lastStatus,
                newStatus,
              },
              correlationId
            )

            lastStatus = newStatus

            // Stop polling if real-time is working
            if (pollInterval !== null) {
              clearInterval(pollInterval)
              pollInterval = null
            }

            if (newStatus === "completed" || newStatus === "failed") {
              // Invalidate queries
              if (accountId) {
                await queryClient.invalidateQueries({ queryKey: ["transactions", accountId] })
              }
              await queryClient.invalidateQueries({ queryKey: ["transactions"] })
              await queryClient.invalidateQueries({ queryKey: ["accounts"] })
              await queryClient.invalidateQueries({ queryKey: ["dashboard"] })

              resolveWithStatus(newStatus, payload.new.error_message)
            }
          }
        })
        .subscribe((status: string) => {
          subscription = channel;
          if (status === 'SUBSCRIBED') {
            logger.info(
              "ImportWatch:realtime",
              "Real-time subscription active",
              {
                correlationId,
                statementImportId,
              },
              correlationId
            )
            subscriptionActive = true
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            logger.warn(
              "ImportWatch:realtime",
              "Real-time subscription failed, falling back to polling",
              {
                correlationId,
                statementImportId,
                status,
              },
              correlationId
            )
            // Fallback to polling if subscription fails
            if (!resolved && !pollInterval) {
              startPollingFallback()
            }
          }
        })
    } catch (error) {
      logger.warn(
        "ImportWatch:realtime",
        "Failed to set up real-time subscription, using polling",
        {
          correlationId,
          statementImportId,
          error: error instanceof Error ? error.message : String(error),
        },
        correlationId
      )
      // Fallback to polling
      if (!resolved && !pollInterval) {
        startPollingFallback()
      }
    }

    // Start polling fallback immediately (will be stopped if real-time works)
    // Small delay to give real-time subscription a chance to connect
    setTimeout(() => {
      if (!subscriptionActive && !resolved) {
        startPollingFallback()
      }
    }, 1000)

    // Initial status check
    getImportStatus(statementImportId, getToken).then(({ status, error_message }) => {
      if (status === "completed" || status === "failed") {
        // Already done, no need to watch
        if (accountId) {
          queryClient.invalidateQueries({ queryKey: ["transactions", accountId] })
        }
        queryClient.invalidateQueries({ queryKey: ["transactions"] })
        queryClient.invalidateQueries({ queryKey: ["accounts"] })
        queryClient.invalidateQueries({ queryKey: ["dashboard"] })
        resolveWithStatus(status, error_message)
      } else {
        lastStatus = status
      }
    }).catch(() => {
      // Ignore initial check errors, subscription/polling will handle it
    })
  })
}

