/**
 * Unit tests for statement storage purge helpers.
 * Run: pnpm test supabase/functions/process-statement/statement-purge.test.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  isStatementFilePurgeEnabled,
  shouldPurgeStorageAfterFullOcrPath,
  purgeStatementObject,
} from './statement-purge.ts'

const mockLogger = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}

describe('statement-purge', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('Deno', {
      env: {
        get: vi.fn(),
      },
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  describe('isStatementFilePurgeEnabled', () => {
    it('returns true when ENABLE_STATEMENT_FILE_PURGE is unset', () => {
      ;(globalThis as any).Deno.env.get.mockReturnValue(undefined)
      expect(isStatementFilePurgeEnabled()).toBe(true)
    })
    it('returns false when set to false', () => {
      ;(globalThis as any).Deno.env.get.mockReturnValue('false')
      expect(isStatementFilePurgeEnabled()).toBe(false)
    })
    it('returns false when set to 0', () => {
      ;(globalThis as any).Deno.env.get.mockReturnValue('0')
      expect(isStatementFilePurgeEnabled()).toBe(false)
    })
  })

  describe('shouldPurgeStorageAfterFullOcrPath', () => {
    it('returns true for completed with path and no blocking error', () => {
      expect(
        shouldPurgeStorageAfterFullOcrPath({
          status: 'completed',
          file_path: 'u/a/1.pdf',
          error_message: null,
        })
      ).toBe(true)
    })
    it('returns false for failed', () => {
      expect(
        shouldPurgeStorageAfterFullOcrPath({
          status: 'failed',
          file_path: 'x',
          error_message: null,
        })
      ).toBe(false)
    })
    it('returns false when cache copy failed message', () => {
      expect(
        shouldPurgeStorageAfterFullOcrPath({
          status: 'completed',
          file_path: 'x',
          error_message: 'Failed to copy cached transactions: boom',
        })
      ).toBe(false)
    })
    it('returns false when background copy failed', () => {
      expect(
        shouldPurgeStorageAfterFullOcrPath({
          status: 'completed',
          file_path: 'x',
          error_message: 'Background copy failed: x',
        })
      ).toBe(false)
    })
    it('returns false for empty file_path', () => {
      expect(
        shouldPurgeStorageAfterFullOcrPath({
          status: 'completed',
          file_path: '',
          error_message: null,
        })
      ).toBe(false)
    })
  })

  describe('purgeStatementObject', () => {
    it('returns true and logs on success', async () => {
      const remove = vi.fn().mockResolvedValue({ error: null })
      const supabase = { storage: { from: vi.fn(() => ({ remove })) } }
      const ok = await purgeStatementObject(
        supabase as any,
        'user/acc/doc.pdf',
        'cid',
        mockLogger
      )
      expect(ok).toBe(true)
      expect(remove).toHaveBeenCalledWith(['user/acc/doc.pdf'])
      expect(mockLogger.info).toHaveBeenCalledWith(
        'STATEMENT:STORAGE_PURGE',
        expect.any(String),
        expect.any(Object),
        'cid'
      )
    })
    it('returns false and does not throw on storage error', async () => {
      const remove = vi.fn().mockResolvedValue({ error: { message: 'nope' } })
      const supabase = { storage: { from: vi.fn(() => ({ remove })) } }
      const ok = await purgeStatementObject(
        supabase as any,
        'path',
        'cid',
        mockLogger
      )
      expect(ok).toBe(false)
      expect(mockLogger.error).toHaveBeenCalledWith(
        'STATEMENT:STORAGE_PURGE_FAILED',
        expect.any(String),
        expect.any(Object),
        'cid'
      )
    })
    it('returns false for empty path without calling remove', async () => {
      const from = vi.fn()
      const supabase = { storage: { from } }
      const ok = await purgeStatementObject(supabase as any, '  ', 'c', mockLogger)
      expect(ok).toBe(false)
      expect(from).not.toHaveBeenCalled()
    })
  })
})
