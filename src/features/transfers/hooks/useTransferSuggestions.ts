import { useQuery } from '@tanstack/react-query';
import { useAccounts } from '@/features/accounts/hooks';
import { usePayCycle } from './usePayCycle';
import { useCashFlowByAccount } from './useCashFlowByAccount';
import { calculateTransferSuggestions } from '../utils/transferCalculations';
import type { TransferSuggestion } from '@/types/domain';

/**
 * Hook to calculate transfer suggestions
 * Generates recommendations based on pay cycle and account cash flow
 */
export function useTransferSuggestions() {
  const { payCycle } = usePayCycle();
  const { data: cashFlowByAccount = [], isLoading: cashFlowLoading } = useCashFlowByAccount();
  const { data: accounts = [], isLoading: accountsLoading } = useAccounts();

  return useQuery<TransferSuggestion[]>({
    queryKey: ['transferSuggestions', payCycle, cashFlowByAccount, accounts],
    queryFn: () => {
      if (!payCycle) return [];
      return calculateTransferSuggestions(payCycle, cashFlowByAccount, accounts);
    },
    enabled: !!payCycle && !cashFlowLoading && !accountsLoading,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
  });
}
