import { useAuth } from '@clerk/clerk-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createWorkspaceRepository } from '@/data/workspaces';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { createWorkspaceInvite } from '@/lib/workspaceInvitesApi';
import type { WorkspaceRole } from '@/contracts/workspaces';

const repo = createWorkspaceRepository();

export function useTeamInvitations() {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const { activeWorkspaceId } = useWorkspace();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['teamInvitations', activeWorkspaceId],
    enabled: Boolean(activeWorkspaceId && isLoaded && isSignedIn),
    queryFn: async () => {
      if (!activeWorkspaceId) return { data: [] };
      const { data, error } = await repo.listInvitations(
        activeWorkspaceId,
        getToken!
      );
      if (error) throw new Error(error.error);
      return { data: data ?? [] };
    },
  });

  const createInvitation = useMutation({
    mutationFn: async ({
      email,
      role,
    }: {
      email: string;
      role: WorkspaceRole;
    }) => {
      if (!isLoaded || !isSignedIn) throw new Error('Authentication required');
      if (!activeWorkspaceId) throw new Error('No workspace selected');
      const result = await createWorkspaceInvite(
        getToken!,
        activeWorkspaceId,
        email,
        role
      );
      if (!result.success) {
        throw new Error(result.error ?? 'Failed to create invite');
      }
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['teamInvitations', activeWorkspaceId],
      });
    },
  });

  const revokeInvitation = useMutation({
    mutationFn: async (invitationId: string) => {
      if (!isLoaded || !isSignedIn) throw new Error('Authentication required');
      const { error } = await repo.revokeInvitation(invitationId, getToken!);
      if (error) throw new Error(error.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['teamInvitations', activeWorkspaceId],
      });
    },
  });

  return {
    invitations: query.data?.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    createInvitation,
    revokeInvitation,
  };
}
