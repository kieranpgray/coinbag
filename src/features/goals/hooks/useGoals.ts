import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createGoalsRepository } from '@/data/goals/repo';
import { useAuth } from '@clerk/clerk-react';
import type { Goal } from '@/types/domain';
import type { GoalFormData } from '@/features/goals/components/GoalForm';

export function useGoals() {
  const { getToken } = useAuth();
  const repository = createGoalsRepository();

  return useQuery<Goal[]>({
    queryKey: ['goals'],
    queryFn: async () => {
      const result = await repository.list(getToken);
      if (result.error) {
        throw result.error;
      }
      return result.data;
    },
  });
}

export function useCreateGoal() {
  const queryClient = useQueryClient();
  const { getToken } = useAuth();
  const repository = createGoalsRepository();

  return useMutation({
    mutationFn: async (data: GoalFormData) => {
      const goalData: Omit<Goal, 'id'> = {
        name: data.name,
        description: data.description,
        source: data.source,
        accountId: data.accountId,
        targetAmount: data.targetAmount,
        currentAmount: data.currentAmount,
        deadline: data.deadline,
        status: 'active',
      };

      const result = await repository.create(goalData, getToken);
      if (result.error) {
        throw result.error;
      }
      return result.data!;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
    },
  });
}

export function useUpdateGoal() {
  const queryClient = useQueryClient();
  const { getToken } = useAuth();
  const repository = createGoalsRepository();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<GoalFormData> }) => {
      const updateData: Partial<Omit<Goal, 'id'>> = {
        name: data.name,
        description: data.description,
        source: data.source,
        accountId: data.accountId,
        targetAmount: data.targetAmount,
        currentAmount: data.currentAmount,
        deadline: data.deadline,
      };

      const result = await repository.update(id, updateData, getToken);
      if (result.error) {
        throw result.error;
      }
      return result.data!;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
    },
  });
}

export function useDeleteGoal() {
  const queryClient = useQueryClient();
  const { getToken } = useAuth();
  const repository = createGoalsRepository();

  return useMutation({
    mutationFn: async (id: string) => {
      const result = await repository.remove(id, getToken);
      if (result.error) {
        throw result.error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
    },
  });
}
