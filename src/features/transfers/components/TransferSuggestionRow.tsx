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
 * List row for a single transfer suggestion (no Card).
 * Used in the hero block so the list is flat, not nested cards.
 */
export function TransferSuggestionRow({ suggestion, viewMode, onEditExpense }: TransferSuggestionRowProps) {
  const formattedAmount = formatAmountByFrequency(suggestion.amountMonthly, viewMode);
  const isActionRequired = suggestion.kind === 'action_required_repayment' && suggestion.requiresAction;

  return (
    <li className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 py-4 first:pt-0 border-b border-border last:border-b-0">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5 text-body">
          <span className="truncate">{suggestion.fromAccountName}</span>
          <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden />
          <span className="truncate">{suggestion.toAccountName}</span>
          {suggestion.isSurplus && (
            <Badge
              variant="secondary"
              className="shrink-0 bg-success/15 text-success"
            >
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
        <p className="text-body text-muted-foreground mt-0.5">{suggestion.reason}</p>
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
      <div className="shrink-0 text-right">
        <div className="text-lg font-bold tabular-nums">{formattedAmount}</div>
        {viewMode !== 'monthly' && (
          <div className="text-caption text-muted-foreground">
            {formatAmountByFrequency(suggestion.amountMonthly, 'monthly')} per month
          </div>
        )}
      </div>
    </li>
  );
}
