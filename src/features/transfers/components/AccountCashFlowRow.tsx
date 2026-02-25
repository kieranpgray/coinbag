import { Button } from '@/components/ui/button';
import type { AccountCashFlow } from '@/types/domain';
import { formatAmountByFrequency } from '../utils/frequencyNormalization';
import { AccountBreakdownModal } from './AccountBreakdownModal';
import { useState } from 'react';
import { ChevronRight } from 'lucide-react';

interface AccountCashFlowRowProps {
  accountFlow: AccountCashFlow;
}

/**
 * List row for one account's cash flow (no Card).
 * Used inside the collapsible "By account" section.
 */
export function AccountCashFlowRow({ accountFlow }: AccountCashFlowRowProps) {
  const [breakdownModalOpen, setBreakdownModalOpen] = useState(false);
  const netFlow = accountFlow.monthlyIncome - accountFlow.monthlyExpenses;
  const hasExpenses = accountFlow.monthlyExpenses > 0;

  return (
    <>
      <li className="py-3 border-b border-border last:border-b-0">
        <div className="flex flex-col gap-2">
          <div className="font-medium text-body">{accountFlow.accountName}</div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-1 text-body">
            {accountFlow.monthlyIncome > 0 && (
              <div className="flex justify-between sm:block">
                <span className="text-muted-foreground">Income</span>
                <span className="font-medium text-green-600 dark:text-green-400 sm:ml-2">
                  {formatAmountByFrequency(accountFlow.monthlyIncome, 'monthly')}
                </span>
              </div>
            )}
            {accountFlow.monthlyExpenses > 0 && (
              <div className="flex justify-between sm:block">
                <span className="text-muted-foreground">Expenses</span>
                <span className="font-medium text-red-600 dark:text-red-400 sm:ml-2">
                  {formatAmountByFrequency(accountFlow.monthlyExpenses, 'monthly')}
                </span>
              </div>
            )}
            {(accountFlow.monthlyIncome > 0 || accountFlow.monthlyExpenses > 0) && (
              <div className="flex justify-between sm:block col-span-2 sm:col-span-4">
                <span className="text-muted-foreground">Net flow</span>
                <span
                  className={`font-semibold sm:ml-2 ${
                    netFlow >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                  }`}
                >
                  {formatAmountByFrequency(Math.abs(netFlow), 'monthly')}
                  {netFlow >= 0 ? ' in' : ' out'}
                </span>
              </div>
            )}
          </div>
          {hasExpenses && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setBreakdownModalOpen(true)}
              className="w-fit h-8 px-2 text-caption gap-1 -ml-2"
            >
              View breakdown
              <ChevronRight className="h-3 w-3" />
            </Button>
          )}
        </div>
      </li>
      <AccountBreakdownModal
        open={breakdownModalOpen}
        onOpenChange={setBreakdownModalOpen}
        accountFlow={accountFlow}
      />
    </>
  );
}
