import { memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { PrivacyWrapper } from '@/components/shared/PrivacyWrapper';
import { Link } from 'react-router-dom';
import type { IncomeBreakdown as IncomeBreakdownType } from '@/types/domain';

interface IncomeBreakdownComponentProps {
  breakdown: IncomeBreakdownType[];
  totalAmount: number;
  isLoading?: boolean;
  isEmpty?: boolean;
}

export const IncomeBreakdown = memo(function IncomeBreakdownComponent({
  breakdown,
  totalAmount,
  isLoading,
  isEmpty,
}: IncomeBreakdownComponentProps) {
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
          <CardTitle>Income Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Add income sources to see your income breakdown.
          </p>
          <Button asChild size="sm">
            <Link to="/budget?create=income">Add income</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Income Breakdown</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <div className="text-2xl font-bold mb-2">
            <PrivacyWrapper value={totalAmount} />
          </div>
          <p className="text-sm text-muted-foreground">Monthly recurring income</p>
        </div>
        <div className="space-y-3">
          {breakdown.map((item: IncomeBreakdownType) => (
            <div key={item.category}>
              <div className="flex justify-between mb-1">
                <span className="text-sm font-medium">{item.category}</span>
                <span className="text-sm text-muted-foreground">{item.percentage}%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className="bg-green-500 h-2 rounded-full"
                  style={{ width: `${item.percentage}%` }}
                />
              </div>
            </div>
          ))}
        </div>
        <Link
          to="/accounts"
          className="mt-4 inline-block text-sm text-primary hover:underline"
        >
          View all accounts →
        </Link>
      </CardContent>
    </Card>
  );
});
