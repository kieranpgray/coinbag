import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { PrivacyWrapper } from '@/components/shared/PrivacyWrapper';
import { StatusIndicator } from '@/components/shared/StatusIndicator';
import { ROUTES } from '@/lib/constants/routes';
import { SurplusCard } from '@/components/ui/surplus-card';
import { EmptyState } from '@/components/ui/empty-state';

interface BudgetBreakdownTileProps {
  totalIncome: number; // monthly equivalent
  totalExpenses: number; // monthly equivalent, ALL expenses (includes all categories)
  totalSavings: number; // monthly equivalent (for display only, already included in totalExpenses)
  totalRepayments: number; // monthly equivalent (for display only, already included in totalExpenses)
  remaining: number; // monthly equivalent
  /** When false, show pay-cycle setup hint under the tile title */
  hasPayCycle?: boolean;
  isLoading?: boolean;
  isEmpty?: boolean;
}

/**
 * Pay cycle tile for dashboard (monthly equivalents).
 * Shows income, committed expenses, and surplus with status indicators.
 */
export const BudgetBreakdownTile = memo(function BudgetBreakdownTile({
  totalIncome,
  totalExpenses,
  totalSavings: _totalSavings,
  totalRepayments: _totalRepayments,
  remaining,
  hasPayCycle = true,
  isLoading,
  isEmpty,
}: BudgetBreakdownTileProps) {
  const { t } = useTranslation('pages');
  const showPayCycleFallback = hasPayCycle === false;
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
          <EmptyState
            title="No income tracked"
            body="Add your salary or other income to see your cashflow."
            action={
              <Button asChild size="sm">
                <Link to={ROUTES.app.budget + '?create=income'}>Add income</Link>
              </Button>
            }
          />
          <div className="border-t border-border" />
          <EmptyState
            title="No recurring expenses"
            body="Add bills, subscriptions and regular payments."
            action={
              <Button asChild size="sm" variant="outline">
                <Link to={ROUTES.app.budget + '?create=expense'}>Add expense</Link>
              </Button>
            }
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border border-border">
      <CardContent className="p-0">
        <div className="p-4">
          <h2 className="text-h2-sm sm:text-h2-md lg:text-h2-lg font-medium text-foreground">
            {t('budgetBreakdownTile.title')}
          </h2>
          {showPayCycleFallback ? (
            <p className="text-sm text-muted-foreground mt-1">{t('budgetBreakdownTile.setUpIncomeHint')}</p>
          ) : null}
        </div>

        <div className="px-4 pb-4 space-y-3">
          <div className="income-card">
            <div className="income-label">{t('budgetBreakdownTile.incomeArriving')}</div>
            <div className="income-amount">
              <PrivacyWrapper value={totalIncome} />
            </div>
          </div>

          <div className="metric-tile">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="metric-label">{t('budgetBreakdownTile.committedExpenses')}</div>
                <div className="num-balance">
                  -<PrivacyWrapper value={totalOutgoing} />
                </div>
              </div>
              <StatusIndicator status="negative" label="Outgoing status" className="shrink-0 mt-1" />
            </div>
          </div>

          <SurplusCard amount={remaining} />

          <div className="pt-1">
            <Button variant="link" className="h-auto p-0 text-muted-foreground" asChild>
              <Link to={ROUTES.app.transfers}>{t('budgetBreakdownTile.openAllocate')}</Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});
