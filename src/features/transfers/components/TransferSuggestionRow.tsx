import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { TransferSuggestion } from '@/types/domain';
import { formatAmountByFrequency } from '../utils/frequencyNormalization';
import { ArrowRight } from 'lucide-react';

interface TransferSuggestionRowProps {
  suggestion: TransferSuggestion;
  viewMode: 'weekly' | 'fortnightly' | 'monthly';
  onEditExpense?: (expenseId: string) => void;
}

/**
 * List row for a single transfer suggestion using DS v2 alloc-row layout.
 */
export function TransferSuggestionRow({ suggestion, viewMode, onEditExpense }: TransferSuggestionRowProps) {
  const formattedAmount = formatAmountByFrequency(suggestion.amountMonthly, viewMode);
  const isActionRequired = suggestion.kind === 'action_required_repayment' && suggestion.requiresAction;

  return (
    <li className="alloc-row">
      <div className="alloc-left">
        <div className={`alloc-icon ${suggestion.isSurplus ? 'alloc-icon-green' : 'alloc-icon-blue'}`}>
          <ArrowRight className="h-3.5 w-3.5" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="alloc-name truncate">{suggestion.fromAccountName}</span>
            <span className="alloc-acct">→ {suggestion.toAccountName}</span>
            {suggestion.isSurplus && (
              <Badge variant="secondary" className="shrink-0 bg-success/15 text-success">
                Surplus
              </Badge>
            )}
            {suggestion.kind === 'repayment' && (
              <Badge variant="secondary" className="shrink-0">
                Repayment
              </Badge>
            )}
            {isActionRequired && (
              <Badge variant="destructive" className="shrink-0">
                Action required
              </Badge>
            )}
          </div>
          <div className="alloc-acct mt-0.5">{suggestion.reason}</div>
          {isActionRequired && suggestion.actionExpenseId && onEditExpense && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEditExpense(suggestion.actionExpenseId!)}
              className="mt-2 h-7 px-2 text-caption"
            >
              Edit expense
            </Button>
          )}
        </div>
      </div>
      <div className="shrink-0 text-right">
        <div className={`alloc-amount ${suggestion.isSurplus ? 'alloc-amount-surplus' : ''}`}>
          {formattedAmount}
        </div>
        {viewMode !== 'monthly' && (
          <div className="alloc-acct mt-0.5">
            {formatAmountByFrequency(suggestion.amountMonthly, 'monthly')} /mo
          </div>
        )}
      </div>
    </li>
  );
}
