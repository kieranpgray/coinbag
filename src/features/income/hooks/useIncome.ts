import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createIncomeRepository } from '@/data/income/repo';
import { useAuth } from '@clerk/clerk-react';
import type { Income } from '@/types/domain';
import { logger, getCorrelationId } from '@/lib/logger';
import {
  addIncomeOptimistically,
  updateIncomeOptimistically,
  removeIncomeOptimistically,
} from '@/features/dashboard/utils/optimisticUpdates';

export function useIncomes() {
  const { getToken, userId } = useAuth();
  const repository = createIncomeRepository();

  return useQuery<Income[]>({
    queryKey: ['incomes'],
    queryFn: async () => {
      logger.debug('QUERY:INCOME_LIST', 'Fetching income list', { userId }, getCorrelationId() || undefined);
      const result = await repository.list(getToken);
      if (result.error) {
        logger.error('QUERY:INCOME_LIST', 'Failed to fetch income', { error: result.error }, getCorrelationId() || undefined);
        throw result.error;
      }
      logger.debug('QUERY:INCOME_LIST', 'Income list fetched', { count: result.data?.length || 0 }, getCorrelationId() || undefined);
      return result.data;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes - improves performance by reducing refetches
    gcTime: 1000 * 60 * 10, // 10 minutes - keep cached data longer
  });
}

export function useCreateIncome() {
  const queryClient = useQueryClient();
  const { getToken, userId } = useAuth();
  const repository = createIncomeRepository();
  const correlationId = getCorrelationId();

  return useMutation({
    mutationFn: async (data: Omit<Income, 'id'>) => {
      logger.info(
        'MUTATION:INCOME_CREATE',
        'Creating income',
        {
          userId,
          incomeName: data.name,
          incomeSource: data.source,
          incomeAmount: data.amount,
        },
        correlationId || undefined
      );

      const result = await repository.create(data, getToken);
      if (result.error) {
        logger.error(
          'MUTATION:INCOME_CREATE',
          'Failed to create income',
          { error: result.error, incomeName: data.name },
          correlationId || undefined
        );
        throw result.error;
      }

      logger.info(
        'MUTATION:INCOME_CREATE',
        'Income created successfully',
        {
          incomeId: result.data?.id,
          incomeName: result.data?.name,
        },
        correlationId || undefined
      );

      return result.data!;
    },
    onSuccess: (newIncome) => {
      // Optimistically update dashboard cache instead of invalidating
      addIncomeOptimistically(queryClient, newIncome);
      queryClient.invalidateQueries({ queryKey: ['incomes'] });
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useUpdateIncome() {
  const queryClient = useQueryClient();
  const { getToken } = useAuth();
  const repository = createIncomeRepository();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Income> }) => {
      const result = await repository.update(id, data, getToken);
      if (result.error) {
        throw result.error;
      }
      return result.data!;
    },
    onSuccess: (updatedIncome) => {
      // Optimistically update dashboard cache instead of invalidating
      updateIncomeOptimistically(queryClient, updatedIncome);
      queryClient.invalidateQueries({ queryKey: ['incomes'] });
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useDeleteIncome() {
  const queryClient = useQueryClient();
  const { getToken } = useAuth();
  const repository = createIncomeRepository();

  return useMutation({
    mutationFn: async (id: string) => {
      const result = await repository.remove(id, getToken);
      if (result.error) {
        throw result.error;
      }
    },
    onSuccess: (_, deletedId) => {
      // Optimistically update dashboard cache instead of invalidating
      removeIncomeOptimistically(queryClient, deletedId);
      queryClient.invalidateQueries({ queryKey: ['incomes'] });
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

