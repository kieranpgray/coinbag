import { useMemo, useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
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
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { RefreshCw, AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { usePayCycle } from '@/features/transfers/hooks';
import { useIncomes } from '@/features/income/hooks';
import { useCategories } from '@/features/categories/hooks';
import { calculateMonthlyIncome } from '@/features/budget/utils/calculations';
import { calculateMonthlyEquivalent } from '@/features/expenses/utils';
import { findUncategorisedCategoryId } from '@/data/categories/ensureDefaults';
import { filterByExpenseType } from '@/features/budget/utils/filtering';
import { ManualRefreshButton } from '@/components/shared/ManualRefreshButton';
import { PrivacyModeToggle } from '@/components/shared/PrivacyModeToggle';
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
  const { t } = useTranslation(['dashboard', 'common', 'pages', 'navigation']);
  const { payCycle, isLoading: payCycleLoading } = usePayCycle();
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

  useEffect(() => {
    document.title = t('overviewDocumentTitle', { ns: 'pages' });
    return () => {
      document.title = 'Supafolio';
    };
  }, [t]);

  const priceBackedAssets = useMemo(
    () =>
      assets.filter((a) => {
        if (!a.ticker?.trim()) return false;
        return ['Shares', 'RSUs', 'Crypto', 'Other asset', 'Super'].includes(a.type);
      }),
    [assets]
  );

  const handleRetry = () => {
    if (dashboardError) refetchDashboard();
    if (marketError) refetchMarket();
  };

  if (hasError) {
    return (
      <div className="space-y-6">
        <h1 className="page-title">{t('dashboard', { ns: 'navigation' })}</h1>
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

  if (!dashboardData && !isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="page-title">{t('title', { ns: 'dashboard' })}</h1>
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

  return (
    <AnimatePresence mode="wait">
      {isLoading && !dashboardData ? (
        <motion.div
          key="skeleton"
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <div className="space-y-4">
            {/* Page title */}
            <Skeleton className="h-10 w-48" />

            {/* NetWorthCard with chart — fixed height prevents layout jump */}
            <Skeleton className="h-[420px] w-full" />

            {/* Paired summary tiles (Assets/Liabilities) */}
            <div className="grid grid-cols-2 gap-4">
              <Skeleton className="h-28" />
              <Skeleton className="h-28" />
            </div>

            {/* BudgetBreakdownTile */}
            <Skeleton className="h-36 w-full" />

            {/* IncomeSection / ExpensesSection */}
            <div className="grid grid-cols-2 gap-4">
              <Skeleton className="h-44" />
              <Skeleton className="h-44" />
            </div>

            {/* MarketSummary */}
            <Skeleton className="h-24 w-full" />
          </div>
        </motion.div>
      ) : dashboardData && isDashboardEmpty ? (
        <motion.div
          key="dashboard-empty"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <CardBasedFlow />
        </motion.div>
      ) : dashboardData ? (
        <motion.div
          key="content"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <div className="flex flex-col">
            {/* Header section with greeting */}
            <header className="mb-6 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h1 className="page-title">
                  {t('dashboard', { ns: 'navigation' })}
                </h1>
                <p className="page-subtitle">{t('overviewSubtitle', { ns: 'pages' })}</p>
              </div>
              <div className="flex items-center gap-2">
                <PrivacyModeToggle />
                {priceBackedAssets.length > 0 && (
                  <ManualRefreshButton assets={priceBackedAssets} showLabel={false} size="icon" />
                )}
              </div>
            </header>

            {/* Setup Progress - inline onboarding strip */}
            <div className="mb-8">
              <SetupProgress
                progress={dashboardData.setupProgress}
                checklist={dashboardData.setupChecklist}
                isLoading={isLoading}
              />
            </div>

            {/* Net Worth - Full width hero tile */}
            <div className="mb-8">
              <NetWorthCard
                netWorth={dashboardData.netWorth}
                totalAssets={totalAssets}
                totalLiabilities={totalLiabilities}
                change1D={dashboardData.netWorthChange1D}
                change1W={dashboardData.netWorthChange1W}
                isLoading={isLoading}
                isEmpty={!hasAssets && !hasLiabilities}
              />
            </div>

            {/* Asset/Liability breakdowns - responsive two-column grid */}
            <div className="mb-3 grid grid-cols-1 md:grid-cols-2 gap-3">
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
            <div className="mb-10">
              <BudgetBreakdownTile
                totalIncome={totalMonthlyIncome}
                totalExpenses={totalMonthlyExpenses}
                totalSavings={totalMonthlySavings}
                totalRepayments={totalMonthlyRepayments}
                remaining={remaining}
                hasPayCycle={payCycleLoading ? true : Boolean(payCycle)}
                isLoading={isLoading}
                isEmpty={!hasBudgetData}
              />
            </div>

            {/* Expense/Income breakdowns - responsive two-column grid */}
            <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-3">
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

            {/* Market summary */}
            <MarketSummary data={marketData} isLoading={marketLoading} isUnavailable={!marketData} />
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
