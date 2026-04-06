import { memo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { PrivacyWrapper } from '@/components/shared/PrivacyWrapper';
import { StatusIndicator } from '@/components/shared/StatusIndicator';
import { cn } from '@/lib/utils';

const dsV2 = import.meta.env.VITE_DS_V2 === 'true';

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
      <div
        className={cn(
          'rounded-[var(--rl)] border border-border bg-card px-6 py-5',
          dsV2 && 'metric-tile'
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className={cn(dsV2 ? 'metric-label' : 'text-body-sm text-muted-foreground')}>
              Assets
            </div>
            <div className={cn(dsV2 ? 'metric-value' : 'text-body-lg font-bold text-foreground')}>
              <PrivacyWrapper value={totalAssets} />
            </div>
          </div>
          <StatusIndicator status="positive" label="Positive status" className="shrink-0 mt-1" />
        </div>
      </div>

      <div
        className={cn(
          'rounded-[var(--rl)] border border-border bg-card px-6 py-5',
          dsV2 && 'metric-tile'
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className={cn(dsV2 ? 'metric-label' : 'text-body-sm text-muted-foreground')}>
              Liabilities
            </div>
            <div className={cn(dsV2 ? 'metric-value' : 'text-body-lg font-bold text-foreground')}>
              -<PrivacyWrapper value={totalLiabilities} />
            </div>
          </div>
          <StatusIndicator status="negative" label="Liability status" className="shrink-0 mt-1" />
        </div>
      </div>

      <div
        className={cn(
          'rounded-[var(--rl)] border border-border bg-card px-6 py-5',
          dsV2 && 'metric-tile'
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className={cn(dsV2 ? 'metric-label' : 'text-body-sm text-muted-foreground')}>
              Net Worth
            </div>
            <div
              className={cn(
                dsV2 ? 'metric-value' : 'text-body-lg font-bold text-foreground',
                dsV2 && (netWorth >= 0 ? 'positive' : 'negative')
              )}
            >
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
