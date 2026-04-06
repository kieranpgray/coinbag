import { memo, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

const dsV2 = import.meta.env.VITE_DS_V2 === 'true';

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
  // Transform data for chart and list
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
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (isEmpty) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Liability allocation</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-body text-muted-foreground mb-4">
            Add your first liability to see a breakdown.
          </p>
          <Button asChild size="sm">
            <Link to="/wealth?create=liability">Add liability</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Liability allocation</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-5 lg:grid-cols-12 gap-4 lg:gap-6">
          <div className="md:col-span-2 lg:col-span-5">
            {dsV2 ? (
              <div className="chart-container flex h-full min-h-[200px] items-center justify-center">
                <LiabilitiesAllocationDonut data={chartData} totalBalance={totalBalance} />
              </div>
            ) : (
              <LiabilitiesAllocationDonut data={chartData} totalBalance={totalBalance} />
            )}
          </div>

          <div className="md:col-span-3 lg:col-span-7">
            <LiabilitiesAllocationList data={listData} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

