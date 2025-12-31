import { memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatPercentage } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { PrivacyWrapper } from '@/components/shared/PrivacyWrapper';
import { Link } from 'react-router-dom';

interface NetWorthCardProps {
  netWorth: number;
  change1D: number;
  change1W: number;
  isLoading?: boolean;
  isEmpty?: boolean;
}

export const NetWorthCard = memo(function NetWorthCard({ netWorth, change1D, change1W, isLoading, isEmpty }: NetWorthCardProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-12 w-48 mb-4" />
          <Skeleton className="h-4 w-24" />
        </CardContent>
      </Card>
    );
  }

  if (isEmpty) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Net Worth</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Add assets or liabilities to calculate your net worth.
          </p>
          <div className="flex gap-2">
            <Button asChild size="sm">
              <Link to="/wealth?create=asset">Add asset</Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link to="/wealth?create=liability">Add liability</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Net Worth</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-4xl font-bold mb-4">
          <PrivacyWrapper value={netWorth} />
        </div>
        <div className="flex gap-4 text-sm">
          <div className={change1D >= 0 ? 'text-success' : 'text-error'}>
            1D: {formatPercentage(change1D)}
          </div>
          <div className={change1W >= 0 ? 'text-success' : 'text-error'}>
            1W: {formatPercentage(change1W)}
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

