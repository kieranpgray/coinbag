/**
 * Permission helpers for workspace role-based access control
 * Role matrix: admin (full), edit (read+write), read (view-only)
 */

import type { WorkspaceRole } from '@/contracts/workspaces';

/** Can view data (all roles) */
export function canView(_role: WorkspaceRole): boolean {
  return true;
}

/** Can create/update/delete domain data (admin, edit) */
export function canEdit(role: WorkspaceRole): boolean {
  return role === 'admin' || role === 'edit';
}

/** Can manage members, invites, workspace settings (admin only) */
export function canAdmin(role: WorkspaceRole): boolean {
  return role === 'admin';
}
