import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@clerk/clerk-react';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import {
  fetchWorkspaceMemberProfiles,
  WORKSPACE_MEMBER_PROFILES_QUERY_KEY,
} from '@/lib/workspaceMemberProfilesApi';

const STALE_MS = 2 * 60 * 1000;

export function useWorkspaceMemberProfiles() {
  const { getToken } = useAuth();
  const { activeWorkspaceId } = useWorkspace();

  return useQuery({
    queryKey: [WORKSPACE_MEMBER_PROFILES_QUERY_KEY, activeWorkspaceId],
    queryFn: async () => {
      if (!activeWorkspaceId || !getToken) {
        throw new Error('No workspace');
      }
      return fetchWorkspaceMemberProfiles(getToken, activeWorkspaceId);
    },
    enabled: Boolean(activeWorkspaceId && getToken),
    staleTime: STALE_MS,
  });
}
