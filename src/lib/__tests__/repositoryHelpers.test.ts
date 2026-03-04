import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getDefaultWorkspaceIdForUser, ensureUserIdForInsert, verifyInsertedUserId } from '../repositoryHelpers';

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

// Mock logger for verifyInsertedUserId tests
const mockLoggerError = vi.fn();
const mockLoggerDebug = vi.fn();
vi.mock('../logger', () => ({
  logger: {
    error: (...args: unknown[]) => mockLoggerError(...args),
    debug: (...args: unknown[]) => mockLoggerDebug(...args),
    info: vi.fn(),
    warn: vi.fn(),
  },
  getCorrelationId: vi.fn(() => null),
}));

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

    it('returns error when RPC returns malformed data (object)', async () => {
      mockRpc.mockResolvedValue({ data: { id: 'ws-123' }, error: null });

      const result = await getDefaultWorkspaceIdForUser(mockGetToken);

      expect(result).toMatchObject({
        error: {
          error: 'No workspace available.',
          code: 'WORKSPACE_NOT_FOUND',
        },
      });
    });

    it('returns error when RPC returns malformed data (array)', async () => {
      mockRpc.mockResolvedValue({ data: ['ws-123'], error: null });

      const result = await getDefaultWorkspaceIdForUser(mockGetToken);

      expect(result).toMatchObject({
        error: {
          error: 'No workspace available.',
          code: 'WORKSPACE_NOT_FOUND',
        },
      });
    });

    it('returns error when RPC returns malformed data (number)', async () => {
      mockRpc.mockResolvedValue({ data: 12345, error: null });

      const result = await getDefaultWorkspaceIdForUser(mockGetToken);

      expect(result).toMatchObject({
        error: {
          error: 'No workspace available.',
          code: 'WORKSPACE_NOT_FOUND',
        },
      });
    });

    it('returns error when RPC returns empty string', async () => {
      mockRpc.mockResolvedValue({ data: '', error: null });

      const result = await getDefaultWorkspaceIdForUser(mockGetToken);

      expect(result).toMatchObject({
        error: {
          error: 'No workspace available.',
          code: 'WORKSPACE_NOT_FOUND',
        },
      });
    });

    it('returns error when RPC returns whitespace-only string', async () => {
      mockRpc.mockResolvedValue({ data: '   ', error: null });

      const result = await getDefaultWorkspaceIdForUser(mockGetToken);

      expect(result).toMatchObject({
        error: {
          error: 'No workspace available.',
          code: 'WORKSPACE_NOT_FOUND',
        },
      });
    });
  });

  describe('verifyInsertedUserId', () => {
    beforeEach(() => {
      mockLoggerError.mockClear();
      mockLoggerDebug.mockClear();
    });

    it('does not log error when inserted userId matches expected', () => {
      verifyInsertedUserId(
        { userId: 'user_2abc123', id: 'goal-1' },
        'user_2abc123',
        'create goal',
        'goal-1'
      );

      expect(mockLoggerError).not.toHaveBeenCalled();
    });

    it('logs error when inserted record has null userId', () => {
      verifyInsertedUserId(
        { userId: undefined, id: 'goal-1' },
        'user_2abc123',
        'create goal',
        'goal-1'
      );

      expect(mockLoggerError).toHaveBeenCalledWith(
        'DB:USER_ID_VERIFICATION',
        expect.stringContaining('NULL user_id'),
        expect.any(Object),
        undefined
      );
    });

    it('logs error when inserted userId does not match expected', () => {
      verifyInsertedUserId(
        { userId: 'user_wrong', id: 'goal-1' },
        'user_2abc123',
        'create goal',
        'goal-1'
      );

      expect(mockLoggerError).toHaveBeenCalledWith(
        'DB:USER_ID_VERIFICATION',
        expect.stringContaining('incorrect user_id'),
        expect.objectContaining({
          expectedUserId: 'user_2abc123',
          actualUserId: 'user_wrong',
        }),
        undefined
      );
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
