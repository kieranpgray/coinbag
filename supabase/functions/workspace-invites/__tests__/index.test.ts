/**
 * Unit tests for workspace-invites handleCreate and handleAccept
 *
 * Tests use mocked Supabase client and Clerk API (fetch).
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock Deno.env before any imports that use it
const mockEnvGet = vi.fn();
(globalThis as any).Deno = { env: { get: mockEnvGet } };

// Mock fetch for Clerk API calls
const mockFetch = vi.fn();
global.fetch = mockFetch as any;

// Mock serve to avoid starting HTTP server when index loads
vi.mock('https://deno.land/std@0.168.0/http/server.ts', () => ({ serve: vi.fn() }));
vi.mock('https://esm.sh/@supabase/supabase-js@2', () => ({ createClient: vi.fn() }));

import { handleCreate, handleAccept } from '../index.ts';

/** Creates a chainable mock that returns { data, error } from single() or maybeSingle() */
function chainMock(result: { data: unknown; error: unknown }) {
  const chain = {
    eq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(result),
    maybeSingle: vi.fn().mockResolvedValue(result),
    update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
    insert: vi.fn().mockResolvedValue({ error: null }),
  };
  return {
    select: vi.fn().mockReturnValue(chain),
    ...chain,
  };
}

/** Creates mock Supabase that returns different results per table */
function createMockSupabase(config: {
  membership?: { data: unknown; error: unknown };
  existingMember?: { data: unknown; error: unknown };
  existingInvite?: { data: unknown; error: unknown };
  insertError?: unknown;
  updateError?: unknown;
  rpcResult?: { data: unknown; error: unknown };
} = {}) {
  const {
    membership = { data: { id: 'm1' }, error: null },
    existingMember = { data: null, error: null },
    existingInvite = { data: null, error: null },
    insertError = null,
    updateError = null,
    rpcResult = { data: { ok: true, workspace_id: 'ws1', role: 'edit' }, error: null },
  } = config;

  let membershipCallIndex = 0;
  const membershipResults = [membership, existingMember];

  const from = vi.fn((table: string) => {
    if (table === 'workspace_memberships') {
      const result = membershipResults[membershipCallIndex % 2];
      membershipCallIndex++;
      return chainMock(result);
    }
    if (table === 'workspace_invitations') {
      const inviteChain = chainMock(existingInvite);
      inviteChain.update = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: updateError }),
      });
      inviteChain.insert = vi.fn().mockResolvedValue({ error: insertError });
      return inviteChain;
    }
    return chainMock({ data: null, error: null });
  });

  const rpc = vi.fn().mockResolvedValue(rpcResult);

  return { from, rpc };
}

async function parseJsonResponse(res: Response) {
  return res.json();
}

describe('workspace-invites handleCreate', () => {
  const validWorkspaceId = '550e8400-e29b-41d4-a716-446655440000';
  const userId = 'user_abc123';

  beforeEach(() => {
    vi.clearAllMocks();
    mockEnvGet.mockImplementation((key: string) =>
      key === 'CLERK_SECRET_KEY' ? 'sk_test_xxx' : undefined
    );
    mockFetch.mockReset();
  });

  it('returns 400 when workspace_id is missing', async () => {
    const supabase = createMockSupabase();
    const res = await handleCreate(
      { action: 'create', workspace_id: '', email: 'a@b.com' },
      supabase as any,
      userId
    );
    expect(res.status).toBe(400);
    const body = await parseJsonResponse(res);
    expect(body.error).toContain('workspace_id');
  });

  it('returns 400 when workspace_id is not a valid UUID', async () => {
    const supabase = createMockSupabase();
    const res = await handleCreate(
      { action: 'create', workspace_id: 'not-a-uuid', email: 'a@b.com' },
      supabase as any,
      userId
    );
    expect(res.status).toBe(400);
    const body = await parseJsonResponse(res);
    expect(body.error).toContain('workspace_id');
  });

  it('returns 400 when email is missing', async () => {
    const supabase = createMockSupabase();
    const res = await handleCreate(
      { action: 'create', workspace_id: validWorkspaceId, email: '' },
      supabase as any,
      userId
    );
    expect(res.status).toBe(400);
    const body = await parseJsonResponse(res);
    expect(body.error).toBeDefined();
  });

  it('returns 403 when user is not workspace admin', async () => {
    const supabase = createMockSupabase({
      membership: { data: null, error: { message: 'Not found' } },
    });
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ data: [] }) });

    const res = await handleCreate(
      { action: 'create', workspace_id: validWorkspaceId, email: 'invitee@b.com' },
      supabase as any,
      userId
    );
    expect(res.status).toBe(403);
    const body = await parseJsonResponse(res);
    expect(body.error).toContain('admin');
  });

  it('returns 503 when Clerk API fails (5xx)', async () => {
    mockEnvGet.mockReturnValue('sk_test_xxx');
    mockFetch.mockImplementation(() => Promise.reject(new Error('Clerk API unavailable')));
    const supabase = createMockSupabase();

    const res = await handleCreate(
      { action: 'create', workspace_id: validWorkspaceId, email: 'invitee@b.com' },
      supabase as any,
      userId
    );
    expect(mockFetch).toHaveBeenCalled();
    expect(res.status).toBe(503);
    const body = await parseJsonResponse(res);
    expect(body.error).toContain('Clerk');
  });

  it('returns 201 when create succeeds (no existing invite)', async () => {
    mockFetch.mockImplementation(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({ data: [] }),
      } as unknown as Response)
    );
    const supabase = createMockSupabase();

    const res = await handleCreate(
      { action: 'create', workspace_id: validWorkspaceId, email: 'invitee@b.com' },
      supabase as any,
      userId
    );
    expect(res.status).toBe(201);
    const body = await parseJsonResponse(res);
    expect(body.success).toBe(true);
    expect(body.action).toBe('create');
  });

  it('returns 400 for invalid role', async () => {
    const supabase = createMockSupabase();
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ data: [] }) });

    const res = await handleCreate(
      { action: 'create', workspace_id: validWorkspaceId, email: 'a@b.com', role: 'invalid' as any },
      supabase as any,
      userId
    );
    expect(res.status).toBe(400);
    const body = await parseJsonResponse(res);
    expect(body.error).toContain('role');
  });

  it('returns 200 with action resend when pending invite exists for same email', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ data: [] }) });
    const supabase = createMockSupabase({
      existingInvite: { data: { id: 'inv-existing' }, error: null },
    });

    const res = await handleCreate(
      { action: 'create', workspace_id: validWorkspaceId, email: 'resend@b.com', role: 'edit' },
      supabase as any,
      userId
    );
    expect(res.status).toBe(200);
    const body = await parseJsonResponse(res);
    expect(body.success).toBe(true);
    expect(body.action).toBe('resend');
  });

  it('returns 503 when CLERK_SECRET_KEY is not set', async () => {
    mockEnvGet.mockReturnValue(undefined);
    const supabase = createMockSupabase();
    const res = await handleCreate(
      { action: 'create', workspace_id: validWorkspaceId, email: 'test@b.com', role: 'edit' },
      supabase as any,
      userId
    );
    expect(res.status).toBe(503);
    const body = await parseJsonResponse(res);
    expect(body.error).toBe('Invite service unavailable');
  });
});

describe('workspace-invites handleAccept', () => {
  const userId = 'user_abc123';

  beforeEach(() => {
    vi.clearAllMocks();
    mockEnvGet.mockImplementation((key: string) =>
      key === 'CLERK_SECRET_KEY' ? 'sk_test_xxx' : undefined
    );
    mockFetch.mockReset();
  });

  it('returns 400 when token is missing', async () => {
    const supabase = createMockSupabase();
    const res = await handleAccept({ action: 'accept', token: '' }, supabase as any, userId);
    expect(res.status).toBe(400);
    const body = await parseJsonResponse(res);
    expect(body.error).toContain('token');
  });

  it('returns 500 when CLERK_SECRET_KEY is not set', async () => {
    mockEnvGet.mockReturnValue(undefined);
    const supabase = createMockSupabase();
    const res = await handleAccept({ action: 'accept', token: 'valid-token' }, supabase as any, userId);
    expect(res.status).toBe(500);
    const body = await parseJsonResponse(res);
    expect(body.error).toContain('configuration');
  });

  it('returns 404 when invite is not found', async () => {
    const supabase = createMockSupabase({
      existingInvite: { data: null, error: { message: 'Not found' } },
    });

    const res = await handleAccept({ action: 'accept', token: 'bad-token' }, supabase as any, userId);
    expect(res.status).toBe(404);
    const body = await parseJsonResponse(res);
    expect(body.error).toContain('invitation');
  });

  it('returns 404 when Clerk user not found', async () => {
    mockEnvGet.mockReturnValue('sk_test_xxx');
    mockFetch.mockImplementation(() =>
      Promise.resolve({ ok: false, status: 404 } as Response)
    );
    const supabase = createMockSupabase({
      existingInvite: {
        data: { id: 'inv1', email: 'user@example.com', workspace_id: 'ws1' },
        error: null,
      },
    });

    const res = await handleAccept({ action: 'accept', token: 'valid-token' }, supabase as any, userId);
    expect(mockFetch).toHaveBeenCalled();
    expect(res.status).toBe(404);
    const body = await parseJsonResponse(res);
    expect(body.error).toContain('User not found');
  });

  it('returns 503 when Clerk API fails (5xx)', async () => {
    mockEnvGet.mockReturnValue('sk_test_xxx');
    mockFetch.mockImplementation(() =>
      Promise.resolve({ ok: false, status: 503 } as Response)
    );
    const supabase = createMockSupabase({
      existingInvite: {
        data: { id: 'inv1', email: 'user@example.com', workspace_id: 'ws1' },
        error: null,
      },
    });

    const res = await handleAccept({ action: 'accept', token: 'valid-token' }, supabase as any, userId);
    expect(mockFetch).toHaveBeenCalled();
    expect(res.status).toBe(503);
    const body = await parseJsonResponse(res);
    expect(body.error).toContain('Clerk');
  });

  it('returns 403 when email does not match invite', async () => {
    mockFetch.mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: async () => ({
          id: userId,
          email_addresses: [
            { email_address: 'other@example.com', verification: { status: 'verified' } },
          ],
        }),
      } as unknown as Response)
    );
    const supabase = createMockSupabase({
      existingInvite: {
        data: { id: 'inv1', email: 'user@example.com', workspace_id: 'ws1' },
        error: null,
      },
    });

    const res = await handleAccept({ action: 'accept', token: 'valid-token' }, supabase as any, userId);
    expect(res.status).toBe(403);
    const body = await parseJsonResponse(res);
    expect(body.error).toContain('verified');
  });

  it('returns 200 when accept succeeds', async () => {
    mockFetch.mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: async () => ({
          id: userId,
          email_addresses: [
            { email_address: 'user@example.com', verification: { status: 'verified' } },
          ],
        }),
      } as unknown as Response)
    );
    const supabase = createMockSupabase({
      existingInvite: {
        data: { id: 'inv1', email: 'user@example.com', workspace_id: 'ws1' },
        error: null,
      },
    });

    const res = await handleAccept({ action: 'accept', token: 'valid-token' }, supabase as any, userId);
    expect(res.status).toBe(200);
    const body = await parseJsonResponse(res);
    expect(body.success).toBe(true);
    expect(body.workspace_id).toBe('ws1');
    expect(body.role).toBe('edit');
  });

  it('returns 400 when invite already accepted (replay)', async () => {
    mockFetch.mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: async () => ({
          id: userId,
          email_addresses: [
            { email_address: 'user@example.com', verification: { status: 'verified' } },
          ],
        }),
      } as unknown as Response)
    );
    const supabase = createMockSupabase({
      existingInvite: {
        data: { id: 'inv1', email: 'user@example.com', workspace_id: 'ws1' },
        error: null,
      },
      rpcResult: { data: { ok: false, error: 'Invitation already accepted' }, error: null },
    });

    const res = await handleAccept({ action: 'accept', token: 'replay-token' }, supabase as any, userId);
    expect(res.status).toBe(400);
    const body = await parseJsonResponse(res);
    expect(body.error).toContain('accepted');
  });

  it('returns 400 when invite expired', async () => {
    mockFetch.mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: async () => ({
          id: userId,
          email_addresses: [
            { email_address: 'user@example.com', verification: { status: 'verified' } },
          ],
        }),
      } as unknown as Response)
    );
    const supabase = createMockSupabase({
      existingInvite: {
        data: { id: 'inv1', email: 'user@example.com', workspace_id: 'ws1' },
        error: null,
      },
      rpcResult: { data: { ok: false, error: 'Invitation has expired' }, error: null },
    });

    const res = await handleAccept({ action: 'accept', token: 'expired-token' }, supabase as any, userId);
    expect(res.status).toBe(400);
    const body = await parseJsonResponse(res);
    expect(body.error).toMatch(/expired|invitation/i);
  });
});
