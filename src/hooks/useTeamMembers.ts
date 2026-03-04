import { useAuth } from '@clerk/clerk-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createWorkspaceRepository } from '@/data/workspaces';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import type { WorkspaceRole } from '@/contracts/workspaces';

const repo = createWorkspaceRepository();

export function useTeamMembers() {
  const { getToken } = useAuth();
  const { activeWorkspaceId } = useWorkspace();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['teamMembers', activeWorkspaceId],
    enabled: Boolean(activeWorkspaceId && getToken),
    queryFn: async () => {
      if (!activeWorkspaceId) return { data: [] };
      const { data, error } = await repo.listMembers(activeWorkspaceId, getToken!);
      if (error) throw new Error(error.error);
      return { data: data ?? [] };
    },
  });

  const updateRole = useMutation({
    mutationFn: async ({
      membershipId,
      role,
    }: {
      membershipId: string;
      role: WorkspaceRole;
    }) => {
      const { data, error } = await repo.updateMemberRole(
        membershipId,
        role,
        getToken!
      );
      if (error) throw new Error(error.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teamMembers', activeWorkspaceId] });
    },
  });

  const removeMember = useMutation({
    mutationFn: async (membershipId: string) => {
      const { error } = await repo.removeMember(membershipId, getToken!);
      if (error) throw new Error(error.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teamMembers', activeWorkspaceId] });
    },
  });

  return {
    members: query.data?.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    updateRole,
    removeMember,
  };
}
