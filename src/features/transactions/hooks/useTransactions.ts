import { useQuery } from '@tanstack/react-query';
import { transactionsApi } from '@/lib/api';
import type { Transaction } from '@/types/domain';

/**
 * Hook to fetch transactions for a specific account
 * @param accountId - Optional account ID to filter transactions. If not provided, returns all transactions.
 */
export function useTransactions(accountId?: string) {
  return useQuery<Transaction[]>({
    queryKey: ['transactions', accountId],
    queryFn: async () => {
      const result = await transactionsApi.getAll({
        accountId: accountId,
        page: 0,
        size: 1000, // Get all transactions for now, can add pagination later
      });
      return result.data;
    },
    enabled: true, // Always enabled, accountId filter is handled by API
    staleTime: 1000 * 60 * 5, // 5 minutes - improves performance by reducing refetches
    gcTime: 1000 * 60 * 10, // 10 minutes - keep cached data longer
  });
}

