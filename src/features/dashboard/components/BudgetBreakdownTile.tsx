import { memo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { PrivacyWrapper } from '@/components/shared/PrivacyWrapper';
import { StatusIndicator } from '@/components/shared/StatusIndicator';
import { cn } from '@/lib/utils';

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
            <p className="text-body text-muted-foreground mb-4">
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
        <div className="p-4">
          <h2 className="text-h2-sm sm:text-h2-md lg:text-h2-lg font-semibold text-foreground">
            In and Out
          </h2>
        </div>

        <div className="px-4 pb-4 space-y-3">
          <div className="rounded-[var(--rl)] border border-border bg-card px-6 py-5 metric-tile">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="metric-label">Income</div>
                <div className="metric-value">
                  <PrivacyWrapper value={totalIncome} />
                </div>
              </div>
              <StatusIndicator status="positive" label="Positive status" className="shrink-0 mt-1" />
            </div>
          </div>

          <div className="rounded-[var(--rl)] border border-border bg-card px-6 py-5 metric-tile">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="metric-label">Outgoing</div>
                <div className="metric-value">
                  -<PrivacyWrapper value={totalOutgoing} />
                </div>
              </div>
              <StatusIndicator status="negative" label="Outgoing status" className="shrink-0 mt-1" />
            </div>
          </div>

          <div className="rounded-[var(--rl)] border border-border bg-card px-6 py-5 metric-tile">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="metric-label">Remaining</div>
                <div className={cn('metric-value', remaining >= 0 ? 'positive' : 'negative')}>
                  <PrivacyWrapper value={remaining} />
                </div>
              </div>
              <StatusIndicator
                status={remaining >= 0 ? 'positive' : 'negative'}
                label={remaining >= 0 ? 'Positive status' : 'Negative status'}
                className="shrink-0 mt-1"
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});
