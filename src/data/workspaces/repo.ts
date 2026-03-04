/**
 * Workspace repository interface
 */

import type {
  Workspace,
  WorkspaceMembership,
  WorkspaceInvitation,
  WorkspaceRole,
} from '@/contracts/workspaces';

export interface WorkspaceWithMembership extends Workspace {
  role: WorkspaceRole;
  membershipId: string;
}

export interface WorkspaceRepository {
  /** List workspaces the user is a member of */
  listMemberships(
    getToken: () => Promise<string | null>
  ): Promise<{
    data?: WorkspaceWithMembership[];
    error?: { error: string; code: string };
  }>;

  /** List members of a workspace */
  listMembers(
    workspaceId: string,
    getToken: () => Promise<string | null>
  ): Promise<{
    data?: WorkspaceMembership[];
    error?: { error: string; code: string };
  }>;

  /** Update a member's role (admin only) */
  updateMemberRole(
    membershipId: string,
    role: WorkspaceRole,
    getToken: () => Promise<string | null>
  ): Promise<{
    data?: WorkspaceMembership;
    error?: { error: string; code: string };
  }>;

  /** Remove a member (admin only) */
  removeMember(
    membershipId: string,
    getToken: () => Promise<string | null>
  ): Promise<{
    error?: { error: string; code: string };
  }>;

  /** List pending invitations for a workspace */
  listInvitations(
    workspaceId: string,
    getToken: () => Promise<string | null>
  ): Promise<{
    data?: WorkspaceInvitation[];
    error?: { error: string; code: string };
  }>;

  /** Create an invitation (admin only) */
  createInvitation(
    workspaceId: string,
    email: string,
    role: WorkspaceRole,
    getToken: () => Promise<string | null>
  ): Promise<{
    data?: WorkspaceInvitation;
    error?: { error: string; code: string };
  }>;

  /** Revoke an invitation (admin only) */
  revokeInvitation(
    invitationId: string,
    getToken: () => Promise<string | null>
  ): Promise<{
    error?: { error: string; code: string };
  }>;
}
