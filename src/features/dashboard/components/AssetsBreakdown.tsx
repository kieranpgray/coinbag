import { memo, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from 'react-router-dom';
import type { AssetBreakdown } from '@/types/domain';
import { AssetAllocationDonut } from './AssetAllocationDonut';
import { AssetAllocationList } from './AssetAllocationList';
import {
  transformBreakdownForChart,
  transformBreakdownForList,
} from '../utils/assetAllocation';

interface AssetsBreakdownProps {
  breakdown: AssetBreakdown[];
  totalValue: number;
  isLoading?: boolean;
  isEmpty?: boolean;
}

export const AssetsBreakdown = memo(function AssetsBreakdown({
  breakdown,
  totalValue,
  isLoading,
  isEmpty,
}: AssetsBreakdownProps) {
  const { t } = useTranslation('pages');

  const chartData = useMemo(
    () => transformBreakdownForChart(breakdown),
    [breakdown]
  );
  const listData = useMemo(
    () => transformBreakdownForList(breakdown),
    [breakdown]
  );

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-0">
          <div className="chart-container chart-container--in-card">
            <div className="chart-header">
              <div>
                <Skeleton className="h-4 w-36 mb-2" />
                <Skeleton className="h-3 w-28" />
              </div>
            </div>
            <div className="flex flex-col md:flex-row flex-wrap items-center gap-8 pt-2">
              <Skeleton className="aspect-square min-h-[180px] min-w-[180px] max-w-[220px] w-full rounded-full mx-auto shrink-0" />
              <div className="allocation-legend-wrap space-y-2 w-full">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isEmpty) {
    return (
      <Card>
        <CardContent className="p-0">
          <div className="chart-container chart-container--in-card">
            <div className="chart-header">
              <div>
                <div className="chart-title">{t('allocationBreakdown.assetTitle')}</div>
                <div className="chart-subtitle">{t('allocationBreakdown.subtitle')}</div>
              </div>
            </div>
            <p className="text-body text-muted-foreground mb-4">
              {t('allocationBreakdown.emptyAssetsBody')}
            </p>
            <Button asChild size="sm">
              <Link to="/wealth?create=asset">{t('allocationBreakdown.addAsset')}</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <div className="chart-container chart-container--in-card">
          <div className="chart-header">
            <div>
              <div className="chart-title">{t('allocationBreakdown.assetTitle')}</div>
              <div className="chart-subtitle">{t('allocationBreakdown.subtitle')}</div>
            </div>
          </div>
          <div className="flex flex-col md:flex-row flex-wrap items-center gap-8 pt-2">
            <div className="shrink-0 flex justify-center w-full md:w-auto">
              <AssetAllocationDonut data={chartData} totalValue={totalValue} />
            </div>
            <div className="allocation-legend-wrap w-full md:w-auto min-w-0">
              <AssetAllocationList data={listData} />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});
