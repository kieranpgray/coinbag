import { useMemo } from 'react';
import { useDashboard } from '@/features/dashboard/hooks';
import { useQuery } from '@tanstack/react-query';
import { marketApi } from '@/lib/api';
import { NetWorthCard } from '@/features/dashboard/components/NetWorthCard';
import { SummaryCard } from '@/features/dashboard/components/SummaryCard';
import { SetupProgress } from '@/features/dashboard/components/SetupProgress';
import { MarketSummary } from '@/features/dashboard/components/MarketSummary';
import { AssetsBreakdown } from '@/features/dashboard/components/AssetsBreakdown';
import { LiabilitiesBreakdown } from '@/features/dashboard/components/LiabilitiesBreakdown';
import { ExpenseBreakdown } from '@/features/dashboard/components/ExpenseBreakdown';
import { IncomeBreakdown } from '@/features/dashboard/components/IncomeBreakdown';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { RefreshCw, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';
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
  const { data: dashboardData, isLoading: dashboardLoading, error: dashboardError, refetch: refetchDashboard } = useDashboard();
  const { data: marketData, isLoading: marketLoading, error: marketError, refetch: refetchMarket } = useQuery({
    queryKey: ['market'],
    queryFn: () => marketApi.getSummary(),
  });

  const isLoading = dashboardLoading || marketLoading;
  const hasError = dashboardError || marketError;

  // Extract dataSources safely (hooks must be called unconditionally)
  const dataSources = dashboardData?.dataSources ?? {
    accountsCount: 0,
    assetsCount: 0,
    liabilitiesCount: 0,
    subscriptionsCount: 0,
    transactionsCount: 0,
    incomeCount: 0,
    holdingsCount: 0,
  };

  // Memoize expensive calculations to prevent unnecessary recalculations on re-renders
  // These hooks must be called unconditionally before any early returns
  const assets = dashboardData?.assets ?? [];
  const liabilities = dashboardData?.liabilities ?? [];
  
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
  
  // Check for cash: either accounts OR cash assets
  const hasCashAssets = useMemo(
    () => assets.some(a => a.type === 'Cash'),
    [assets]
  );
  const hasAccounts = useMemo(() => dataSources.accountsCount > 0, [dataSources.accountsCount]);
  const hasCash = useMemo(() => hasAccounts || hasCashAssets, [hasAccounts, hasCashAssets]);
  const hasSubscriptions = useMemo(() => dataSources.subscriptionsCount > 0, [dataSources.subscriptionsCount]);
  const hasIncome = useMemo(() => dataSources.incomeCount > 0, [dataSources.incomeCount]);

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
        <h1 className="text-3xl font-bold">Dashboard</h1>
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
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>No data available</AlertTitle>
          <AlertDescription>
            Get started by adding your first asset, liability, or account.
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
    dataSources.subscriptionsCount > 0 ||
    dataSources.transactionsCount > 0 ||
    dataSources.incomeCount > 0;
  
  const isDashboardEmpty = !hasAnyDataSource; // State A condition

  // Show dashboard-level empty state when all data is empty (State A)
  if (isDashboardEmpty) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <Card>
          <CardContent className="py-12 text-center">
            <div className="mx-auto w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-4">
              <svg
                className="w-12 h-12 text-muted-foreground"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2">Let's set up your Coinbag dashboard</h3>
            <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
              Add a few data sources to start tracking your finances and see meaningful insights here.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center flex-wrap">
              <Button asChild>
                <Link to="/accounts">Add an account</Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/assets?create=1">Add an asset</Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/liabilities?create=1">Add a liability</Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/subscriptions?create=1">Add a subscription</Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/income?create=1">Add income</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
        {/* Header section with greeting */}
        <header>
          <h1 className="text-3xl font-bold">Dashboard</h1>
        </header>

        {/* Setup Progress - pinned sidebar overlay */}
        <SetupProgress
          progress={dashboardData.setupProgress}
          checklist={dashboardData.setupChecklist}
          isLoading={isLoading}
        />

        {/* Net Worth Card */}
        <NetWorthCard
          netWorth={dashboardData.netWorth}
          change1D={dashboardData.netWorthChange1D}
          change1W={dashboardData.netWorthChange1W}
          isLoading={isLoading}
          isEmpty={!hasAssets && !hasLiabilities}
        />

        {/* Summary Cards - responsive grid that wraps gracefully */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <SummaryCard
            title="Investments & Crypto"
            value={dashboardData.investments}
            change1D={dashboardData.investmentsChange1D}
            change1W={dashboardData.investmentsChange1W}
            isLoading={isLoading}
            isEmpty={!hasHoldings}
            emptyText="Add investments to track your portfolio value."
            emptyCtaLabel="Add investment"
            emptyCtaHref="/assets?create=1&type=Investments"
          />
          <SummaryCard
            title="Total Cash"
            value={dashboardData.totalCash}
            change1D={dashboardData.totalCashChange1D}
            change1W={dashboardData.totalCashChange1W}
            isLoading={isLoading}
            isEmpty={!hasCash}
            emptyText="Add cash as an asset to track your cash."
            emptyCtaLabel="Add cash"
            emptyCtaHref="/assets?create=1&type=Cash"
          />
          <SummaryCard
            title="Total Debts"
            value={dashboardData.totalDebts}
            change1D={dashboardData.totalDebtsChange1D}
            change1W={dashboardData.totalDebtsChange1W}
            isLoading={isLoading}
            isEmpty={!hasLiabilities}
            emptyText="Add a liability to track your debts."
            emptyCtaLabel="Add liability"
            emptyCtaHref="/liabilities?create=1"
          />
        </div>

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

        {/* Expense/Income breakdowns - responsive two-column grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ExpenseBreakdown
            breakdown={dashboardData.expenseBreakdown}
            totalAmount={dashboardData.expenseBreakdown.reduce((sum, item) => sum + item.amount, 0)}
            isLoading={isLoading}
            isEmpty={!hasSubscriptions}
          />
          <IncomeBreakdown
            breakdown={dashboardData.incomeBreakdown}
            totalAmount={dashboardData.incomeBreakdown.reduce((sum, item) => sum + item.amount, 0)}
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
                  <p className="text-sm text-muted-foreground mb-4">
                    Add investments to see news related to your holdings.
                  </p>
                  <Button asChild size="sm">
                    <Link to="/assets?create=1&type=Investments">Add investment</Link>
                  </Button>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
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
            <p className="text-sm text-muted-foreground mb-4">
              See your transactions after you connect an account.
            </p>
            <Button asChild size="sm">
              <Link to="/accounts">Add account</Link>
            </Button>
          </CardContent>
        </Card>
    </div>
  );
}
