import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createLiabilitiesRepository } from '@/data/liabilities/repo';
import { useAuth } from '@clerk/clerk-react';
import type { Liability } from '@/types/domain';
import {
  addLiabilityOptimistically,
  updateLiabilityOptimistically,
  removeLiabilityOptimistically,
} from '@/features/dashboard/utils/optimisticUpdates';

export function useLiabilities() {
  const { getToken } = useAuth();
  const repository = createLiabilitiesRepository();

  return useQuery<Liability[]>({
    queryKey: ['liabilities'],
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

export function useLiability(id: string) {
  const { getToken } = useAuth();
  const repository = createLiabilitiesRepository();

  return useQuery<Liability | undefined>({
    queryKey: ['liabilities', id],
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

export function useCreateLiability() {
  const queryClient = useQueryClient();
  const { getToken } = useAuth();
  const repository = createLiabilitiesRepository();

  return useMutation({
    mutationFn: async (data: Omit<Liability, 'id'>) => {
      const result = await repository.create(data, getToken);
      if (result.error) {
        throw result.error;
      }
      return result.data!;
    },
    onSuccess: (newLiability) => {
      // Optimistically update dashboard cache instead of invalidating
      addLiabilityOptimistically(queryClient, newLiability);
      queryClient.invalidateQueries({ queryKey: ['liabilities'] });
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useUpdateLiability() {
  const queryClient = useQueryClient();
  const { getToken } = useAuth();
  const repository = createLiabilitiesRepository();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Omit<Liability, 'id'>> }) => {
      const result = await repository.update(id, data, getToken);
      if (result.error) {
        throw result.error;
      }
      return result.data!;
    },
    onSuccess: (updatedLiability) => {
      // Optimistically update dashboard cache instead of invalidating
      updateLiabilityOptimistically(queryClient, updatedLiability);
      queryClient.invalidateQueries({ queryKey: ['liabilities'] });
      queryClient.invalidateQueries({ queryKey: ['liabilities', updatedLiability.id] });
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useDeleteLiability() {
  const queryClient = useQueryClient();
  const { getToken } = useAuth();
  const repository = createLiabilitiesRepository();

  return useMutation({
    mutationFn: async (id: string) => {
      const result = await repository.remove(id, getToken);
      if (result.error) {
        throw result.error;
      }
    },
    onSuccess: (_, deletedId) => {
      // Optimistically update dashboard cache instead of invalidating
      removeLiabilityOptimistically(queryClient, deletedId);
      queryClient.invalidateQueries({ queryKey: ['liabilities'] });
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

