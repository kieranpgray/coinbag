/**
 * Statement Storage purge helpers (RLS: use user JWT-bound Supabase client only).
 */

export type PurgeLogger = {
  info: (event: string, message: string, data?: any, correlationId?: string) => void
  warn: (event: string, message: string, data?: any, correlationId?: string) => void
  error: (event: string, message: string, data?: any, correlationId?: string) => void
}

/** When unset or any value other than 'false' / '0', purges are enabled. */
export function isStatementFilePurgeEnabled(): boolean {
  const v =
    typeof Deno !== 'undefined' && typeof Deno.env?.get === 'function'
      ? Deno.env.get('ENABLE_STATEMENT_FILE_PURGE')
      : undefined
  return v !== 'false' && v !== '0'
}

export function shouldPurgeStorageAfterFullOcrPath(row: {
  status: string
  file_path: string | null | undefined
  error_message: string | null | undefined
}): boolean {
  if (row.status !== 'completed') return false
  if (!row.file_path?.trim()) return false
  const msg = row.error_message ?? ''
  if (msg.startsWith('Failed to copy cached transactions')) return false
  if (msg.includes('Background copy failed')) return false
  return true
}

const STALE_MS = 24 * 60 * 60 * 1000
const STALE_PURGE_LIMIT = 20

type StorageClient = {
  storage: {
    from: (bucket: string) => {
      remove: (paths: string[]) => Promise<{ error: { message: string } | null }>
    }
  }
}

/**
 * Remove object from statements bucket. Never throws.
 * @returns true if remove returned no error
 */
export async function purgeStatementObject(
  supabase: StorageClient,
  filePath: string,
  correlationId: string | undefined,
  purgeLogger: PurgeLogger
): Promise<boolean> {
  if (!filePath?.trim()) return false
  try {
    const { error } = await supabase.storage.from('statements').remove([filePath])
    if (error) {
      purgeLogger.error(
        'STATEMENT:STORAGE_PURGE_FAILED',
        'Failed to remove statement file from storage',
        { filePath: filePath.substring(0, 120), error: error.message },
        correlationId
      )
      return false
    }
    purgeLogger.info(
      'STATEMENT:STORAGE_PURGE',
      'Removed statement file from storage',
      { filePath: filePath.substring(0, 120) },
      correlationId
    )
    return true
  } catch (e) {
    purgeLogger.error(
      'STATEMENT:STORAGE_PURGE_FAILED',
      'Exception removing statement file from storage',
      {
        filePath: filePath.substring(0, 120),
        error: e instanceof Error ? e.message : String(e)
      },
      correlationId
    )
    return false
  }
}

export async function mergeFileStoragePurgedMetadata(
  supabase: {
    from: (t: string) => {
      select: (cols: string) => { eq: (c: string, v: string) => { single: () => Promise<{ data: any; error: any }> } }
      update: (row: any) => { eq: (c: string, v: string) => Promise<{ error: any }> }
    }
  },
  statementImportId: string,
  correlationId: string | undefined,
  purgeLogger: PurgeLogger,
  extra?: { file_purge_reason?: string }
): Promise<void> {
  try {
    const { data: row, error: selErr } = await supabase
      .from('statement_imports')
      .select('metadata')
      .eq('id', statementImportId)
      .single()
    if (selErr || !row) {
      purgeLogger.warn(
        'STATEMENT:STORAGE_PURGE_METADATA',
        'Could not load metadata for purge timestamp',
        { statementImportId, error: selErr?.message },
        correlationId
      )
      return
    }
    const meta = (row.metadata && typeof row.metadata === 'object') ? row.metadata : {}
    const { error: upErr } = await supabase
      .from('statement_imports')
      .update({
        metadata: {
          ...meta,
          file_storage_purged_at: new Date().toISOString(),
          ...(extra?.file_purge_reason ? { file_purge_reason: extra.file_purge_reason } : {})
        }
      })
      .eq('id', statementImportId)
    if (upErr) {
      purgeLogger.warn(
        'STATEMENT:STORAGE_PURGE_METADATA',
        'Failed to update metadata after purge',
        { statementImportId, error: upErr.message },
        correlationId
      )
    }
  } catch (e) {
    purgeLogger.warn(
      'STATEMENT:STORAGE_PURGE_METADATA',
      'Exception updating metadata after purge',
      {
        statementImportId,
        error: e instanceof Error ? e.message : String(e)
      },
      correlationId
    )
  }
}

/**
 * Best-effort: purge stale pending/processing (>24h on created_at) and old failed (>24h on updated_at)
 * for rows visible under RLS (current user). Capped per request.
 */
export async function purgeStaleStatementFilesForUser(
  supabase: {
    from: (t: string) => {
      select: (cols: string) => {
        in: (col: string, vals: string[]) => {
          not: (col: string, op: string, val: null) => {
            lt: (col: string, iso: string) => { limit: (n: number) => Promise<{ data: any[] | null; error: any }> }
          }
        }
        eq: (col: string, val: string) => {
          not: (col: string, op: string, val: null) => {
            lt: (col: string, iso: string) => { limit: (n: number) => Promise<{ data: any[] | null; error: any }> }
          }
        }
      }
    }
  },
  correlationId: string | undefined,
  purgeLogger: PurgeLogger
): Promise<void> {
  if (!isStatementFilePurgeEnabled()) return

  const now = Date.now()
  const staleCreatedBefore = new Date(now - STALE_MS).toISOString()
  const staleFailedUpdatedBefore = new Date(now - STALE_MS).toISOString()

  try {
    const { data: stuckRows, error: e1 } = await supabase
      .from('statement_imports')
      .select('id, file_path, status, created_at, updated_at')
      .in('status', ['pending', 'processing'])
      .not('file_path', 'is', null)
      .neq('file_path', '')
      .lt('created_at', staleCreatedBefore)
      .limit(STALE_PURGE_LIMIT)

    if (e1) {
      purgeLogger.warn(
        'STATEMENT:STALE_PURGE',
        'Query for stale pending/processing imports failed',
        { error: e1.message },
        correlationId
      )
    } else if (stuckRows?.length) {
      for (const r of stuckRows) {
        if (!r.file_path?.trim()) continue
        await purgeStatementObject(supabase as StorageClient, r.file_path, correlationId, purgeLogger)
      }
    }

    const remaining = STALE_PURGE_LIMIT - (stuckRows?.length ?? 0)
    if (remaining <= 0) return

    const { data: failedRows, error: e2 } = await supabase
      .from('statement_imports')
      .select('id, file_path, status, created_at, updated_at')
      .eq('status', 'failed')
      .not('file_path', 'is', null)
      .neq('file_path', '')
      .lt('updated_at', staleFailedUpdatedBefore)
      .limit(remaining)

    if (e2) {
      purgeLogger.warn(
        'STATEMENT:STALE_PURGE',
        'Query for stale failed imports failed',
        { error: e2.message },
        correlationId
      )
    } else if (failedRows?.length) {
      for (const r of failedRows) {
        if (!r.file_path?.trim()) continue
        await purgeStatementObject(supabase as StorageClient, r.file_path, correlationId, purgeLogger)
      }
    }
  } catch (e) {
    purgeLogger.warn(
      'STATEMENT:STALE_PURGE',
      'Stale purge sweep failed',
      { error: e instanceof Error ? e.message : String(e) },
      correlationId
    )
  }
}
