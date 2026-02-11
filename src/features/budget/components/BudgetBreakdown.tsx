import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatCurrency } from '@/lib/utils';
import { convertToFrequency, type Frequency, FREQUENCY_OPTIONS } from '../utils/frequencyConversion';

interface BudgetBreakdownProps {
  totalIncome: number; // monthly equivalent
  totalExpenses: number; // monthly equivalent, ALL expenses (includes all categories)
  totalSavings: number; // monthly equivalent (for display only, already included in totalExpenses)
  totalRepayments: number; // monthly equivalent (for display only, already included in totalExpenses)
  remaining: number; // monthly equivalent
  frequency: Frequency;
  onFrequencyChange: (frequency: Frequency) => void;
}

/**
 * In and Out component
 * Displays Income, Expenses, Savings, Repayments, and Remaining with status indicators
 * Always open with frequency selector
 */
export function BudgetBreakdown({
  totalIncome,
  totalExpenses,
  totalSavings,
  totalRepayments,
  remaining,
  frequency,
  onFrequencyChange,
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
        <div className="flex items-center justify-between p-4">
          <h2 className="text-h2-sm sm:text-h2-md lg:text-h2-lg font-semibold text-foreground">
            In and Out
          </h2>
          <Select value={frequency} onValueChange={(value) => onFrequencyChange(value as Frequency)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FREQUENCY_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Content */}
        <div className="px-4 pb-4 space-y-3">
          {/* Income Row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-body-sm text-muted-foreground">Income</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-body-lg font-bold text-foreground">
                {formatCurrency(incomeDisplay)}
              </span>
              <div className="h-2 w-2 rounded-full bg-success" aria-label="Positive status" />
            </div>
          </div>

          {/* Expenses Row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-body-sm text-muted-foreground">Expenses</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-body-lg font-bold text-foreground">
                -{formatCurrency(expensesDisplay)}
              </span>
              <div className="h-2 w-2 rounded-full bg-error" aria-label="Expense status" />
            </div>
          </div>

          {/* Savings Row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-body-sm text-muted-foreground">Savings</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-body-lg font-bold text-foreground">
                -{formatCurrency(savingsDisplay)}
              </span>
              <div className="h-2 w-2 rounded-full bg-error" aria-label="Savings status" />
            </div>
          </div>

          {/* Repayments Row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-body-sm text-muted-foreground">Repayments</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-body-lg font-bold text-foreground">
                -{formatCurrency(repaymentsDisplay)}
              </span>
              <div className="h-2 w-2 rounded-full bg-error" aria-label="Repayment status" />
            </div>
          </div>

          {/* Separator */}
          <div className="border-t border-border my-2" />

          {/* Remaining Row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-body-sm text-muted-foreground">Remaining</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-body-lg font-bold text-foreground">
                {formatCurrency(remainingDisplay)}
              </span>
              <div
                className={`h-2 w-2 rounded-full ${
                  remaining >= 0 ? 'bg-success' : 'bg-error'
                }`}
                aria-label={remaining >= 0 ? 'Positive status' : 'Negative status'}
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

