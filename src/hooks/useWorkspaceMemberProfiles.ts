import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@clerk/clerk-react';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { isFeatureEnabled } from '@/lib/featureFlags';
import {
  fetchWorkspaceMemberProfiles,
  WORKSPACE_MEMBER_PROFILES_QUERY_KEY,
} from '@/lib/workspaceMemberProfilesApi';

const STALE_MS = 2 * 60 * 1000;

export function useWorkspaceMemberProfiles() {
  const { getToken } = useAuth();
  const { activeWorkspaceId } = useWorkspace();
  const accountMenuV2Enabled = isFeatureEnabled('account_menu_v2');

  return useQuery({
    queryKey: [WORKSPACE_MEMBER_PROFILES_QUERY_KEY, activeWorkspaceId],
    queryFn: async () => {
      if (!activeWorkspaceId || !getToken) {
        throw new Error('No workspace');
      }
      return fetchWorkspaceMemberProfiles(getToken, activeWorkspaceId);
    },
    enabled: accountMenuV2Enabled && Boolean(activeWorkspaceId && getToken),
    staleTime: STALE_MS,
  });
}
