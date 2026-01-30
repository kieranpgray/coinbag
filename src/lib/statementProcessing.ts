/**
 * Client-side utilities for statement processing
 *
 * Handles triggering Edge Function processing and real-time status updates
 */

import { createAuthenticatedSupabaseClient } from './supabaseClient'
import { getCorrelationId, logger } from './logger'
import { registerChannel, unregisterChannel, hasActiveChannel } from './realtime/subscriptionManager'
import type { StatementImportEntity } from '@/contracts/statementImports'

/**
 * Map database snake_case format to camelCase contract format
 */
function mapDbRowToStatementImportEntity(dbRow: any): StatementImportEntity {
  return {
    id: dbRow.id,
    userId: dbRow.user_id,
    accountId: dbRow.account_id,
    fileName: dbRow.file_name,
    filePath: dbRow.file_path,
    fileHash: dbRow.file_hash,
    fileSize: dbRow.file_size,
    mimeType: dbRow.mime_type,
    status: dbRow.status,
    parsingMethod: dbRow.parsing_method || null,
    totalTransactions: dbRow.total_transactions || 0,
    importedTransactions: dbRow.imported_transactions || 0,
    failedTransactions: dbRow.failed_transactions || 0,
    confidenceScore: dbRow.confidence_score || null,
    errorMessage: dbRow.error_message || null,
    metadata: dbRow.metadata || {},
    createdAt: dbRow.created_at,
    updatedAt: dbRow.updated_at,
    completedAt: dbRow.completed_at || null,
  }
}

/**
 * Subscribe to real-time status updates for a statement import
 * Includes fallback polling if real-time subscription fails or doesn't receive updates
 * 
 * NOTE: This is an OPTIONAL optimization. The deterministic watcher (watchStatementImport)
 * should be used as the primary mechanism for ensuring UI updates. This realtime subscription
 * can provide faster updates but should not be relied upon for correctness.
 *
 * @param statementImportId - The ID of the statement import to monitor
 * @param onStatusUpdate - Callback function called when status changes
 * @param getToken - Function to get the current auth token
 * @returns Cleanup function to remove the subscription and polling
 */
export async function subscribeToStatementImportStatus(
  statementImportId: string,
  onStatusUpdate: (status: StatementImportEntity) => void,
  getToken: () => Promise<string | null>
): Promise<() => void> {
  const supabase = await createAuthenticatedSupabaseClient(getToken)

  let pollInterval: number | null = null
  let lastStatus: string | null = null
  let pollAttempts = 0
  const maxPollAttempts = 60 // Poll for up to 5 minutes (60 * 5 seconds)
  const pollIntervalMs = 5000 // Poll every 5 seconds

  // Fallback polling function
  const startPolling = () => {
    if (pollInterval !== null) {
      console.log(`[Polling] Already polling for ${statementImportId}, skipping start`)
      return // Already polling
    }
    
    console.log(`[Polling] Starting polling interval for ${statementImportId} (every ${pollIntervalMs}ms, max ${maxPollAttempts} attempts)`)

    pollInterval = window.setInterval(async () => {
      pollAttempts++
      
      if (pollAttempts > maxPollAttempts) {
        console.warn(`Polling timeout for statement import ${statementImportId} after ${maxPollAttempts} attempts`)
        if (pollInterval !== null) {
          clearInterval(pollInterval)
          pollInterval = null
        }
        return
      }

      try {
        const status = await getStatementImportStatus(statementImportId, getToken)
        if (status) {
          // Log every polling attempt with current status
          if (pollAttempts % 5 === 0 || status.status !== lastStatus) {
            console.log(`[Polling] Check ${pollAttempts}/${maxPollAttempts} for ${statementImportId}: status=${status.status} (last=${lastStatus})`)
          }
          
          // Only call callback if status changed
          if (status.status !== lastStatus) {
            console.log(`[Polling] 🔄 Status change detected for ${statementImportId}: ${lastStatus} → ${status.status}`)
            lastStatus = status.status
            // Wrap callback in try-catch to prevent errors from breaking polling
            try {
              onStatusUpdate(status)
              console.log(`[Polling] ✅ Callback executed for ${statementImportId} with status: ${status.status}`)
            } catch (error) {
              console.error(`[Polling] ❌ Error in status update callback for ${statementImportId}:`, error)
              // Continue polling - don't break on callback error
            }
            
            // Stop polling if processing is complete
            if (status.status === 'completed' || status.status === 'failed') {
              console.log(`[Polling] ✅ Stopping poll for ${statementImportId} - status is ${status.status}`)
              if (pollInterval !== null) {
                clearInterval(pollInterval)
                pollInterval = null
              }
            }
          }
        } else {
          console.warn(`[Polling] ⚠️  No status found for ${statementImportId} (attempt ${pollAttempts})`)
        }
      } catch (error) {
        console.error(`[Polling] ❌ Error polling status for ${statementImportId} (attempt ${pollAttempts}):`, error)
        // Continue polling on error
      }
    }, pollIntervalMs)
  }

  // Initial status check - do this FIRST to avoid unnecessary polling/subscription
  try {
    console.log(`[StatusCheck] Initial status check for ${statementImportId}`)
    const initialStatus = await getStatementImportStatus(statementImportId, getToken)
    if (initialStatus) {
      lastStatus = initialStatus.status
      console.log(`[StatusCheck] Initial status for ${statementImportId}: ${initialStatus.status}`)
      // getStatementImportStatus already returns mapped data, so use it directly
      onStatusUpdate(initialStatus)
      
      // If already completed/failed, no need to set up subscription or polling
      if (initialStatus.status === 'completed' || initialStatus.status === 'failed') {
        console.log(`[StatusCheck] ✅ Status already ${initialStatus.status} for ${statementImportId}, no subscription needed`)
        // Return cleanup function that does nothing (no subscriptions to clean up)
        return () => {
          // Already done, nothing to clean up
        }
      }
    } else {
      console.warn(`[StatusCheck] ⚠️  No initial status found for ${statementImportId}`)
    }
  } catch (error) {
    console.error(`[StatusCheck] ❌ Failed to get initial status for ${statementImportId}:`, error)
    // Continue to subscription/polling as fallback
  }

  // Check if subscription already exists (single-subscription guard)
  const correlationId = getCorrelationId() || 'unknown';
  if (hasActiveChannel(statementImportId)) {
    logger.warn(
      'Realtime:Subscription',
      'Channel already exists for statement import, skipping duplicate subscription',
      {
        correlationId,
        statementImportId,
      },
      correlationId
    );
    // Return cleanup function that does nothing since subscription already exists
    // Polling will still work as fallback
    startPolling();
    return () => {
      // No cleanup needed - existing subscription handles it
    };
  }

  // Try real-time subscription first
  let channel: any = null

  try {
    channel = supabase
      .channel(`statement-import-${statementImportId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'statement_imports',
        filter: `id=eq.${statementImportId}`
      }, (payload: any) => {
        if (payload.new) {
          const newStatus = payload.new.status
          
          console.log(`[Realtime] Update received for ${statementImportId}: ${lastStatus} → ${newStatus}`)
          
          // Only update if status actually changed (avoid duplicate callbacks)
          if (newStatus !== lastStatus) {
            lastStatus = newStatus
            // Wrap callback in try-catch to prevent errors from breaking subscription
            try {
              // Map database snake_case to camelCase contract format
              const mappedEntity = mapDbRowToStatementImportEntity(payload.new)
              onStatusUpdate(mappedEntity)
              console.log(`[Realtime] ✅ Callback executed for ${statementImportId} with status: ${newStatus}`)
            } catch (error) {
              console.error(`[Realtime] ❌ Error in status update callback for ${statementImportId}:`, error)
              // Continue - don't break subscription on callback error
            }
          }
          
          // Stop polling if real-time subscription is working
          if (pollInterval !== null) {
            clearInterval(pollInterval)
            pollInterval = null
          }
        } else {
          console.warn(`[Realtime] ⚠️  Update received but payload.new is missing for ${statementImportId}`)
        }
      })
      .subscribe((status: string) => {
        console.log(`[Realtime] Subscription status for ${statementImportId}: ${status}`)
        if (status === 'SUBSCRIBED') {
          console.log(`[Realtime] ✅ Subscription active for ${statementImportId}`)
          
          // Register channel in subscription manager
          registerChannel(statementImportId, channel, correlationId);
          
          // Stop polling if subscription activates successfully
          if (pollInterval !== null) {
            clearInterval(pollInterval)
            pollInterval = null
          }
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          logger.warn(
            'Realtime:CHANNEL_ERROR',
            'Subscription failed, falling back to polling',
            {
              correlationId,
              statementImportId,
              status,
            },
            correlationId
          );
          console.warn(`[Realtime] ❌ Subscription failed for ${statementImportId}, falling back to polling`)
          
          // Unregister channel on error
          unregisterChannel(statementImportId, supabase, correlationId);
          
          // Ensure polling is active if subscription fails
          if (pollInterval === null) {
            startPolling()
          }
        }
      })

    // Start polling immediately as fallback - will stop if subscription activates
    // This ensures we don't miss status updates even if subscription is slow to connect
    console.log(`[Polling] Starting polling for ${statementImportId} (will stop if realtime activates)`)
    startPolling()

  } catch (error) {
    console.error('Failed to set up real-time subscription, using polling:', error)
    startPolling()
  }

  return () => {
    // Unregister channel from subscription manager
    if (channel) {
      unregisterChannel(statementImportId, supabase, correlationId);
    }
    
    // Clean up polling
    if (pollInterval !== null) {
      clearInterval(pollInterval)
      pollInterval = null
    }
  }
}

/**
 * Trigger statement processing via Edge Function
 *
 * @param statementImportId - The ID of the statement import to process
 * @param getToken - Function to get the current auth token
 * @returns Promise that resolves when the processing is triggered
 */
export async function triggerStatementProcessing(
  statementImportId: string,
  getToken: () => Promise<string | null>,
  correlationId?: string
): Promise<void> {
  const token = await getToken()
  if (!token) {
    throw new Error('Not authenticated')
  }

  // Get correlation ID if not provided
  const finalCorrelationId = correlationId || getCorrelationId() || `ui-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;

  // Get Supabase URL and anon key for direct fetch call
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase configuration missing')
  }

  try {
    // Use direct fetch instead of supabase.functions.invoke() to bypass gateway JWT validation
    // Pass anon key in Authorization (gateway requirement) and Clerk JWT in custom header
    const response = await fetch(`${supabaseUrl}/functions/v1/process-statement`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseAnonKey}`, // Gateway requires this
        'Content-Type': 'application/json',
        'x-clerk-token': token, // Clerk JWT for function to use
        'x-correlation-id': finalCorrelationId, // Pass correlation ID to edge function
        'apikey': supabaseAnonKey // Some Supabase endpoints require this
      },
      body: JSON.stringify({ statementImportId, correlationId: finalCorrelationId })
    })

    // Handle 202 Accepted (async processing started)
    if (response.status === 202) {
      const data = await response.json()
      if (data?.success && data?.processing) {
        // Processing started successfully in background
        console.log('Processing started asynchronously:', data.message || 'Status will update as processing completes.')
        return // Success - processing continues in background
      }
    }

    if (!response.ok) {
      const errorText = await response.text()
      let errorMessage = `Failed to trigger processing: ${response.status}`
      
      // Handle timeout errors specifically
      if (response.status === 504 || response.status === 546) {
        errorMessage = `Processing timeout: The statement may be too large or complex. Processing may continue in the background.`
      } else {
        try {
          const errorData = JSON.parse(errorText)
          errorMessage = errorData.error || errorMessage
        } catch {
          errorMessage = `${errorMessage} ${errorText}`
        }
      }
      
      throw new Error(errorMessage)
    }

    const data = await response.json()
    if (!data?.success && !data?.processing) {
      throw new Error('Processing failed to start')
    }
  } catch (error) {
    // Check if it's a timeout error - these are recoverable
    const isTimeout = error instanceof Error && 
      (error.message.includes('timeout') || 
       error.message.includes('504') || 
       error.message.includes('546') ||
       error.message.includes('WORKER_LIMIT'))
    
    // Check if it's a 404 - function might not be deployed or URL is wrong
    const is404 = error instanceof Error && 
      (error.message.includes('404') || 
       error.message.includes('Not Found'))
    
    if (isTimeout) {
      // Timeout errors are logged but don't throw - processing may continue
      console.warn('Edge Function timeout, but processing may continue:', error)
      // Don't throw - allow subscription to handle status updates
      return
    }
    
    if (is404) {
      // 404 errors indicate function not found - this is a deployment issue
      console.error('Edge Function not found (404). Check:', {
        error: error instanceof Error ? error.message : String(error),
        url: `${supabaseUrl}/functions/v1/process-statement`,
        note: 'Ensure the function is deployed and the Supabase URL is correct'
      })
      // Still don't throw - allow UI to handle gracefully
      return
    }
    
    // For other errors, log but don't throw - processing might still work
    console.warn('Edge Function trigger failed, but processing may continue:', error)
  }
}

/**
 * Check the current status of a statement import
 *
 * @param statementImportId - The ID of the statement import to check
 * @param getToken - Function to get the current auth token
 * @returns Promise that resolves with the current status
 */
export async function getStatementImportStatus(
  statementImportId: string,
  getToken: () => Promise<string | null>
): Promise<StatementImportEntity | null> {
  const supabase = await createAuthenticatedSupabaseClient(getToken)

  const { data, error } = await supabase
    .from('statement_imports')
    .select('*')
    .eq('id', statementImportId)
    .maybeSingle() // Use maybeSingle() instead of single() to handle 0 rows gracefully (returns null instead of 406)

  if (error) {
    console.error(`[getStatementImportStatus] ❌ Failed to get status for ${statementImportId}:`, {
      error: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint
    })
    return null
  }

  if (!data) {
    console.warn(`[getStatementImportStatus] ⚠️  No data returned for ${statementImportId} - record may not exist yet`)
    return null
  }

  // Map snake_case DB fields to camelCase contract format
  const mappedData = mapDbRowToStatementImportEntity(data)

  console.log(`[getStatementImportStatus] ✅ Retrieved status for ${statementImportId}: ${mappedData.status}`)
  return mappedData
}
