import { memo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { PrivacyWrapper } from '@/components/shared/PrivacyWrapper';
import { StatusIndicator } from '@/components/shared/StatusIndicator';

interface BudgetBreakdownTileProps {
  totalIncome: number; // monthly equivalent
  totalExpenses: number; // monthly equivalent, ALL expenses (includes all categories)
  totalSavings: number; // monthly equivalent (for display only, already included in totalExpenses)
  totalRepayments: number; // monthly equivalent (for display only, already included in totalExpenses)
  remaining: number; // monthly equivalent
  isLoading?: boolean;
  isEmpty?: boolean;
}

/**
 * In and Out tile component for dashboard
 * Displays Income, Outgoing (all expenses), and Remaining with status indicators
 * Always shows monthly values (no frequency selector)
 */
export const BudgetBreakdownTile = memo(function BudgetBreakdownTile({
  totalIncome,
  totalExpenses,
  totalSavings: _totalSavings,
  totalRepayments: _totalRepayments,
  remaining,
  isLoading,
  isEmpty,
}: BudgetBreakdownTileProps) {
  // Calculate total outgoing (all expenses - totalMonthlyExpenses already includes ALL expense types)
  const totalOutgoing = totalExpenses;

  if (isLoading) {
    return (
      <Card className="border border-border">
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
      <Card className="border border-border">
        <CardContent className="p-0">
          <div className="p-4">
            <h2 className="text-h2-sm sm:text-h2-md lg:text-h2-lg font-semibold text-foreground mb-4">In and Out</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Add income and expenses to see your in and out breakdown.
            </p>
            <div className="flex gap-2">
              <Button asChild size="sm">
                <Link to="/budget?create=income">Add income</Link>
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link to="/budget?create=expense">Add expense</Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border border-border">
      <CardContent className="p-0">
        {/* Header */}
        <div className="p-4">
          <h2 className="text-h2-sm sm:text-h2-md lg:text-h2-lg font-semibold text-foreground">
            In and Out
          </h2>
        </div>

        {/* Content */}
        <div className="px-4 pb-4 space-y-3">
          {/* Income Row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-body-sm text-muted-foreground">Income</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-body-lg font-bold text-foreground">
                <PrivacyWrapper value={totalIncome} />
              </span>
              <StatusIndicator status="positive" label="Positive status" />
            </div>
          </div>

          {/* Outgoing Row (combined expenses, savings, repayments) */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-body-sm text-muted-foreground">Outgoing</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-body-lg font-bold text-foreground">
                -<PrivacyWrapper value={totalOutgoing} />
              </span>
              <StatusIndicator status="negative" label="Outgoing status" />
            </div>
          </div>

          {/* Separator */}
          <div className="border-t border-border my-2" />

          {/* Remaining Row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-body-sm text-muted-foreground">Remaining</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-body-lg font-bold text-foreground">
                <PrivacyWrapper value={remaining} />
              </span>
              <StatusIndicator
                status={remaining >= 0 ? 'positive' : 'negative'}
                label={remaining >= 0 ? 'Positive status' : 'Negative status'}
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

