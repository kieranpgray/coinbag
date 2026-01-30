import { memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { PrivacyWrapper } from '@/components/shared/PrivacyWrapper';
import { Link } from 'react-router-dom';
import type { AssetBreakdown } from '@/types/domain';

interface AssetsBreakdownProps {
  breakdown: AssetBreakdown[];
  totalValue: number;
  isLoading?: boolean;
  isEmpty?: boolean;
}

export const AssetsBreakdown = memo(function AssetsBreakdown({ breakdown, totalValue, isLoading, isEmpty }: AssetsBreakdownProps) {
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
          <CardTitle>Assets Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
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
        <CardTitle>Assets Breakdown</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <div className="text-xl font-bold mb-2">
            <PrivacyWrapper value={totalValue} />
          </div>
        </div>
        <div className="space-y-3">
          {breakdown.map((item) => (
            <div key={item.category}>
              <div className="flex justify-between mb-1">
                <span className="text-sm font-medium">{item.category}</span>
                <span className="text-sm text-muted-foreground">{item.percentage}%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full"
                  style={{ width: `${item.percentage}%` }}
                />
              </div>
            </div>
          ))}
        </div>
        <Link
          to="/app/wealth"
          className="mt-4 inline-block text-sm text-primary hover:underline"
        >
          View all assets →
        </Link>
      </CardContent>
    </Card>
  );
});

