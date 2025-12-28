import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@clerk/clerk-react';
import { createSubscriptionsRepository } from '@/data/subscriptions/repo';
import type { Subscription } from '@/types/domain';
import {
  addSubscriptionOptimistically,
  updateSubscriptionOptimistically,
  removeSubscriptionOptimistically,
} from '@/features/dashboard/utils/optimisticUpdates';

export function useSubscriptions() {
  const { getToken } = useAuth();
  const repository = createSubscriptionsRepository();

  return useQuery({
    queryKey: ['subscriptions'],
    queryFn: async () => {
      const result = await repository.list(getToken);
      if (result.error) {
        throw result.error;
      }
      return result.data;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes - improves performance by reducing refetches
    gcTime: 1000 * 60 * 10, // 10 minutes - keep cached data longer
  });
}

export function useSubscription(id: string) {
  const { getToken } = useAuth();
  const repository = createSubscriptionsRepository();

  return useQuery({
    queryKey: ['subscriptions', id],
    queryFn: async () => {
      const result = await repository.get(id, getToken);
      if (result.error) {
        if (result.error.code === 'NOT_FOUND') {
          return undefined;
        }
        throw result.error;
      }
      return result.data;
    },
    enabled: !!id,
  });
}

export function useCreateSubscription() {
  const queryClient = useQueryClient();
  const { getToken } = useAuth();
  const repository = createSubscriptionsRepository();

  return useMutation({
    mutationFn: async (data: Omit<Subscription, 'id'>) => {
      const result = await repository.create(data, getToken);
      if (result.error) {
        throw result.error;
      }
      return result.data!;
    },
    onSuccess: (newSubscription) => {
      // Optimistically update dashboard cache instead of invalidating
      addSubscriptionOptimistically(queryClient, newSubscription);
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useUpdateSubscription() {
  const queryClient = useQueryClient();
  const { getToken } = useAuth();
  const repository = createSubscriptionsRepository();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Omit<Subscription, 'id'>> }) => {
      const result = await repository.update(id, data, getToken);
      if (result.error) {
        throw result.error;
      }
      return result.data!;
    },
    onSuccess: (updatedSubscription) => {
      // Optimistically update dashboard cache instead of invalidating
      updateSubscriptionOptimistically(queryClient, updatedSubscription);
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['subscriptions', updatedSubscription.id] });
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useDeleteSubscription() {
  const queryClient = useQueryClient();
  const { getToken } = useAuth();
  const repository = createSubscriptionsRepository();

  return useMutation({
    mutationFn: async (id: string) => {
      const result = await repository.remove(id, getToken);
      if (result.error) {
        throw result.error;
      }
    },
    onSuccess: (_, deletedId) => {
      // Optimistically update dashboard cache instead of invalidating
      removeSubscriptionOptimistically(queryClient, deletedId);
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}
