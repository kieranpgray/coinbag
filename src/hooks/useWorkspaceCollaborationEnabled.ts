/**
 * Hook to check if workspace collaboration is enabled for the current user.
 * Combines feature flag and rollout stage (internal/percentage/full).
 */

import { useUser } from '@clerk/clerk-react';
import { isFeatureEnabled } from '@/lib/featureFlags';
import { isWorkspaceCollaborationEnabledForUser } from '@/lib/workspaceCollaborationConfig';

export function useWorkspaceCollaborationEnabled(): boolean {
  const { user, isLoaded } = useUser();

  if (!isLoaded) return false;
  if (!isFeatureEnabled('workspace_collaboration')) return false;

  return isWorkspaceCollaborationEnabledForUser(user?.id);
}
