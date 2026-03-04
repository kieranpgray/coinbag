import { createAuthenticatedSupabaseClient, getUserIdFromToken } from '@/lib/supabaseClient';
import type { WorkspaceRepository, WorkspaceWithMembership } from './repo';
import type {
  WorkspaceMembership,
  WorkspaceInvitation,
  WorkspaceRole,
} from '@/contracts/workspaces';

function mapMembershipRow(row: Record<string, unknown>): WorkspaceMembership {
  return {
    id: row.id as string,
    workspaceId: row.workspace_id as string,
    userId: row.user_id as string,
    role: row.role as WorkspaceRole,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function mapInvitationRow(row: Record<string, unknown>): WorkspaceInvitation {
  return {
    id: row.id as string,
    workspaceId: row.workspace_id as string,
    email: row.email as string,
    role: row.role as WorkspaceRole,
    token: (row.token as string) ?? '',
    expiresAt: row.expires_at as string,
    acceptedAt: (row.accepted_at as string | null) ?? null,
    invitedBy: row.invited_by as string,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export class SupabaseWorkspaceRepository implements WorkspaceRepository {
  async listMemberships(
    getToken: () => Promise<string | null>
  ): Promise<{
    data?: WorkspaceWithMembership[];
    error?: { error: string; code: string };
  }> {
    try {
      const supabase = await createAuthenticatedSupabaseClient(getToken);

      const { data: memberships, error: membershipsError } = await supabase
        .from('workspace_memberships')
        .select('id, workspace_id, user_id, role, created_at, updated_at')
        .order('created_at', { ascending: true });

      if (membershipsError) {
        return {
          error: {
            error: membershipsError.message,
            code: membershipsError.code ?? 'UNKNOWN',
          },
        };
      }

      if (!memberships?.length) {
        return { data: [] };
      }

      const workspaceIds = [...new Set(memberships.map((m) => m.workspace_id))];
      const { data: workspaces, error: workspacesError } = await supabase
        .from('workspaces')
        .select('id, name, created_by, created_at, updated_at')
        .in('id', workspaceIds);

      if (workspacesError) {
        return {
          error: {
            error: workspacesError.message,
            code: workspacesError.code ?? 'UNKNOWN',
          },
        };
      }

      const workspaceMap = new Map(
        (workspaces ?? []).map((w) => [
          w.id,
          {
            id: w.id,
            name: w.name,
            createdBy: w.created_by,
            createdAt: w.created_at,
            updatedAt: w.updated_at,
          },
        ])
      );

      const result: WorkspaceWithMembership[] = (memberships ?? []).map((m) => {
        const ws = workspaceMap.get(m.workspace_id);
        if (!ws) return null;
        return {
          ...ws,
          role: m.role as WorkspaceRole,
          membershipId: m.id,
        };
      }).filter(Boolean) as WorkspaceWithMembership[];

      return { data: result };
    } catch (err) {
      return {
        error: {
          error: err instanceof Error ? err.message : 'Failed to list memberships',
          code: 'UNKNOWN',
        },
      };
    }
  }

  async listMembers(
    workspaceId: string,
    getToken: () => Promise<string | null>
  ): Promise<{
    data?: WorkspaceMembership[];
    error?: { error: string; code: string };
  }> {
    try {
      const supabase = await createAuthenticatedSupabaseClient(getToken);

      const { data, error } = await supabase
        .from('workspace_memberships')
        .select('id, workspace_id, user_id, role, created_at, updated_at')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: true });

      if (error) {
        return {
          error: { error: error.message, code: error.code ?? 'UNKNOWN' },
        };
      }

      return {
        data: (data ?? []).map(mapMembershipRow),
      };
    } catch (err) {
      return {
        error: {
          error: err instanceof Error ? err.message : 'Failed to list members',
          code: 'UNKNOWN',
        },
      };
    }
  }

  async updateMemberRole(
    membershipId: string,
    role: WorkspaceRole,
    getToken: () => Promise<string | null>
  ): Promise<{
    data?: WorkspaceMembership;
    error?: { error: string; code: string };
  }> {
    try {
      const supabase = await createAuthenticatedSupabaseClient(getToken);

      const { data, error } = await supabase
        .from('workspace_memberships')
        .update({ role })
        .eq('id', membershipId)
        .select('id, workspace_id, user_id, role, created_at, updated_at')
        .single();

      if (error) {
        return {
          error: { error: error.message, code: error.code ?? 'UNKNOWN' },
        };
      }

      return { data: data ? mapMembershipRow(data) : undefined };
    } catch (err) {
      return {
        error: {
          error: err instanceof Error ? err.message : 'Failed to update role',
          code: 'UNKNOWN',
        },
      };
    }
  }

  async removeMember(
    membershipId: string,
    getToken: () => Promise<string | null>
  ): Promise<{ error?: { error: string; code: string } }> {
    try {
      const supabase = await createAuthenticatedSupabaseClient(getToken);

      const { error } = await supabase
        .from('workspace_memberships')
        .delete()
        .eq('id', membershipId);

      if (error) {
        return {
          error: { error: error.message, code: error.code ?? 'UNKNOWN' },
        };
      }

      return {};
    } catch (err) {
      return {
        error: {
          error: err instanceof Error ? err.message : 'Failed to remove member',
          code: 'UNKNOWN',
        },
      };
    }
  }

  async listInvitations(
    workspaceId: string,
    getToken: () => Promise<string | null>
  ): Promise<{
    data?: WorkspaceInvitation[];
    error?: { error: string; code: string };
  }> {
    try {
      const supabase = await createAuthenticatedSupabaseClient(getToken);

      const { data, error } = await supabase
        .from('workspace_invitations')
        .select('id, workspace_id, email, role, expires_at, accepted_at, invited_by, created_at, updated_at')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false });

      if (error) {
        return {
          error: { error: error.message, code: error.code ?? 'UNKNOWN' },
        };
      }

      return {
        data: (data ?? []).map(mapInvitationRow),
      };
    } catch (err) {
      return {
        error: {
          error: err instanceof Error ? err.message : 'Failed to list invitations',
          code: 'UNKNOWN',
        },
      };
    }
  }

  async createInvitation(
    workspaceId: string,
    email: string,
    role: WorkspaceRole,
    getToken: () => Promise<string | null>
  ): Promise<{
    data?: WorkspaceInvitation;
    error?: { error: string; code: string };
  }> {
    try {
      const supabase = await createAuthenticatedSupabaseClient(getToken);

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      const invitedBy = await getUserIdFromToken(getToken);
      if (!invitedBy) {
        return {
          error: { error: 'Authentication required', code: 'AUTH_EXPIRED' },
        };
      }

      const { data, error } = await supabase
        .from('workspace_invitations')
        .insert({
          workspace_id: workspaceId,
          email: email.trim().toLowerCase(),
          role,
          token: crypto.randomUUID() + crypto.randomUUID().replace(/-/g, ''),
          expires_at: expiresAt.toISOString(),
          invited_by: invitedBy,
        })
        .select('id, workspace_id, email, role, token, expires_at, accepted_at, invited_by, created_at, updated_at')
        .single();

      if (error) {
        return {
          error: { error: error.message, code: error.code ?? 'UNKNOWN' },
        };
      }

      if (!data) return {};

      return { data: mapInvitationRow(data) };
    } catch (err) {
      return {
        error: {
          error: err instanceof Error ? err.message : 'Failed to create invitation',
          code: 'UNKNOWN',
        },
      };
    }
  }

  async revokeInvitation(
    invitationId: string,
    getToken: () => Promise<string | null>
  ): Promise<{ error?: { error: string; code: string } }> {
    try {
      const supabase = await createAuthenticatedSupabaseClient(getToken);

      const { error } = await supabase
        .from('workspace_invitations')
        .delete()
        .eq('id', invitationId);

      if (error) {
        return {
          error: { error: error.message, code: error.code ?? 'UNKNOWN' },
        };
      }

      return {};
    } catch (err) {
      return {
        error: {
          error: err instanceof Error ? err.message : 'Failed to revoke invitation',
          code: 'UNKNOWN',
        },
      };
    }
  }
}
