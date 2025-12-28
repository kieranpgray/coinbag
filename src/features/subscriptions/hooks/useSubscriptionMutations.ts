import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@clerk/clerk-react';
import { createSubscriptionsRepository } from '@/data/subscriptions/repo';
import type { Subscription } from '@/types/domain';

/**
 * Custom hook for subscription mutations
 */
export function useSubscriptionMutations() {
  const queryClient = useQueryClient();
  const { getToken } = useAuth();
  const repository = createSubscriptionsRepository();

  const createMutation = useMutation({
    mutationFn: async (data: Omit<Subscription, 'id'>) => {
      const result = await repository.create(data, getToken);
      if (result.error) throw result.error;
      return result.data!;
    },
    onSuccess: (newSubscription) => {
      // Invalidate and refetch subscription queries
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });

      // Optimistically add to cache
      queryClient.setQueryData<Subscription[]>(
        ['subscriptions'],
        (oldData) => oldData ? [...oldData, newSubscription] : [newSubscription]
      );
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Subscription> }) => {
      const result = await repository.update(id, data, getToken);
      if (result.error) throw result.error;
      return result.data!;
    },
    onSuccess: (updatedSubscription, variables) => {
      // Update cache optimistically
      queryClient.setQueryData<Subscription[]>(
        ['subscriptions'],
        (oldData) =>
          oldData?.map((sub) =>
            sub.id === variables.id ? updatedSubscription : sub
          ) || []
      );

      // Update individual subscription cache
      queryClient.setQueryData(['subscriptions', variables.id], updatedSubscription);

      // Invalidate dashboard
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const result = await repository.remove(id, getToken);
      if (result.error) throw result.error;
    },
    onSuccess: (_, deletedId) => {
      // Remove from cache optimistically
      queryClient.setQueryData<Subscription[]>(
        ['subscriptions'],
        (oldData) => oldData?.filter((sub) => sub.id !== deletedId) || []
      );

      // Remove individual subscription cache
      queryClient.removeQueries({ queryKey: ['subscriptions', deletedId] });

      // Invalidate dashboard
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  return {
    create: createMutation,
    update: updateMutation,
    delete: deleteMutation,
    isLoading: createMutation.isPending || updateMutation.isPending || deleteMutation.isPending,
  };
}

