import { formatCurrency } from '@/lib/utils';

interface WealthBreakdownProps {
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
}

/**
 * Wealth breakdown component
 * Displays Assets, Liabilities, and Net Worth with status indicators
 * Compact horizontal/two-column layout for high information density
 */
export function WealthBreakdown({
  totalAssets,
  totalLiabilities,
  netWorth,
}: WealthBreakdownProps) {
  return (
    <div className="border border-border rounded-lg bg-surface p-4 sm:p-6">
      {/* Compact horizontal layout - single row on desktop, two columns on mobile */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
        {/* Assets */}
        <div className="flex items-center justify-between sm:flex-col sm:items-start sm:gap-2">
          <div className="flex items-center gap-2">
            <span className="text-h3 font-semibold text-foreground">Assets</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-balance-sm sm:text-balance-md lg:text-balance-lg font-bold text-foreground">
              {formatCurrency(totalAssets)}
            </span>
            <div className="h-2 w-2 rounded-full bg-success" aria-label="Positive status" />
          </div>
        </div>

        {/* Liabilities */}
        <div className="flex items-center justify-between sm:flex-col sm:items-start sm:gap-2">
          <div className="flex items-center gap-2">
            <span className="text-h3 font-semibold text-foreground">Liabilities</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-balance-sm sm:text-balance-md lg:text-balance-lg font-bold text-foreground">
              -{formatCurrency(totalLiabilities)}
            </span>
            <div className="h-2 w-2 rounded-full bg-error" aria-label="Liability status" />
          </div>
        </div>

        {/* Net Worth */}
        <div className="flex items-center justify-between sm:flex-col sm:items-start sm:gap-2 border-t border-border pt-4 sm:border-t-0 sm:pt-0 sm:border-l sm:pl-6">
          <div className="flex items-center gap-2">
            <span className="text-h3 font-semibold text-foreground">Net Worth</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-balance-sm sm:text-balance-md lg:text-balance-lg font-bold text-foreground">
              {formatCurrency(netWorth)}
            </span>
            <div
              className={`h-2 w-2 rounded-full ${
                netWorth >= 0 ? 'bg-success' : 'bg-error'
              }`}
              aria-label={netWorth >= 0 ? 'Positive status' : 'Negative status'}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

