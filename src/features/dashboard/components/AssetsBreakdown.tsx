import { memo, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
          <Skeleton className="h-6 w-32" />
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
          <CardTitle>Asset allocation</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-body text-muted-foreground mb-4">
            Add your first asset to see a breakdown.
          </p>
          <Button asChild size="sm">
            <Link to="/wealth?create=asset">Add asset</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Asset allocation</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Responsive grid: md 2/5, lg 5/12 chart vs 7/12 list for more list width */}
        <div className="grid grid-cols-1 md:grid-cols-5 lg:grid-cols-12 gap-4 lg:gap-6">
          <div className="md:col-span-2 lg:col-span-5">
            <div className="chart-container flex h-full min-h-[200px] items-center justify-center">
              <AssetAllocationDonut data={chartData} totalValue={totalValue} />
            </div>
          </div>

          <div className="md:col-span-3 lg:col-span-7">
            <AssetAllocationList data={listData} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

