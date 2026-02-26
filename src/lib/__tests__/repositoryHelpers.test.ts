import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getDefaultWorkspaceIdForUser, ensureUserIdForInsert } from '../repositoryHelpers';

// Mock supabase client for getDefaultWorkspaceIdForUser
const mockRpc = vi.fn();
vi.mock('../supabase/supabaseBrowserClient', () => ({
  getSupabaseBrowserClient: vi.fn(() => ({
    rpc: mockRpc,
  })),
}));

// Mock getUserIdFromToken for ensureUserIdForInsert
const mockGetUserIdFromToken = vi.fn();
vi.mock('../supabaseClient', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../supabaseClient')>();
  return {
    ...actual,
    getUserIdFromToken: (...args: unknown[]) => mockGetUserIdFromToken(...args),
  };
});

describe('repositoryHelpers', () => {
  const mockGetToken = vi.fn().mockResolvedValue('mock-jwt-token');

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetToken.mockResolvedValue('mock-jwt-token');
    mockGetUserIdFromToken.mockResolvedValue('user_2abc123');
  });

  describe('getDefaultWorkspaceIdForUser', () => {
    it('returns workspaceId when RPC succeeds', async () => {
      mockRpc.mockResolvedValue({ data: 'ws-uuid-123', error: null });

      const result = await getDefaultWorkspaceIdForUser(mockGetToken);

      expect(mockRpc).toHaveBeenCalledWith('get_default_workspace_id_for_user', {});
      expect(result).toEqual({ workspaceId: 'ws-uuid-123' });
    });

    it('returns error when RPC fails', async () => {
      mockRpc.mockResolvedValue({
        data: null,
        error: { message: 'RPC failed', code: 'PGRST301' },
      });

      const result = await getDefaultWorkspaceIdForUser(mockGetToken);

      expect(result).toMatchObject({
        error: {
          error: 'Authentication failed. Please sign in again.',
          code: 'AUTH_EXPIRED',
        },
      });
    });

    it('returns error when workspaceId is empty', async () => {
      mockRpc.mockResolvedValue({ data: null, error: null });

      const result = await getDefaultWorkspaceIdForUser(mockGetToken);

      expect(result).toMatchObject({
        error: {
          error: 'No workspace available.',
          code: 'WORKSPACE_NOT_FOUND',
        },
      });
    });
  });

  describe('ensureUserIdForInsert', () => {
    it('returns userId when token is valid', async () => {
      const result = await ensureUserIdForInsert(mockGetToken, 'create category');

      expect(mockGetUserIdFromToken).toHaveBeenCalledWith(mockGetToken);
      expect(result).toEqual({ userId: 'user_2abc123' });
    });

    it('returns error when userId is null', async () => {
      mockGetUserIdFromToken.mockResolvedValue(null);

      const result = await ensureUserIdForInsert(mockGetToken, 'create category');

      expect(result).toMatchObject({
        error: {
          error: 'Authentication failed. Please sign in again.',
          code: 'AUTH_EXPIRED',
        },
      });
    });
  });
});
