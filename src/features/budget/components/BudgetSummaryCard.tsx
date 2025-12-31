import { formatCurrency } from '@/lib/utils';
import type { Subscription } from '@/types/domain';
import { calculateMonthlyEquivalent } from '@/features/subscriptions/utils';

interface BudgetSummaryCardProps {
  subscriptions: Subscription[];
}

/**
 * Budget summary card component
 * Displays key metrics at the bottom of the expenses section
 */
export function BudgetSummaryCard({ subscriptions }: BudgetSummaryCardProps) {
  const totalExpenses = subscriptions.reduce((sum, subscription) => {
    return sum + calculateMonthlyEquivalent(subscription.amount, subscription.frequency);
  }, 0);

  const categories = new Set(subscriptions.map((s) => s.categoryId)).size;
  const totalItems = subscriptions.length;
  const avgPerItem = totalItems > 0 ? totalExpenses / totalItems : 0;

  return (
    <div className="mt-8 p-6 rounded-xl bg-gradient-to-br from-neutral-50 to-neutral-100 border border-neutral-200">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <div>
          <div className="text-xs text-neutral-600 mb-1">Total Expenses</div>
          <div className="text-xl text-neutral-900 font-semibold">{formatCurrency(totalExpenses)}</div>
        </div>
        <div>
          <div className="text-xs text-neutral-600 mb-1">Categories</div>
          <div className="text-xl text-neutral-900 font-semibold">{categories}</div>
        </div>
        <div>
          <div className="text-xs text-neutral-600 mb-1">Total Items</div>
          <div className="text-xl text-neutral-900 font-semibold">{totalItems}</div>
        </div>
        <div>
          <div className="text-xs text-neutral-600 mb-1">Avg per Item</div>
          <div className="text-xl text-neutral-900 font-semibold">
            {formatCurrency(avgPerItem)}
          </div>
        </div>
      </div>
    </div>
  );
}

