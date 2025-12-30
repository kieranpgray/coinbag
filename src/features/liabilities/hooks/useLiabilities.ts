import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createLiabilitiesRepository } from '@/data/liabilities/repo';
import { useAuth } from '@clerk/clerk-react';
import type { Liability } from '@/types/domain';
import {
  addLiabilityOptimistically,
  updateLiabilityOptimistically,
  removeLiabilityOptimistically,
} from '@/features/dashboard/utils/optimisticUpdates';
import {
  createSubscriptionFromLiability,
  updateSubscriptionFromLiability,
  deleteSubscriptionIfNoRepayment,
  findLinkedSubscription,
} from '../services/liabilitySubscriptionService';

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
    onSuccess: async (newLiability) => {
      // Optimistically update dashboard cache instead of invalidating
      addLiabilityOptimistically(queryClient, newLiability);
      queryClient.invalidateQueries({ queryKey: ['liabilities'] });
      
      // Auto-create subscription if liability has repayment info
      try {
        await createSubscriptionFromLiability(newLiability, getToken);
        // Invalidate subscriptions and dashboard to reflect new subscription
        queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      } catch (error) {
        // Log error but don't fail the liability creation
        console.error('Failed to create subscription from liability:', error);
      }
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
    onSuccess: async (updatedLiability) => {
      // Optimistically update dashboard cache instead of invalidating
      updateLiabilityOptimistically(queryClient, updatedLiability);
      queryClient.invalidateQueries({ queryKey: ['liabilities'] });
      queryClient.invalidateQueries({ queryKey: ['liabilities', updatedLiability.id] });
      
      // Handle subscription create/update/delete based on repayment info
      try {
        const existing = await findLinkedSubscription(updatedLiability.id, getToken);
        if (existing) {
          // Update existing subscription
          await updateSubscriptionFromLiability(existing.id, updatedLiability, getToken);
        } else if (updatedLiability.repaymentAmount && updatedLiability.repaymentFrequency) {
          // Create new subscription if repayment info exists
          await createSubscriptionFromLiability(updatedLiability, getToken);
        } else {
          // Delete subscription if repayment info removed
          await deleteSubscriptionIfNoRepayment(updatedLiability, getToken);
        }
        // Invalidate subscriptions and dashboard to reflect changes
        queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      } catch (error) {
        // Log error but don't fail the liability update
        console.error('Failed to sync subscription with liability:', error);
      }
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

