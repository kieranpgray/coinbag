import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Skeleton } from '@/components/ui/skeleton';
import { PrivacyWrapper } from '@/components/shared/PrivacyWrapper';
import { StatusIndicator } from '@/components/shared/StatusIndicator';
import { cn } from '@/lib/utils';

interface NetWorthSummaryProps {
  netWorth: number;
  totalAssets: number;
  totalLiabilities: number;
  isLoading?: boolean;
  /** Month-over-month note under Net Worth (derived in NetWorthCard) */
  netWorthFootnote?: string | null;
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
  netWorthFootnote,
}: NetWorthSummaryProps) {
  const { t } = useTranslation('pages');

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
            <div className="metric-label">{t('whatYouOwn')}</div>
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
            <div className="metric-label">{t('whatYouOwe')}</div>
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
            {netWorthFootnote ? (
              <p className="text-sm text-muted-foreground mt-1">{netWorthFootnote}</p>
            ) : null}
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
