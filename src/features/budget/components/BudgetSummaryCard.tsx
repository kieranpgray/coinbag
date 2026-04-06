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
    <div className="mt-8 rounded-xl border border-border bg-muted p-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <div className="metric-tile">
          <div className="metric-label">Total Expenses</div>
          <div className="metric-value tabular-nums">{formatCurrency(totalExpenses)}</div>
        </div>
        <div className="metric-tile">
          <div className="metric-label">Categories</div>
          <div className="metric-value tabular-nums">{categories}</div>
        </div>
        <div className="metric-tile">
          <div className="metric-label">Total Items</div>
          <div className="metric-value tabular-nums">{totalItems}</div>
        </div>
        <div className="metric-tile">
          <div className="metric-label">Avg per Item</div>
          <div className="metric-value tabular-nums">{formatCurrency(avgPerItem)}</div>
        </div>
      </div>
    </div>
  );
}
