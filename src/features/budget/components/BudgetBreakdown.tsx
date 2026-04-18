import { Card, CardContent } from '@/components/ui/card';
import { cn, formatCurrency } from '@/lib/utils';
import { convertToFrequency, type Frequency } from '../utils/frequencyConversion';

interface BudgetBreakdownProps {
  totalIncome: number; // monthly equivalent
  totalExpenses: number; // monthly equivalent, ALL expenses (includes all categories)
  totalSavings: number; // monthly equivalent (for display only, already included in totalExpenses)
  totalRepayments: number; // monthly equivalent (for display only, already included in totalExpenses)
  remaining: number; // monthly equivalent
  frequency: Frequency;
}

/**
 * In and Out component
 * Displays Income, Expenses, Savings, Repayments, and Remaining with status indicators.
 * Frequency is controlled at page level — no local selector.
 */
export function BudgetBreakdown({
  totalIncome,
  totalExpenses,
  totalSavings,
  totalRepayments,
  remaining,
  frequency,
}: BudgetBreakdownProps) {
  // Convert all values from monthly to selected frequency
  const incomeDisplay = convertToFrequency(totalIncome, 'monthly', frequency);
  const expensesDisplay = convertToFrequency(totalExpenses, 'monthly', frequency);
  const savingsDisplay = convertToFrequency(totalSavings, 'monthly', frequency);
  const repaymentsDisplay = convertToFrequency(totalRepayments, 'monthly', frequency);
  const remainingDisplay = convertToFrequency(remaining, 'monthly', frequency);

  return (
    <Card className="border border-border">
      <CardContent className="p-0">
        {/* Header */}
        <div className="flex items-center p-4">
          <h2 className="display-sm">
            In and Out
          </h2>
        </div>

        {/* Content */}
        <div className="px-4 pb-4 space-y-3">
          {/* Income Row (primary) */}
          <div className="flex items-center justify-between">
            <span className="text-body-sm text-muted-foreground">Income</span>
            <span className="num-body tabular-nums text-foreground">
              {formatCurrency(incomeDisplay)}
            </span>
          </div>

          {/* Total Expenses Row (primary) */}
          <div className="flex items-center justify-between">
            <span className="text-body-sm text-muted-foreground">Total Expenses</span>
            <span className="num-body tabular-nums text-foreground">
              -{formatCurrency(expensesDisplay)}
            </span>
          </div>

          {/* Savings sub-row */}
          {savingsDisplay > 0 && (
            <div className="flex items-center justify-between pl-6 border-l-2 border-[var(--paper-3)] ml-2">
              <span className="text-body-sm text-[var(--ink-3)]">incl. Savings</span>
              <span className="num-body tabular-nums text-[var(--ink-3)]">
                -{formatCurrency(savingsDisplay)}
              </span>
            </div>
          )}

          {/* Repayments sub-row */}
          {repaymentsDisplay > 0 && (
            <div className="flex items-center justify-between pl-6 border-l-2 border-[var(--paper-3)] ml-2">
              <span className="text-body-sm text-[var(--ink-3)]">incl. Repayments</span>
              <span className="num-body tabular-nums text-[var(--ink-3)]">
                -{formatCurrency(repaymentsDisplay)}
              </span>
            </div>
          )}

          <div className="flex items-center justify-between pt-1 border-t border-border">
            <span className="text-body-sm text-muted-foreground">Remaining</span>
            <span
              className={cn(
                'num-body tabular-nums',
                remainingDisplay < 0 ? 'text-destructive' : 'text-foreground',
              )}
            >
              {formatCurrency(remainingDisplay)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

