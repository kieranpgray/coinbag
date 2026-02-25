import { useMemo } from 'react';
import { useDashboard } from '@/features/dashboard/hooks';
import { useQuery } from '@tanstack/react-query';
import { marketApi } from '@/lib/api';
import { NetWorthCard } from '@/features/dashboard/components/NetWorthCard';
import { BudgetBreakdownTile } from '@/features/dashboard/components/BudgetBreakdownTile';
import { SetupProgress } from '@/features/dashboard/components/SetupProgress';
import { MarketSummary } from '@/features/dashboard/components/MarketSummary';
import { AssetsBreakdown } from '@/features/dashboard/components/AssetsBreakdown';
import { LiabilitiesBreakdown } from '@/features/dashboard/components/LiabilitiesBreakdown';
import { ExpenseBreakdown } from '@/features/dashboard/components/ExpenseBreakdown';
import { IncomeBreakdown } from '@/features/dashboard/components/IncomeBreakdown';
import { CardBasedFlow } from '@/features/dashboard/components/CardBasedFlow';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { RefreshCw, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useIncomes } from '@/features/income/hooks';
import { useCategories } from '@/features/categories/hooks';
import { calculateMonthlyIncome } from '@/features/budget/utils/calculations';
import { calculateMonthlyEquivalent } from '@/features/expenses/utils';
import { findUncategorisedCategoryId } from '@/data/categories/ensureDefaults';
import { filterByExpenseType } from '@/features/budget/utils/filtering';
import { ManualRefreshButton } from '@/components/shared/ManualRefreshButton';
import type { AssetBreakdown, LiabilityBreakdown } from '@/types/domain';

function calculateAssetBreakdown(assets: { type: string; value: number }[]): AssetBreakdown[] {
  const total = assets.reduce((sum, asset) => sum + asset.value, 0);
  if (total === 0) return [];

  const grouped = assets.reduce(
    (acc, asset) => {
      const type = asset.type as AssetBreakdown['category'];
      if (!acc[type]) {
        acc[type] = 0;
      }
      acc[type] += asset.value;
      return acc;
    },
    {} as Record<string, number>
  );

  return Object.entries(grouped)
    .map(([category, value]) => ({
      category: category as AssetBreakdown['category'],
      value,
      percentage: Math.round((value / total) * 100),
    }))
    .sort((a, b) => b.value - a.value);
}

function calculateLiabilityBreakdown(
  liabilities: { type: string; balance: number }[]
): LiabilityBreakdown[] {
  const total = liabilities.reduce((sum, liability) => sum + liability.balance, 0);
  if (total === 0) return [];

  const grouped = liabilities.reduce(
    (acc, liability) => {
      const type = liability.type as LiabilityBreakdown['category'];
      if (!acc[type]) {
        acc[type] = 0;
      }
      acc[type] += liability.balance;
      return acc;
    },
    {} as Record<string, number>
  );

  return Object.entries(grouped)
    .map(([category, balance]) => ({
      category: category as LiabilityBreakdown['category'],
      balance,
      percentage: Math.round((balance / total) * 100),
    }))
    .sort((a, b) => b.balance - a.balance);
}

export function DashboardPage() {
  const { t } = useTranslation(['dashboard', 'common']);
  const { data: dashboardData, isLoading: dashboardLoading, error: dashboardError, refetch: refetchDashboard } = useDashboard();
  const { data: marketData, isLoading: marketLoading, error: marketError, refetch: refetchMarket } = useQuery({
    queryKey: ['market'],
    queryFn: () => marketApi.getSummary(),
  });
  const { data: incomes = [] } = useIncomes();
  const { data: categories = [] } = useCategories();

  const isLoading = dashboardLoading || marketLoading;
  const hasError = dashboardError || marketError;

  // Extract dataSources safely (hooks must be called unconditionally)
  const dataSources = dashboardData?.dataSources ?? {
    accountsCount: 0,
    assetsCount: 0,
    liabilitiesCount: 0,
    expensesCount: 0,
    transactionsCount: 0,
    incomeCount: 0,
    holdingsCount: 0,
  };

  // Memoize expensive calculations to prevent unnecessary recalculations on re-renders
  // These hooks must be called unconditionally before any early returns
  const assets = useMemo(() => dashboardData?.assets ?? [], [dashboardData?.assets]);
  const liabilities = useMemo(() => dashboardData?.liabilities ?? [], [dashboardData?.liabilities]);
  
  const assetBreakdown = useMemo(
    () => calculateAssetBreakdown(assets),
    [assets]
  );
  
  const liabilityBreakdown = useMemo(
    () => calculateLiabilityBreakdown(liabilities),
    [liabilities]
  );
  
  const totalAssets = useMemo(
    () => assets.reduce((sum, asset) => sum + asset.value, 0),
    [assets]
  );
  
  const totalLiabilities = useMemo(
    () => liabilities.reduce((sum, liability) => sum + liability.balance, 0),
    [liabilities]
  );

  // Memoize empty state flags to prevent recalculation
  const hasAssets = useMemo(() => dataSources.assetsCount > 0, [dataSources.assetsCount]);
  const hasLiabilities = useMemo(() => dataSources.liabilitiesCount > 0, [dataSources.liabilitiesCount]);
  const hasHoldings = useMemo(() => dataSources.holdingsCount > 0, [dataSources.holdingsCount]);
  const hasExpenses = useMemo(() => dataSources.expensesCount > 0, [dataSources.expensesCount]);
  const hasIncome = useMemo(() => dataSources.incomeCount > 0, [dataSources.incomeCount]);

  // In and Out calculations
  const categoryMap = useMemo(() => {
    return new Map(categories.map((c) => [c.id, c.name]));
  }, [categories]);

  const uncategorisedId = useMemo(() => {
    return findUncategorisedCategoryId(categories);
  }, [categories]);

  const expenses = useMemo(() => dashboardData?.expenses ?? [], [dashboardData?.expenses]);

  const totalMonthlyIncome = useMemo(() => {
    return calculateMonthlyIncome(incomes);
  }, [incomes]);

  const totalMonthlySavings = useMemo(() => {
    const savingsExpenses = filterByExpenseType(expenses, 'savings', categoryMap, uncategorisedId);
    return savingsExpenses.reduce((sum, expense) => {
      return sum + calculateMonthlyEquivalent(expense.amount, expense.frequency);
    }, 0);
  }, [expenses, categoryMap, uncategorisedId]);

  const totalMonthlyRepayments = useMemo(() => {
    const repaymentsExpenses = filterByExpenseType(expenses, 'repayments', categoryMap, uncategorisedId);
    return repaymentsExpenses.reduce((sum, expense) => {
      return sum + calculateMonthlyEquivalent(expense.amount, expense.frequency);
    }, 0);
  }, [expenses, categoryMap, uncategorisedId]);


  // Calculate total monthly expenses (ALL expenses dynamically - no hardcoded types)
  const totalMonthlyExpenses = useMemo(() => {
    // Sum ALL expenses dynamically - this ensures future expense types are automatically included
    return expenses.reduce((sum, expense) => {
      return sum + calculateMonthlyEquivalent(expense.amount, expense.frequency);
    }, 0);
  }, [expenses]);

  const remaining = useMemo(() => {
    return totalMonthlyIncome - totalMonthlyExpenses;
  }, [totalMonthlyIncome, totalMonthlyExpenses]);

  const hasBudgetData = useMemo(() => {
    return hasIncome || hasExpenses;
  }, [hasIncome, hasExpenses]);

  const priceBackedAssets = useMemo(
    () =>
      assets.filter((a) => {
        if (!a.ticker?.trim()) return false;
        return ['Stock', 'RSU', 'Crypto', 'Other Investments', 'Superannuation'].includes(a.type);
      }),
    [assets]
  );

  const handleRetry = () => {
    if (dashboardError) refetchDashboard();
    if (marketError) refetchMarket();
  };

  if (isLoading && !dashboardData) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  if (hasError) {
    return (
      <div className="space-y-6">
        <h2 className="text-h1-sm sm:text-h1-md lg:text-h1-lg font-bold">Dashboard</h2>
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Unable to load dashboard</AlertTitle>
          <AlertDescription className="mt-2">
            We couldn't load your financial data. This might be a temporary issue.
          </AlertDescription>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRetry}
            className="mt-4"
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Try again
          </Button>
        </Alert>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="space-y-6">
        <h2 className="text-h1-sm sm:text-h1-md lg:text-h1-lg font-bold">{t('title', { ns: 'dashboard' })}</h2>
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>{t('noDataAvailable', { ns: 'dashboard' })}</AlertTitle>
          <AlertDescription>
            {t('getStarted', { ns: 'dashboard' })}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Check if dashboard is truly empty (State A vs State B/C)
  // State A: ALL meaningful data sources are zero → show dashboard-level empty state only
  // State B: ANY source exists → render full grid with tiles
  // State C: all core sources exist OR setupProgress=100% → same as B, but all core tiles populated
  const hasAnyDataSource = 
    dataSources.accountsCount > 0 ||
    dataSources.assetsCount > 0 ||
    dataSources.liabilitiesCount > 0 ||
    dataSources.expensesCount > 0 ||
    dataSources.transactionsCount > 0 ||
    dataSources.incomeCount > 0;
  
  const isDashboardEmpty = !hasAnyDataSource; // State A condition

  // Show dashboard-level empty state when all data is empty (State A)
  if (isDashboardEmpty) {
    return <CardBasedFlow />;
  }

  return (
    <div className="space-y-6">
        {/* Header section with greeting */}
        <header className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-h1-sm sm:text-h1-md lg:text-h1-lg font-bold">Dashboard</h1>
          {priceBackedAssets.length > 0 && (
            <ManualRefreshButton assets={priceBackedAssets} showLabel={false} size="icon" />
          )}
        </header>

        {/* Setup Progress - pinned sidebar overlay */}
        <SetupProgress
          progress={dashboardData.setupProgress}
          checklist={dashboardData.setupChecklist}
          isLoading={isLoading}
        />

        {/* Net Worth - Full width hero tile */}
        <NetWorthCard
          netWorth={dashboardData.netWorth}
          totalAssets={totalAssets}
          totalLiabilities={totalLiabilities}
          change1D={dashboardData.netWorthChange1D}
          change1W={dashboardData.netWorthChange1W}
          isLoading={isLoading}
          isEmpty={!hasAssets && !hasLiabilities}
        />

        {/* Asset/Liability breakdowns - responsive two-column grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <AssetsBreakdown
            breakdown={assetBreakdown}
            totalValue={totalAssets}
            isLoading={isLoading}
            isEmpty={!hasAssets}
          />
          <LiabilitiesBreakdown
            breakdown={liabilityBreakdown}
            totalBalance={totalLiabilities}
            isLoading={isLoading}
            isEmpty={!hasLiabilities}
          />
        </div>

        {/* Budget Breakdown - Standalone full width */}
        <BudgetBreakdownTile
          totalIncome={totalMonthlyIncome}
          totalExpenses={totalMonthlyExpenses}
          totalSavings={totalMonthlySavings}
          totalRepayments={totalMonthlyRepayments}
          remaining={remaining}
          isLoading={isLoading}
          isEmpty={!hasBudgetData}
        />

        {/* Expense/Income breakdowns - responsive two-column grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ExpenseBreakdown
            breakdown={dashboardData.expenseBreakdown}
            totalAmount={(dashboardData.expenseBreakdown ?? []).reduce((sum, item) => sum + item.amount, 0)}
            isLoading={isLoading}
            isEmpty={!hasExpenses}
          />
          <IncomeBreakdown
            breakdown={dashboardData.incomeBreakdown}
            totalAmount={(dashboardData.incomeBreakdown ?? []).reduce((sum, item) => sum + item.amount, 0)}
            isLoading={isLoading}
            isEmpty={!hasIncome}
          />
        </div>

        {/* Market summary and Latest News - 50/50 split on desktop */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <MarketSummary data={marketData} isLoading={marketLoading} isUnavailable={!marketData} />
          
          <Card>
            <CardHeader>
              <CardTitle>Latest News</CardTitle>
            </CardHeader>
            <CardContent>
              {!hasHoldings ? (
                <>
                  <p className="text-body text-muted-foreground mb-4">
                    Add investments to see news related to your holdings.
                  </p>
                  <Button asChild size="sm">
                    <Link to="/app/wealth?create=asset&type=Other Investments">Add investment</Link>
                  </Button>
                </>
              ) : (
                <p className="text-body text-muted-foreground">
                  No news available for your holdings.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent Transactions - full width below Market Summary and Latest News */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-body text-muted-foreground mb-4">
              See your transactions after you connect an account.
            </p>
            <Button asChild size="sm">
              <Link to="/app/accounts">Add account</Link>
            </Button>
          </CardContent>
        </Card>
    </div>
  );
}
