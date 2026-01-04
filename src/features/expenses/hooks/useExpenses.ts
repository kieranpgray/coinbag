import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@clerk/clerk-react';
import { createExpensesRepository } from '@/data/expenses/repo';
import type { Expense } from '@/types/domain';
import {
  addExpenseOptimistically,
  updateExpenseOptimistically,
  removeExpenseOptimistically,
} from '@/features/dashboard/utils/optimisticUpdates';

export function useExpenses() {
  const { getToken } = useAuth();
  const repository = createExpensesRepository();

  return useQuery({
    queryKey: ['expenses'],
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

export function useExpense(id: string) {
  const { getToken } = useAuth();
  const repository = createExpensesRepository();

  return useQuery({
    queryKey: ['expenses', id],
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

export function useCreateExpense() {
  const queryClient = useQueryClient();
  const { getToken } = useAuth();
  const repository = createExpensesRepository();

  return useMutation({
    mutationFn: async (data: Omit<Expense, 'id'>) => {
      const result = await repository.create(data, getToken);
      if (result.error) {
        throw result.error;
      }
      return result.data!;
    },
    onSuccess: (newExpense) => {
      // Optimistically update dashboard cache instead of invalidating
      addExpenseOptimistically(queryClient, newExpense);
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useUpdateExpense() {
  const queryClient = useQueryClient();
  const { getToken } = useAuth();
  const repository = createExpensesRepository();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Omit<Expense, 'id'>> }) => {
      const result = await repository.update(id, data, getToken);
      if (result.error) {
        throw result.error;
      }
      return result.data!;
    },
    onSuccess: (updatedExpense) => {
      // Optimistically update dashboard cache instead of invalidating
      updateExpenseOptimistically(queryClient, updatedExpense);
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['expenses', updatedExpense.id] });
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useDeleteExpense() {
  const queryClient = useQueryClient();
  const { getToken } = useAuth();
  const repository = createExpensesRepository();

  return useMutation({
    mutationFn: async (id: string) => {
      const result = await repository.remove(id, getToken);
      if (result.error) {
        throw result.error;
      }
    },
    onSuccess: (_, deletedId) => {
      // Optimistically update dashboard cache instead of invalidating
      removeExpenseOptimistically(queryClient, deletedId);
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

