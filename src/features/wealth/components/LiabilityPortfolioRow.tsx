import { formatCurrency } from '@/lib/utils';
import type { Liability } from '@/types/domain';

interface LiabilityPortfolioRowProps {
  liability: Liability;
  onClick: (liability: Liability) => void;
}

/**
 * Compact portfolio row component for individual liabilities
 * Displays liability name, institution (if present), balance, and optional monthly payment
 * Includes subtle red accent styling to indicate debt
 * Clickable to open edit modal
 */
export function LiabilityPortfolioRow({ liability, onClick }: LiabilityPortfolioRowProps) {
  return (
    <button
      type="button"
      onClick={() => onClick(liability)}
      className="w-full flex items-center justify-between py-2 px-4 hover:bg-muted/50 transition-colors text-left border-b border-border last:border-b-0"
      aria-label={`View details for ${liability.name}`}
    >
      {/* Left side: Name, institution, and optional monthly payment */}
      <div className="flex-1 min-w-0 pr-4">
        <div className="text-body-lg font-medium text-foreground truncate">
          {liability.name}
        </div>
        {liability.institution && (
          <div className="text-body-sm text-muted-foreground truncate mt-0.5">
            {liability.institution}
          </div>
        )}
        {liability.monthlyPayment !== undefined && (
          <div className="text-body-sm text-muted-foreground truncate mt-0.5">
            Monthly: {formatCurrency(liability.monthlyPayment)}
          </div>
        )}
      </div>

      {/* Right side: Balance */}
      <div className="flex-shrink-0">
        <span className="text-body-lg font-medium text-foreground">
          {formatCurrency(liability.balance)}
        </span>
      </div>
    </button>
  );
}
