import { useQuery } from '@tanstack/react-query';
import { useAccounts } from '@/features/accounts/hooks';
import { usePayCycle } from './usePayCycle';
import { useCashFlowByAccount } from './useCashFlowByAccount';
import { useExpenses } from '@/features/expenses/hooks';
import { useCategories } from '@/features/categories/hooks';
import { calculateTransferSuggestions } from '../utils/transferCalculations';
import type { TransferSuggestion } from '@/types/domain';
import { isFeatureEnabled } from '@/lib/featureFlags';

/**
 * Hook to calculate transfer suggestions
 * Generates recommendations based on pay cycle and account cash flow
 */
export function useTransferSuggestions() {
  const { payCycle } = usePayCycle();
  const { data: cashFlowByAccount = [], isLoading: cashFlowLoading } = useCashFlowByAccount();
  const { data: accounts = [], isLoading: accountsLoading } = useAccounts();
  const { data: expenses = [], isLoading: expensesLoading } = useExpenses();
  const { data: categories = [], isLoading: categoriesLoading } = useCategories();
  const explicitRepaymentTransfersEnabled = isFeatureEnabled('explicit_repayment_transfers');

  return useQuery<TransferSuggestion[]>({
    queryKey: ['transferSuggestions', payCycle, cashFlowByAccount, accounts, expenses, categories, explicitRepaymentTransfersEnabled],
    queryFn: () => {
      if (!payCycle) return [];
      return calculateTransferSuggestions(
        payCycle,
        cashFlowByAccount,
        accounts,
        expenses,
        categories,
        explicitRepaymentTransfersEnabled
      );
    },
    enabled: !!payCycle && !cashFlowLoading && !accountsLoading && !expensesLoading && !categoriesLoading,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
  });
}
