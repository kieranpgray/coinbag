import { formatCurrency, cn } from '@/lib/utils';
import { StatusIndicator } from '@/components/shared/StatusIndicator';
import { isDsV2 } from '@/lib/dsV2';

interface WealthBreakdownProps {
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
}

/**
 * Wealth breakdown — Assets, Liabilities, Net Worth.
 * DS v2: three metric tiles; legacy: compact bordered strip.
 */
export function WealthBreakdown({
  totalAssets,
  totalLiabilities,
  netWorth,
}: WealthBreakdownProps) {
  if (isDsV2) {
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-[var(--rl)] border border-border bg-card px-6 py-5 metric-tile">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="metric-label">Assets</div>
              <div className="metric-value tabular-nums">{formatCurrency(totalAssets)}</div>
            </div>
            <StatusIndicator status="positive" label="Positive status" className="shrink-0 mt-1" />
          </div>
        </div>

        <div className="rounded-[var(--rl)] border border-border bg-card px-6 py-5 metric-tile">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="metric-label">Liabilities</div>
              <div className="metric-value tabular-nums">-{formatCurrency(totalLiabilities)}</div>
            </div>
            <StatusIndicator status="negative" label="Liability status" className="shrink-0 mt-1" />
          </div>
        </div>

        <div className="rounded-[var(--rl)] border border-border bg-card px-6 py-5 metric-tile">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="metric-label">Net Worth</div>
              <div
                className={cn(
                  'metric-value tabular-nums',
                  netWorth >= 0 ? 'positive' : 'negative'
                )}
              >
                {formatCurrency(netWorth)}
              </div>
            </div>
            <StatusIndicator
              status={netWorth >= 0 ? 'positive' : 'negative'}
              label={netWorth >= 0 ? 'Positive status' : 'Negative status'}
              className="shrink-0 mt-1"
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="border border-border rounded-lg bg-surface p-4 sm:p-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
        <div className="flex items-center justify-between sm:flex-col sm:items-start sm:gap-2">
          <div className="flex items-center gap-2">
            <span className="text-h3 font-semibold text-foreground">Assets</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-balance-sm sm:text-balance-md lg:text-balance-lg font-bold text-foreground tabular-nums">
              {formatCurrency(totalAssets)}
            </span>
            <div className="h-2 w-2 rounded-full bg-success" aria-label="Positive status" />
          </div>
        </div>

        <div className="flex items-center justify-between sm:flex-col sm:items-start sm:gap-2">
          <div className="flex items-center gap-2">
            <span className="text-h3 font-semibold text-foreground">Liabilities</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-balance-sm sm:text-balance-md lg:text-balance-lg font-bold text-foreground tabular-nums">
              -{formatCurrency(totalLiabilities)}
            </span>
            <div className="h-2 w-2 rounded-full bg-error" aria-label="Liability status" />
          </div>
        </div>

        <div className="flex items-center justify-between sm:flex-col sm:items-start sm:gap-2 border-t border-border pt-4 sm:border-t-0 sm:pt-0 sm:border-l sm:pl-6">
          <div className="flex items-center gap-2">
            <span className="text-h3 font-semibold text-foreground">Net Worth</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-balance-sm sm:text-balance-md lg:text-balance-lg font-bold text-foreground tabular-nums">
              {formatCurrency(netWorth)}
            </span>
            <div
              className={`h-2 w-2 rounded-full ${netWorth >= 0 ? 'bg-success' : 'bg-error'}`}
              aria-label={netWorth >= 0 ? 'Positive status' : 'Negative status'}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
