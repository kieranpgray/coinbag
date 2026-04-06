import { memo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { PrivacyWrapper } from '@/components/shared/PrivacyWrapper';
import { StatusIndicator } from '@/components/shared/StatusIndicator';
import { cn } from '@/lib/utils';

interface NetWorthSummaryProps {
  netWorth: number;
  totalAssets: number;
  totalLiabilities: number;
  isLoading?: boolean;
}

/**
 * Summary panel component displaying net worth, assets, and liabilities.
 * Extracted from NetWorthCard for use in hero layout.
 */
export const NetWorthSummary = memo(function NetWorthSummary({
  netWorth,
  totalAssets,
  totalLiabilities,
  isLoading,
}: NetWorthSummaryProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-6 w-24" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-6 w-24" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-6 w-24" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="rounded-[var(--rl)] border border-border bg-card px-6 py-5 metric-tile">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="metric-label">Assets</div>
            <div className="metric-value">
              <PrivacyWrapper value={totalAssets} />
            </div>
          </div>
          <StatusIndicator status="positive" label="Positive status" className="shrink-0 mt-1" />
        </div>
      </div>

      <div className="rounded-[var(--rl)] border border-border bg-card px-6 py-5 metric-tile">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="metric-label">Liabilities</div>
            <div className="metric-value">
              -<PrivacyWrapper value={totalLiabilities} />
            </div>
          </div>
          <StatusIndicator status="negative" label="Liability status" className="shrink-0 mt-1" />
        </div>
      </div>

      <div className="rounded-[var(--rl)] border border-border bg-card px-6 py-5 metric-tile">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="metric-label">Net Worth</div>
            <div className={cn('metric-value', netWorth >= 0 ? 'positive' : 'negative')}>
              <PrivacyWrapper value={netWorth} />
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
});
