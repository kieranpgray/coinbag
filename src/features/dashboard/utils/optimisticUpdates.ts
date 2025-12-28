import type { QueryClient } from '@tanstack/react-query';
import type { DashboardData, Asset, Liability, Account, Subscription, Income } from '@/types/domain';
import { calculateDashboardData } from '@/mocks/factories';

/**
 * Helper to get related data from query cache for dashboard calculations
 */
function getRelatedData(queryClient: QueryClient) {
  const accounts = queryClient.getQueryData<Account[]>(['accounts']) || [];
  const subscriptions = queryClient.getQueryData<Subscription[]>(['subscriptions']) || [];
  const incomes = queryClient.getQueryData<Income[]>(['incomes']) || [];
  return { accounts, subscriptions, incomes };
}

/**
 * Optimistically update dashboard cache without refetching
 * This dramatically improves mutation response time by avoiding full dashboard refetch
 */
export function updateDashboardOptimistically(
  queryClient: QueryClient,
  updater: (data: DashboardData) => DashboardData
): void {
  queryClient.setQueryData<DashboardData>(['dashboard'], (oldData) => {
    if (!oldData) return oldData;
    return updater(oldData);
  });
}

/**
 * Optimistically add an asset to the dashboard
 */
export function addAssetOptimistically(
  queryClient: QueryClient,
  newAsset: Asset
): void {
  updateDashboardOptimistically(queryClient, (data) => {
    const { accounts, subscriptions, incomes } = getRelatedData(queryClient);
    const updatedAssets = [...data.assets, newAsset];
    const calculated = calculateDashboardData(
      updatedAssets,
      data.liabilities,
      accounts,
      subscriptions,
      incomes
    );
    
    const holdingsCount = updatedAssets.filter(a => a.type === 'Investments' || a.type === 'Crypto').length;
    
    return {
      ...data,
      ...calculated,
      assets: updatedAssets,
      dataSources: {
        ...data.dataSources,
        assetsCount: updatedAssets.length,
        holdingsCount,
      },
    };
  });
}

/**
 * Optimistically update an asset in the dashboard
 */
export function updateAssetOptimistically(
  queryClient: QueryClient,
  updatedAsset: Asset
): void {
  updateDashboardOptimistically(queryClient, (data) => {
    const { accounts, subscriptions, incomes } = getRelatedData(queryClient);
    const updatedAssets = data.assets.map(a => a.id === updatedAsset.id ? updatedAsset : a);
    const calculated = calculateDashboardData(
      updatedAssets,
      data.liabilities,
      accounts,
      subscriptions,
      incomes
    );
    
    const holdingsCount = updatedAssets.filter(a => a.type === 'Investments' || a.type === 'Crypto').length;
    
    return {
      ...data,
      ...calculated,
      assets: updatedAssets,
      dataSources: {
        ...data.dataSources,
        holdingsCount,
      },
    };
  });
}

/**
 * Optimistically remove an asset from the dashboard
 */
export function removeAssetOptimistically(
  queryClient: QueryClient,
  assetId: string
): void {
  updateDashboardOptimistically(queryClient, (data) => {
    const { accounts, subscriptions, incomes } = getRelatedData(queryClient);
    const updatedAssets = data.assets.filter(a => a.id !== assetId);
    const calculated = calculateDashboardData(
      updatedAssets,
      data.liabilities,
      accounts,
      subscriptions,
      incomes
    );
    
    const holdingsCount = updatedAssets.filter(a => a.type === 'Investments' || a.type === 'Crypto').length;
    
    return {
      ...data,
      ...calculated,
      assets: updatedAssets,
      dataSources: {
        ...data.dataSources,
        assetsCount: updatedAssets.length,
        holdingsCount,
      },
    };
  });
}

/**
 * Optimistically add a liability to the dashboard
 */
export function addLiabilityOptimistically(
  queryClient: QueryClient,
  newLiability: Liability
): void {
  updateDashboardOptimistically(queryClient, (data) => {
    const { accounts, subscriptions, incomes } = getRelatedData(queryClient);
    const updatedLiabilities = [...data.liabilities, newLiability];
    const calculated = calculateDashboardData(
      data.assets,
      updatedLiabilities,
      accounts,
      subscriptions,
      incomes
    );
    
    return {
      ...data,
      ...calculated,
      liabilities: updatedLiabilities,
      dataSources: {
        ...data.dataSources,
        liabilitiesCount: updatedLiabilities.length,
      },
    };
  });
}

/**
 * Optimistically update a liability in the dashboard
 */
export function updateLiabilityOptimistically(
  queryClient: QueryClient,
  updatedLiability: Liability
): void {
  updateDashboardOptimistically(queryClient, (data) => {
    const { accounts, subscriptions, incomes } = getRelatedData(queryClient);
    const updatedLiabilities = data.liabilities.map(l => l.id === updatedLiability.id ? updatedLiability : l);
    const calculated = calculateDashboardData(
      data.assets,
      updatedLiabilities,
      accounts,
      subscriptions,
      incomes
    );
    
    return {
      ...data,
      ...calculated,
      liabilities: updatedLiabilities,
    };
  });
}

/**
 * Optimistically remove a liability from the dashboard
 */
export function removeLiabilityOptimistically(
  queryClient: QueryClient,
  liabilityId: string
): void {
  updateDashboardOptimistically(queryClient, (data) => {
    const { accounts, subscriptions, incomes } = getRelatedData(queryClient);
    const updatedLiabilities = data.liabilities.filter(l => l.id !== liabilityId);
    const calculated = calculateDashboardData(
      data.assets,
      updatedLiabilities,
      accounts,
      subscriptions,
      incomes
    );
    
    return {
      ...data,
      ...calculated,
      liabilities: updatedLiabilities,
      dataSources: {
        ...data.dataSources,
        liabilitiesCount: updatedLiabilities.length,
      },
    };
  });
}

/**
 * Optimistically add an account to the dashboard
 */
export function addAccountOptimistically(
  queryClient: QueryClient,
  newAccount: Account
): void {
  updateDashboardOptimistically(queryClient, (data) => {
    const { accounts, subscriptions, incomes } = getRelatedData(queryClient);
    const updatedAccounts = [...accounts, newAccount];
    const calculated = calculateDashboardData(
      data.assets,
      data.liabilities,
      updatedAccounts,
      subscriptions,
      incomes
    );
    
    return {
      ...data,
      ...calculated,
      dataSources: {
        ...data.dataSources,
        accountsCount: updatedAccounts.length,
      },
    };
  });
}

/**
 * Optimistically update an account in the dashboard
 */
export function updateAccountOptimistically(
  queryClient: QueryClient,
  updatedAccount: Account
): void {
  updateDashboardOptimistically(queryClient, (data) => {
    const { accounts, subscriptions, incomes } = getRelatedData(queryClient);
    const updatedAccounts = accounts.map(a => a.id === updatedAccount.id ? updatedAccount : a);
    const calculated = calculateDashboardData(
      data.assets,
      data.liabilities,
      updatedAccounts,
      subscriptions,
      incomes
    );
    
    return {
      ...data,
      ...calculated,
    };
  });
}

/**
 * Optimistically remove an account from the dashboard
 */
export function removeAccountOptimistically(
  queryClient: QueryClient,
  accountId: string
): void {
  updateDashboardOptimistically(queryClient, (data) => {
    const { accounts, subscriptions, incomes } = getRelatedData(queryClient);
    const updatedAccounts = accounts.filter(a => a.id !== accountId);
    const calculated = calculateDashboardData(
      data.assets,
      data.liabilities,
      updatedAccounts,
      subscriptions,
      incomes
    );
    
    return {
      ...data,
      ...calculated,
      dataSources: {
        ...data.dataSources,
        accountsCount: updatedAccounts.length,
      },
    };
  });
}

/**
 * Optimistically add a subscription to the dashboard
 */
export function addSubscriptionOptimistically(
  queryClient: QueryClient,
  newSubscription: Subscription
): void {
  updateDashboardOptimistically(queryClient, (data) => {
    const { accounts, subscriptions, incomes } = getRelatedData(queryClient);
    const updatedSubscriptions = [...subscriptions, newSubscription];
    const calculated = calculateDashboardData(
      data.assets,
      data.liabilities,
      accounts,
      updatedSubscriptions,
      incomes
    );
    
    return {
      ...data,
      ...calculated,
      dataSources: {
        ...data.dataSources,
        subscriptionsCount: updatedSubscriptions.length,
      },
    };
  });
}

/**
 * Optimistically update a subscription in the dashboard
 */
export function updateSubscriptionOptimistically(
  queryClient: QueryClient,
  updatedSubscription: Subscription
): void {
  updateDashboardOptimistically(queryClient, (data) => {
    const { accounts, subscriptions, incomes } = getRelatedData(queryClient);
    const updatedSubscriptions = subscriptions.map(s => s.id === updatedSubscription.id ? updatedSubscription : s);
    const calculated = calculateDashboardData(
      data.assets,
      data.liabilities,
      accounts,
      updatedSubscriptions,
      incomes
    );
    
    return {
      ...data,
      ...calculated,
    };
  });
}

/**
 * Optimistically remove a subscription from the dashboard
 */
export function removeSubscriptionOptimistically(
  queryClient: QueryClient,
  subscriptionId: string
): void {
  updateDashboardOptimistically(queryClient, (data) => {
    const { accounts, subscriptions, incomes } = getRelatedData(queryClient);
    const updatedSubscriptions = subscriptions.filter(s => s.id !== subscriptionId);
    const calculated = calculateDashboardData(
      data.assets,
      data.liabilities,
      accounts,
      updatedSubscriptions,
      incomes
    );
    
    return {
      ...data,
      ...calculated,
      dataSources: {
        ...data.dataSources,
        subscriptionsCount: updatedSubscriptions.length,
      },
    };
  });
}

/**
 * Optimistically add income to the dashboard
 */
export function addIncomeOptimistically(
  queryClient: QueryClient,
  newIncome: Income
): void {
  updateDashboardOptimistically(queryClient, (data) => {
    const { accounts, subscriptions, incomes } = getRelatedData(queryClient);
    const updatedIncomes = [...incomes, newIncome];
    const calculated = calculateDashboardData(
      data.assets,
      data.liabilities,
      accounts,
      subscriptions,
      updatedIncomes
    );
    
    return {
      ...data,
      ...calculated,
      dataSources: {
        ...data.dataSources,
        incomeCount: updatedIncomes.length,
      },
    };
  });
}

/**
 * Optimistically update income in the dashboard
 */
export function updateIncomeOptimistically(
  queryClient: QueryClient,
  updatedIncome: Income
): void {
  updateDashboardOptimistically(queryClient, (data) => {
    const { accounts, subscriptions, incomes } = getRelatedData(queryClient);
    const updatedIncomes = incomes.map(i => i.id === updatedIncome.id ? updatedIncome : i);
    const calculated = calculateDashboardData(
      data.assets,
      data.liabilities,
      accounts,
      subscriptions,
      updatedIncomes
    );
    
    return {
      ...data,
      ...calculated,
    };
  });
}

/**
 * Optimistically remove income from the dashboard
 */
export function removeIncomeOptimistically(
  queryClient: QueryClient,
  incomeId: string
): void {
  updateDashboardOptimistically(queryClient, (data) => {
    const { accounts, subscriptions, incomes } = getRelatedData(queryClient);
    const updatedIncomes = incomes.filter(i => i.id !== incomeId);
    const calculated = calculateDashboardData(
      data.assets,
      data.liabilities,
      accounts,
      subscriptions,
      updatedIncomes
    );
    
    return {
      ...data,
      ...calculated,
      dataSources: {
        ...data.dataSources,
        incomeCount: updatedIncomes.length,
      },
    };
  });
}

