import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@clerk/clerk-react';
import { createExpensesRepository } from '@/data/expenses/repo';
import type { Expense } from '@/types/domain';

/**
 * Custom hook for expense mutations
 */
export function useExpenseMutations() {
  const queryClient = useQueryClient();
  const { getToken } = useAuth();
  const repository = createExpensesRepository();

  const createMutation = useMutation({
    mutationFn: async (data: Omit<Expense, 'id'>) => {
      console.log('📡 useExpenseMutations: Creating expense with data:', data);
      console.log('🔗 useExpenseMutations: paidFromAccountId:', data.paidFromAccountId);
      const result = await repository.create(data, getToken);
      if (result.error) {
        console.error('❌ useExpenseMutations: Error creating expense:', result.error);
        throw result.error;
      }
      console.log('✅ useExpenseMutations: Expense created successfully:', result.data);
      return result.data!;
    },
    onSuccess: (newExpense) => {
      // Invalidate and refetch expense queries
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });

      // Optimistically add to cache
      queryClient.setQueryData<Expense[]>(
        ['expenses'],
        (oldData) => oldData ? [...oldData, newExpense] : [newExpense]
      );
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Expense> }) => {
      const result = await repository.update(id, data, getToken);
      if (result.error) throw result.error;
      return result.data!;
    },
    onSuccess: (_, variables) => {
      // Invalidate queries to ensure fresh data from server
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['expenses', variables.id] });
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
      queryClient.setQueryData<Expense[]>(
        ['expenses'],
        (oldData) => oldData?.filter((exp) => exp.id !== deletedId) || []
      );

      // Remove individual expense cache
      queryClient.removeQueries({ queryKey: ['expenses', deletedId] });

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

