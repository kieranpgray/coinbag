/**
 * Role matrix tests for useCanEdit - admin/edit/read.
 * TDD: Verifies canEdit from permissionHelpers via useCanEdit hook.
 */

import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useCanEdit } from '../useCanEdit';

vi.mock('@/contexts/WorkspaceContext', () => ({
  useWorkspace: vi.fn(),
}));

import { useWorkspace } from '@/contexts/WorkspaceContext';

const baseWorkspace = {
  activeWorkspaceId: 'ws-1',
  activeWorkspace: { id: 'ws-1', name: 'Test', role: 'admin' as const },
  memberships: [],
  isLoading: false,
  error: null,
  setActiveWorkspaceId: vi.fn(),
  refetch: vi.fn(),
};

describe('useCanEdit role matrix', () => {
  it('returns true when role is admin', () => {
    vi.mocked(useWorkspace).mockReturnValue({
      ...baseWorkspace,
      currentRole: 'admin',
    } as any);
    const { result } = renderHook(() => useCanEdit());
    expect(result.current).toBe(true);
  });

  it('returns true when role is edit', () => {
    vi.mocked(useWorkspace).mockReturnValue({
      ...baseWorkspace,
      currentRole: 'edit',
    } as any);
    const { result } = renderHook(() => useCanEdit());
    expect(result.current).toBe(true);
  });

  it('returns false when role is read', () => {
    vi.mocked(useWorkspace).mockReturnValue({
      ...baseWorkspace,
      currentRole: 'read',
    } as any);
    const { result } = renderHook(() => useCanEdit());
    expect(result.current).toBe(false);
  });

  it('returns false when currentRole is null', () => {
    vi.mocked(useWorkspace).mockReturnValue({
      ...baseWorkspace,
      currentRole: null,
    } as any);
    const { result } = renderHook(() => useCanEdit());
    expect(result.current).toBe(false);
  });
});
