import type {
  Asset,
  Liability,
  Account,
  Subscription,
  Income,
  AssetBreakdown,
  LiabilityBreakdown,
  ExpenseBreakdown,
  IncomeBreakdown,
} from '@/types/domain';

/**
 * Simple memoization utility
 */
function memoize<Args extends unknown[], R>(
  fn: (...args: Args) => R,
  getKey?: (...args: Args) => string
): ((...args: Args) => R) & { cache: Map<string, R> } {
  const cache = new Map<string, R>();
  const memoized = ((...args: Args) => {
    const key = getKey ? getKey(...args) : JSON.stringify(args);
    if (cache.has(key)) {
      return cache.get(key)!;
    }
    const result = fn(...args);
    cache.set(key, result);
    return result;
  }) as ((...args: Args) => R) & { cache: Map<string, R> };

  memoized.cache = cache;
  return memoized;
}

/**
 * Dashboard calculation service with memoized expensive operations
 */

// Memoized calculation functions
const calculateAssetBreakdownMemoized = memoize(
  (assets: Asset[]): AssetBreakdown[] => {
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
  },
  // Custom cache key based on asset values and types
  (assets) => assets.map(a => `${a.id}-${a.value}-${a.type}`).sort().join('|')
);

const calculateLiabilityBreakdownMemoized = memoize(
  (liabilities: Liability[]): LiabilityBreakdown[] => {
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
  },
  // Custom cache key
  (liabilities) => liabilities.map(l => `${l.id}-${l.balance}-${l.type}`).sort().join('|')
);

const calculateExpenseBreakdownMemoized = memoize(
  (subscriptions: Subscription[]): ExpenseBreakdown[] => {
    const expenseTotals: Record<string, number> = {};
    subscriptions.forEach((sub) => {
      expenseTotals[sub.categoryId] = (expenseTotals[sub.categoryId] || 0) + sub.amount;
    });

    const totalExpenses = Object.values(expenseTotals).reduce((sum, amount) => sum + amount, 0);
    if (totalExpenses === 0) return [];

    return Object.entries(expenseTotals)
      .map(([categoryId, amount]) => ({
        category: categoryId, // Note: This should be resolved to category name in real implementation
        amount,
        percentage: Math.round((amount / totalExpenses) * 100),
      }))
      .sort((a, b) => b.amount - a.amount);
  },
  // Custom cache key
  (subscriptions) => subscriptions.map(s => `${s.id}-${s.amount}-${s.categoryId}`).sort().join('|')
);

const calculateIncomeBreakdownMemoized = memoize(
  (incomes: Income[]): IncomeBreakdown[] => {
    // Convert income frequency to monthly equivalent for consistent comparison
    const frequencyMultipliers: Record<string, number> = {
      weekly: 4.33,      // ~4.33 weeks per month
      fortnightly: 2.167, // ~2.167 fortnights per month
      monthly: 1,
      yearly: 1 / 12,
    };

    const incomeTotals: Record<string, number> = {};
    incomes.forEach((income) => {
      const multiplier = frequencyMultipliers[income.frequency] || 1;
      const monthlyAmount = income.amount * multiplier;
      // Use income source as category (Salary, Freelance, Business, etc.)
      const category = income.source;
      incomeTotals[category] = (incomeTotals[category] || 0) + monthlyAmount;
    });

    const totalIncome = Object.values(incomeTotals).reduce((sum, amount) => sum + amount, 0);
    if (totalIncome === 0) return [];

    return Object.entries(incomeTotals)
      .map(([category, amount]) => ({
        category,
        amount: Math.round(amount),
        percentage: Math.round((amount / totalIncome) * 100),
      }))
      .sort((a, b) => b.amount - a.amount);
  },
  // Custom cache key based on income data
  (incomes) => incomes.map(i => `${i.id}-${i.amount}-${i.frequency}-${i.source}`).sort().join('|')
);

/**
 * Main calculation functions that use memoization
 */
export const DashboardCalculations = {
  calculateAssetBreakdown: calculateAssetBreakdownMemoized,
  calculateLiabilityBreakdown: calculateLiabilityBreakdownMemoized,
  calculateExpenseBreakdown: calculateExpenseBreakdownMemoized,
  calculateIncomeBreakdown: calculateIncomeBreakdownMemoized,

  /**
   * Calculate all dashboard metrics at once
   */
  calculateAll: memoize(
    (assets: Asset[], liabilities: Liability[], accounts: Account[], subscriptions: Subscription[], incomes: Income[] = []) => {
      const totalAssets = assets.reduce((sum, asset) => sum + asset.value, 0);
      const totalLiabilities = liabilities.reduce((sum, liability) => sum + liability.balance, 0);
      const netWorth = totalAssets - totalLiabilities;

      const holdingsAssets = assets.filter((a) => a.type === 'Investments' || a.type === 'Crypto');
      const investments = holdingsAssets.reduce((sum, asset) => sum + asset.value, 0);

      // Calculate total cash from both accounts and cash assets
      const cashFromAccounts = accounts
        .filter((a) => a.accountType === 'Checking' || a.accountType === 'Savings')
        .reduce((sum, account) => sum + account.balance, 0);
      
      const cashFromAssets = assets
        .filter((a) => a.type === 'Cash')
        .reduce((sum, asset) => sum + asset.value, 0);
      
      const totalCash = cashFromAccounts + cashFromAssets;

      const totalDebts = totalLiabilities;

      // Deterministic change calculations based on data characteristics
      // In a real app, these would come from historical data comparison
      const dataHash = `${totalAssets}-${totalLiabilities}-${investments}`.split('').reduce((a, b) => {
        a = ((a << 5) - a) + b.charCodeAt(0);
        return a & a;
      }, 0);

      // Generate consistent "change" values based on data hash
      const netWorthChange1D = ((dataHash % 200) - 100) / 100; // -1% to +1%
      const netWorthChange1W = ((dataHash % 600) - 300) / 100; // -3% to +3%

      const investmentsChange1D = ((dataHash % 400) - 200) / 100; // -2% to +2%
      const investmentsChange1W = ((dataHash % 1000) - 500) / 100; // -5% to +5%

      const cashChange1D = 0;
      const cashChange1W = 0;

      const debtsChange1D = 0;
      const debtsChange1W = 0;

      const estimatedTaxOnGains = Math.max(0, investments * 0.15); // 15% estimated tax
      const adjustedNetWorth = netWorth - estimatedTaxOnGains;

      // Explicit data source presence counts (count > 0 = exists)
      const dataSources = {
        accountsCount: accounts.length,
        assetsCount: assets.length,
        liabilitiesCount: liabilities.length,
        subscriptionsCount: subscriptions.length,
        transactionsCount: 0, // TODO: wire up when transactions are integrated
        incomeCount: incomes.length,
        holdingsCount: holdingsAssets.length,
      };

      return {
        netWorth,
        netWorthChange1D: Math.round(netWorthChange1D * 100) / 100,
        netWorthChange1W: Math.round(netWorthChange1W * 100) / 100,
        investments,
        investmentsChange1D: Math.round(investmentsChange1D * 100) / 100,
        investmentsChange1W: Math.round(investmentsChange1W * 100) / 100,
        totalCash,
        totalCashChange1D: cashChange1D,
        totalCashChange1W: cashChange1W,
        totalDebts,
        totalDebtsChange1D: debtsChange1D,
        totalDebtsChange1W: debtsChange1W,
        estimatedTaxOnGains,
        adjustedNetWorth,
        assetBreakdown: calculateAssetBreakdownMemoized(assets),
        liabilityBreakdown: calculateLiabilityBreakdownMemoized(liabilities),
        expenseBreakdown: calculateExpenseBreakdownMemoized(subscriptions),
        incomeBreakdown: calculateIncomeBreakdownMemoized(incomes),
        dataSources,
      };
    },
    // Complex cache key for all parameters
    (assets, liabilities, accounts, subscriptions, incomes) =>
      `${assets.map(a => `${a.id}-${a.value}`).sort().join('|')}|${liabilities.map(l => `${l.id}-${l.balance}`).sort().join('|')}|${accounts.map(a => `${a.id}-${a.balance}`).sort().join('|')}|${subscriptions.map(s => `${s.id}-${s.amount}`).sort().join('|')}|${incomes.map(i => `${i.id}-${i.amount}`).sort().join('|')}`
  ),

  /**
   * Clear all memoization caches (useful for testing or when data changes significantly)
   */
  clearCache: () => {
    calculateAssetBreakdownMemoized.cache.clear?.();
    calculateLiabilityBreakdownMemoized.cache.clear?.();
    calculateExpenseBreakdownMemoized.cache.clear?.();
    calculateIncomeBreakdownMemoized.cache.clear?.();
    DashboardCalculations.calculateAll.cache.clear?.();
  },
};
