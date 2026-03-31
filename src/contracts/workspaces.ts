import { z } from 'zod';

/**
 * Workspace contracts - types for workspaces, memberships, and invitations
 */

export const workspaceRoleSchema = z.enum(['admin', 'edit', 'read']);
export type WorkspaceRole = z.infer<typeof workspaceRoleSchema>;

export const workspaceSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  createdBy: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const workspaceMembershipSchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  userId: z.string(),
  role: workspaceRoleSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const workspaceInvitationSchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  email: z.string().email(),
  role: workspaceRoleSchema,
  token: z.string().optional(),
  expiresAt: z.string(),
  acceptedAt: z.string().nullable(),
  invitedBy: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Workspace = z.infer<typeof workspaceSchema>;
export type WorkspaceMembership = z.infer<typeof workspaceMembershipSchema>;
export type WorkspaceInvitation = z.infer<typeof workspaceInvitationSchema>;

export const LAST_USED_WORKSPACE_KEY = 'wellthy_last_used_workspace_id';

/** Clerk-backed display fields for team list (edge function response). No email. */
export interface WorkspaceMemberProfile {
  userId: string;
  imageUrl: string | null;
  firstName: string | null;
  lastName: string | null;
}

