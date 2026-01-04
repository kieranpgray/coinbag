import { memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { PrivacyWrapper } from '@/components/shared/PrivacyWrapper';
import { Link } from 'react-router-dom';
import type { LiabilityBreakdown } from '@/types/domain';

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
          <CardTitle>Liabilities Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
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
        <CardTitle>Liabilities Breakdown</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <div className="text-2xl font-bold mb-2">
            <PrivacyWrapper value={totalBalance} />
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
                  className="bg-destructive h-2 rounded-full"
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
          View all liabilities →
        </Link>
      </CardContent>
    </Card>
  );
});

