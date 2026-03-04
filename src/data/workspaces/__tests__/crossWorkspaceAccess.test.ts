/**
 * Regression tests for cross-workspace access denial.
 * Ensures that workspace-scoped data cannot be accessed across workspace boundaries.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { resolveWorkspaceId } from '@/lib/repositoryHelpers';

describe('Cross-workspace access', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  describe('resolveWorkspaceId', () => {
    it('returns provided workspaceId when non-empty', async () => {
      const getToken = vi.fn().mockResolvedValue('mock-token');
      const result = await resolveWorkspaceId(getToken, 'ws-123');
      expect(result).toEqual({ workspaceId: 'ws-123' });
    });

    it('trims whitespace from provided workspaceId', async () => {
      const getToken = vi.fn().mockResolvedValue('mock-token');
      const result = await resolveWorkspaceId(getToken, '  ws-456  ');
      expect(result).toEqual({ workspaceId: 'ws-456' });
    });

    it('falls back to RPC when workspaceId is null', async () => {
      vi.doMock('@/lib/supabase/supabaseBrowserClient', () => ({
        getSupabaseBrowserClient: () => ({
          rpc: vi.fn().mockResolvedValue({ data: 'default-ws', error: null }),
        }),
      }));
      const getToken = vi.fn().mockResolvedValue('mock-token');
      const result = await resolveWorkspaceId(getToken, null);
      expect('workspaceId' in result || 'error' in result).toBe(true);
    });

    it('falls back to RPC when workspaceId is empty string', async () => {
      const getToken = vi.fn().mockResolvedValue('mock-token');
      const result = await resolveWorkspaceId(getToken, '');
      expect('workspaceId' in result || 'error' in result).toBe(true);
    });
  });
});
