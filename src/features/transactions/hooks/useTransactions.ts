import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@clerk/clerk-react';
import { createTransactionsRepository } from '@/data/transactions/repo';
import type { Transaction } from '@/types/domain';
import type { TransactionEntity } from '@/contracts/transactions';

/**
 * Convert TransactionEntity to Transaction domain type
 */
function mapTransactionEntityToDomain(entity: TransactionEntity): Transaction {
  return {
    id: entity.id,
    date: entity.date,
    description: entity.description,
    amount: entity.amount,
    category: entity.category || '', // Domain type requires string, not null
    accountId: entity.accountId,
    type: entity.type, // 'income' | 'expense' maps directly
    status: 'completed', // Transactions from statements are completed
  };
}

/**
 * Hook to fetch transactions for a specific account
 * @param accountId - Optional account ID to filter transactions. If not provided, returns all transactions.
 * @param statementImportId - Optional statement import ID to filter transactions by provenance (only show transactions from this specific statement import)
 */
export function useTransactions(accountId?: string, statementImportId?: string) {
  const { getToken } = useAuth();

  return useQuery<Transaction[]>({
    queryKey: ['transactions', accountId, statementImportId],
    queryFn: async () => {
      const repository = await createTransactionsRepository();
      const result = await repository.list(accountId, getToken, statementImportId);
      
      if (result.error) {
        throw new Error(result.error.error);
      }
      
      // Map TransactionEntity[] to Transaction[]
      // CRITICAL: Ensure all transactions have valid provenance data
      const mapped = result.data.map(mapTransactionEntityToDomain);
      
      // Runtime safety check: log warning if any transactions lack statementImportId when one was requested
      if (statementImportId) {
        const invalid = mapped.filter((_tx, idx) => {
          const entity = result.data[idx];
          return !entity || entity.statementImportId !== statementImportId;
        });
        if (invalid.length > 0) {
          console.warn('[useTransactions] CRITICAL: Transactions returned without matching statementImportId', {
            expectedStatementImportId: statementImportId,
            invalidCount: invalid.length,
            invalidIds: invalid.map(tx => tx.id)
          });
        }
      }
      
      return mapped;
    },
    enabled: true, // Always enabled, filters are handled by repository
    staleTime: 1000 * 60 * 5, // 5 minutes - improves performance by reducing refetches
    gcTime: 1000 * 60 * 10, // 10 minutes - keep cached data longer
  });
}

