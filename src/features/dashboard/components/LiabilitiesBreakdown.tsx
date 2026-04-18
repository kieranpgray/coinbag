import { memo, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from 'react-router-dom';
import type { LiabilityBreakdown } from '@/types/domain';
import { LiabilitiesAllocationDonut } from './LiabilitiesAllocationDonut';
import { LiabilitiesAllocationList } from './LiabilitiesAllocationList';
import {
  transformBreakdownForChart,
  transformBreakdownForList,
} from '../utils/liabilityAllocation';

interface LiabilitiesBreakdownProps {
  breakdown: LiabilityBreakdown[];
  totalBalance: number;
  isLoading?: boolean;
  isEmpty?: boolean;
}

export const LiabilitiesBreakdown = memo(function LiabilitiesBreakdown({
  breakdown,
  totalBalance,
  isLoading,
  isEmpty,
}: LiabilitiesBreakdownProps) {
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
                <Skeleton className="h-4 w-40 mb-2" />
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
                <div className="chart-title">{t('allocationBreakdown.liabilityTitle')}</div>
                <div className="chart-subtitle">{t('allocationBreakdown.subtitle')}</div>
              </div>
            </div>
            <p className="text-body text-muted-foreground mb-4">
              {t('allocationBreakdown.emptyLiabilitiesBody')}
            </p>
            <Button asChild size="sm">
              <Link to="/wealth?create=liability">{t('allocationBreakdown.addLiability')}</Link>
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
              <div className="chart-title">{t('allocationBreakdown.liabilityTitle')}</div>
              <div className="chart-subtitle">{t('allocationBreakdown.subtitle')}</div>
            </div>
          </div>
          <div className="flex flex-col md:flex-row flex-wrap items-center gap-8 pt-2">
            <div className="shrink-0 flex justify-center w-full md:w-auto">
              <LiabilitiesAllocationDonut data={chartData} totalBalance={totalBalance} />
            </div>
            <div className="allocation-legend-wrap w-full md:w-auto min-w-0">
              <LiabilitiesAllocationList data={listData} />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});
