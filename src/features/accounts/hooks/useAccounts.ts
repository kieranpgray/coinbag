import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createAccountsRepository } from '@/data/accounts/repo';
import { useAuth } from '@clerk/clerk-react';
import type { Account } from '@/types/domain';
import type { AccountCreate } from '@/contracts/accounts';
import {
  addAccountOptimistically,
  updateAccountOptimistically,
  removeAccountOptimistically,
} from '@/features/dashboard/utils/optimisticUpdates';

export function useAccounts() {
  const { getToken } = useAuth();
  const repository = createAccountsRepository();

  return useQuery<Account[]>({
    queryKey: ['accounts'],
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

export function useAccount(id: string) {
  const { getToken } = useAuth();
  const repository = createAccountsRepository();

  return useQuery<Account | undefined>({
    queryKey: ['accounts', id],
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

export function useCreateAccount() {
  const queryClient = useQueryClient();
  const { getToken } = useAuth();
  const repository = createAccountsRepository();

  return useMutation({
    mutationFn: async (data: AccountCreate) => {
      // Convert AccountCreate to Account format (currency is optional, not required)
      const accountData: Omit<Account, 'id'> = {
        institution: data.institution,
        accountName: data.accountName,
        balance: data.balance,
        accountType: data.accountType,
        currency: data.currency, // Currency is optional, don't set default
        creditLimit: data.creditLimit,
        balanceOwed: data.balanceOwed,
        lastUpdated: data.lastUpdated,
        hidden: data.hidden ?? false,
      };
      const result = await repository.create(accountData, getToken);
      if (result.error) {
        throw result.error;
      }
      return result.data!;
    },
    onSuccess: (newAccount) => {
      // Optimistically update dashboard cache instead of invalidating
      addAccountOptimistically(queryClient, newAccount);
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useUpdateAccount() {
  const queryClient = useQueryClient();
  const { getToken } = useAuth();
  const repository = createAccountsRepository();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Omit<Account, 'id'>> }) => {
      const result = await repository.update(id, data, getToken);
      if (result.error) {
        throw result.error;
      }
      return result.data!;
    },
    onSuccess: (updatedAccount) => {
      // Optimistically update dashboard cache instead of invalidating
      updateAccountOptimistically(queryClient, updatedAccount);
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['accounts', updatedAccount.id] });
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useDeleteAccount() {
  const queryClient = useQueryClient();
  const { getToken } = useAuth();
  const repository = createAccountsRepository();

  return useMutation({
    mutationFn: async (id: string) => {
      const result = await repository.remove(id, getToken);
      if (result.error) {
        throw result.error;
      }
    },
    onSuccess: (_, deletedId) => {
      // Optimistically update dashboard cache instead of invalidating
      removeAccountOptimistically(queryClient, deletedId);
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

