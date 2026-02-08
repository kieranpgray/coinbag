import { memo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { PrivacyWrapper } from '@/components/shared/PrivacyWrapper';

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
    <div className="space-y-4">
      {/* Assets Row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-body-sm text-muted-foreground">Assets</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-body-lg font-bold text-foreground">
            <PrivacyWrapper value={totalAssets} />
          </span>
          <div className="h-2 w-2 rounded-full bg-success" aria-label="Positive status" />
        </div>
      </div>

      {/* Liabilities Row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-body-sm text-muted-foreground">Liabilities</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-body-lg font-bold text-foreground">
            -<PrivacyWrapper value={totalLiabilities} />
          </span>
          <div className="h-2 w-2 rounded-full bg-error" aria-label="Liability status" />
        </div>
      </div>

      {/* Separator */}
      <div className="border-t border-neutral-200 my-2" />

      {/* Net Worth Row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-body-sm text-muted-foreground">Net Worth</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-body-lg font-bold text-foreground">
            <PrivacyWrapper value={netWorth} />
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
  );
});
