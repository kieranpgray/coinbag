import { formatCurrency } from '@/lib/utils';
import { calculateBudgetPercentage } from '../utils/calculations';

interface BudgetTopBarProps {
  totalIncome: number;
  totalExpenses: number;
}

/**
 * Budget top bar component
 * Displays remaining budget and percentage
 * Responsive: shown in header on desktop, below header on mobile
 */
export function BudgetTopBar({ totalIncome, totalExpenses }: BudgetTopBarProps) {
  const remaining = totalIncome - totalExpenses;
  const percentage = calculateBudgetPercentage(remaining, totalIncome);
  const isPositive = remaining >= 0;

  return (
    <>
      {/* Desktop: shown in header area */}
      <div className="hidden md:flex items-center gap-8">
        <div className="flex items-center gap-6 px-4 py-2 rounded-lg bg-muted">
          <div>
            <div className="text-xs text-muted-foreground">Remaining</div>
            <div className={`text-lg font-semibold ${isPositive ? 'text-success' : 'text-error'}`}>
              {formatCurrency(Math.abs(remaining))}
            </div>
          </div>
          <div className="h-10 w-px bg-border" />
          <div>
            <div className="text-xs text-muted-foreground">Available</div>
            <div className="text-lg text-foreground font-semibold">{Math.abs(percentage).toFixed(0)}%</div>
          </div>
        </div>
      </div>

      {/* Mobile: full-width card below header */}
      <div className="md:hidden px-6 pb-4">
        <div className="flex items-center gap-4 p-3 rounded-lg bg-muted">
          <div className="flex-1">
            <div className="text-xs text-muted-foreground">Remaining</div>
            <div className={`font-semibold ${isPositive ? 'text-success' : 'text-error'}`}>
              {formatCurrency(Math.abs(remaining))}
            </div>
          </div>
          <div className="h-8 w-px bg-border" />
          <div className="flex-1">
            <div className="text-xs text-muted-foreground">Available</div>
            <div className="text-foreground font-semibold">{Math.abs(percentage).toFixed(0)}%</div>
          </div>
        </div>
      </div>
    </>
  );
}

