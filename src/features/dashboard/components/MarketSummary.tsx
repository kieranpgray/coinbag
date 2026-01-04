import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatPercentage } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from 'react-router-dom';
import type { MarketSummary as MarketSummaryType } from '@/types/domain';

interface MarketSummaryProps {
  data?: MarketSummaryType;
  isLoading?: boolean;
  isUnavailable?: boolean;
}

export function MarketSummary({ data, isLoading, isUnavailable }: MarketSummaryProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-3/4" />
        </CardContent>
      </Card>
    );
  }

  if (isUnavailable || !data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Market Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Connect market data to see market insights.
          </p>
          <Button asChild size="sm">
            <Link to="/app/settings">Connect market data</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Market Summary</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <div className="text-lg font-semibold mb-2">S&P 500</div>
          <div className="flex gap-4 text-sm">
            <div className={data.sp500.change1D >= 0 ? 'text-success' : 'text-error'}>
              1D: {formatPercentage(data.sp500.change1D)}
            </div>
            <div className={data.sp500.change7D >= 0 ? 'text-success' : 'text-error'}>
              7D: {formatPercentage(data.sp500.change7D)}
            </div>
            <div className={data.sp500.change30D >= 0 ? 'text-success' : 'text-error'}>
              30D: {formatPercentage(data.sp500.change30D)}
            </div>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">{data.commentary}</p>
      </CardContent>
    </Card>
  );
}

