import { formatCurrency } from '@/lib/utils';
import type { Expense } from '@/types/domain';
import { calculateMonthlyEquivalent } from '@/features/expenses/utils';

interface BudgetSummaryCardProps {
  expenses: Expense[];
}

/**
 * Budget summary card component
 * Displays key metrics at the bottom of the expenses section
 */
export function BudgetSummaryCard({ expenses }: BudgetSummaryCardProps) {
  const totalExpenses = expenses.reduce((sum, expense) => {
    return sum + calculateMonthlyEquivalent(expense.amount, expense.frequency);
  }, 0);

  const categories = new Set(expenses.map((e) => e.categoryId)).size;
  const totalItems = expenses.length;
  const avgPerItem = totalItems > 0 ? totalExpenses / totalItems : 0;

  return (
    <div className="mt-8 p-6 rounded-xl bg-muted border border-border">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <div>
          <div className="text-xs text-muted-foreground mb-1">Total Expenses</div>
          <div className="text-xl text-foreground font-semibold">{formatCurrency(totalExpenses)}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground mb-1">Categories</div>
          <div className="text-xl text-foreground font-semibold">{categories}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground mb-1">Total Items</div>
          <div className="text-xl text-foreground font-semibold">{totalItems}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground mb-1">Avg per Item</div>
          <div className="text-xl text-foreground font-semibold">
            {formatCurrency(avgPerItem)}
          </div>
        </div>
      </div>
    </div>
  );
}

