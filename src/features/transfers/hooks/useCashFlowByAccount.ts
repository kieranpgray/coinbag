import { useQuery } from '@tanstack/react-query';
import { useIncomes } from '@/features/income/hooks';
import { useExpenses } from '@/features/expenses/hooks';
import { useAccounts } from '@/features/accounts/hooks';
import { useCategories } from '@/features/categories/hooks';
import { calculateAccountCashFlow } from '../utils/transferCalculations';
import type { AccountCashFlow } from '@/types/domain';

/**
 * Hook to calculate account-level cash flow
 * Aggregates income and expenses per account, normalized to monthly
 */
export function useCashFlowByAccount() {
  const { data: incomes = [], isLoading: incomesLoading } = useIncomes();
  const { data: expenses = [], isLoading: expensesLoading } = useExpenses();
  const { data: accounts = [], isLoading: accountsLoading } = useAccounts();
  const { data: categories = [], isLoading: categoriesLoading } = useCategories();

  return useQuery<AccountCashFlow[]>({
    queryKey: ['cashFlowByAccount', incomes, expenses, accounts, categories],
    queryFn: () => calculateAccountCashFlow(incomes, expenses, accounts, categories),
    enabled: !incomesLoading && !expensesLoading && !accountsLoading && !categoriesLoading,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
  });
}
