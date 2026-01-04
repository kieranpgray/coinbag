import { memo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { PrivacyWrapper } from '@/components/shared/PrivacyWrapper';
import { Link } from 'react-router-dom';

interface NetWorthCardProps {
  netWorth: number;
  totalAssets: number;
  totalLiabilities: number;
  change1D: number;
  change1W: number;
  isLoading?: boolean;
  isEmpty?: boolean;
}

export const NetWorthCard = memo(function NetWorthCard({ 
  netWorth, 
  totalAssets, 
  totalLiabilities, 
  change1D, 
  change1W, 
  isLoading, 
  isEmpty 
  change1D: _change1D,
  change1W: _change1W,
}: NetWorthCardProps) {
  if (isLoading) {
    return (
      <Card className="border border-neutral-200">
        <CardContent className="p-0">
          <div className="p-4">
            <Skeleton className="h-6 w-32 mb-4" />
            <Skeleton className="h-8 w-full mb-3" />
            <Skeleton className="h-8 w-full mb-3" />
            <Skeleton className="h-8 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isEmpty) {
    return (
      <Card className="border border-neutral-200">
        <CardContent className="p-0">
          <div className="p-4">
            <h2 className="text-lg font-semibold text-foreground mb-4">Net Worth</h2>
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
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border border-neutral-200">
      <CardContent className="p-0">
        {/* Header */}
        <div className="p-4">
          <h2 className="text-lg font-semibold text-foreground">
            Net Worth
          </h2>
        </div>

        {/* Content */}
        <div className="px-4 pb-4 space-y-3">
          {/* Assets Row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Assets</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold text-foreground">
                <PrivacyWrapper value={totalAssets} />
              </span>
              <div className="h-2 w-2 rounded-full bg-success" aria-label="Positive status" />
            </div>
          </div>

          {/* Liabilities Row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Liabilities</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold text-foreground">
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
              <span className="text-sm text-muted-foreground">Net Worth</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold text-foreground">
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
      </CardContent>
    </Card>
  );
});

