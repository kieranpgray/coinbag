import { memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { PrivacyWrapper } from '@/components/shared/PrivacyWrapper';
import { Link } from 'react-router-dom';
import { useCategories } from '@/features/categories/hooks';
import type { ExpenseBreakdown as ExpenseBreakdownType } from '@/types/domain';

interface ExpenseBreakdownComponentProps {
  breakdown: ExpenseBreakdownType[];
  totalAmount: number;
  isLoading?: boolean;
  isEmpty?: boolean;
}

export const ExpenseBreakdown = memo(function ExpenseBreakdownComponent({
  breakdown,
  totalAmount,
  isLoading,
  isEmpty,
}: ExpenseBreakdownComponentProps) {
  const { data: categories = [] } = useCategories();
  const categoryNameById = new Map(categories.map((c) => [c.id, c.name]));

  // Resolve category IDs to names
  const breakdownWithNames = breakdown.map((item: ExpenseBreakdownType) => ({
    ...item,
    categoryId: item.category, // Preserve original ID for key
    categoryName: categoryNameById.get(item.category) || 'Uncategorized',
  }));

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
          <CardTitle>Expense Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Add subscriptions or transactions to see where your money goes.
          </p>
          <div className="flex gap-2">
            <Button asChild size="sm">
              <Link to="/subscriptions?create=1">Add subscription</Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link to="/transactions">Add transaction</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Expense Breakdown</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <div className="text-2xl font-bold mb-2">
            <PrivacyWrapper value={totalAmount} />
          </div>
          <p className="text-sm text-muted-foreground">Monthly recurring expenses</p>
        </div>
        <div className="space-y-3">
          {breakdownWithNames.map((item: typeof breakdownWithNames[0]) => (
            <div key={item.categoryId}>
              <div className="flex justify-between mb-1">
                <span className="text-sm font-medium">{item.categoryName}</span>
                <span className="text-sm text-muted-foreground">{item.percentage}%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className="bg-orange-500 h-2 rounded-full"
                  style={{ width: `${item.percentage}%` }}
                />
              </div>
            </div>
          ))}
        </div>
        <Link
          to="/subscriptions"
          className="mt-4 inline-block text-sm text-primary hover:underline"
        >
          View all subscriptions →
        </Link>
      </CardContent>
    </Card>
  );
});
