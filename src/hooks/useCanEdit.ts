/**
 * Hook to check if the current user can edit (create/update/delete) in the active workspace.
 * Use for graceful UX blocks when role is read-only.
 */

import { useWorkspace } from '@/contexts/WorkspaceContext';
import { canEdit } from '@/lib/permissionHelpers';

export function useCanEdit(): boolean {
  const { currentRole } = useWorkspace();
  return currentRole ? canEdit(currentRole) : false;
}
