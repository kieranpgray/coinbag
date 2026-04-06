import { formatCurrency, cn } from '@/lib/utils';
import { StatusIndicator } from '@/components/shared/StatusIndicator';

interface WealthBreakdownProps {
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
}

/** Wealth breakdown — Assets, Liabilities, Net Worth as metric tiles. */
export function WealthBreakdown({
  totalAssets,
  totalLiabilities,
  netWorth,
}: WealthBreakdownProps) {
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
            <div className={cn('metric-value tabular-nums', netWorth >= 0 ? 'positive' : 'negative')}>
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
