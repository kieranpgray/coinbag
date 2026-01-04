import type { QueryClient } from '@tanstack/react-query';
import type { DashboardData, Asset, Liability, Account, Expense, Income } from '@/types/domain';
import { calculateDashboardData } from '@/mocks/factories';

/**
 * Helper to get related data from query cache for dashboard calculations
 */
function getRelatedData(queryClient: QueryClient) {
  const accounts = queryClient.getQueryData<Account[]>(['accounts']) || [];
  const expenses = queryClient.getQueryData<Expense[]>(['expenses']) || [];
  const incomes = queryClient.getQueryData<Income[]>(['incomes']) || [];
  return { accounts, expenses, incomes };
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
    const { accounts, expenses, incomes } = getRelatedData(queryClient);
    const updatedAssets = [...data.assets, newAsset];
    const calculated = calculateDashboardData(
      updatedAssets,
      data.liabilities,
      accounts,
      expenses,
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
    const { accounts, expenses, incomes } = getRelatedData(queryClient);
    const updatedAssets = data.assets.map(a => a.id === updatedAsset.id ? updatedAsset : a);
    const calculated = calculateDashboardData(
      updatedAssets,
      data.liabilities,
      accounts,
      expenses,
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
    const { accounts, expenses, incomes } = getRelatedData(queryClient);
    const updatedAssets = data.assets.filter(a => a.id !== assetId);
    const calculated = calculateDashboardData(
      updatedAssets,
      data.liabilities,
      accounts,
      expenses,
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
    const { accounts, expenses, incomes } = getRelatedData(queryClient);
    const updatedLiabilities = [...data.liabilities, newLiability];
    const calculated = calculateDashboardData(
      data.assets,
      updatedLiabilities,
      accounts,
      expenses,
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
    const { accounts, expenses, incomes } = getRelatedData(queryClient);
    const updatedLiabilities = data.liabilities.map(l => l.id === updatedLiability.id ? updatedLiability : l);
    const calculated = calculateDashboardData(
      data.assets,
      updatedLiabilities,
      accounts,
      expenses,
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
    const { accounts, expenses, incomes } = getRelatedData(queryClient);
    const updatedLiabilities = data.liabilities.filter(l => l.id !== liabilityId);
    const calculated = calculateDashboardData(
      data.assets,
      updatedLiabilities,
      accounts,
      expenses,
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
    const { accounts, expenses, incomes } = getRelatedData(queryClient);
    const updatedAccounts = [...accounts, newAccount];
    const calculated = calculateDashboardData(
      data.assets,
      data.liabilities,
      updatedAccounts,
      expenses,
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
    const { accounts, expenses, incomes } = getRelatedData(queryClient);
    const updatedAccounts = accounts.map(a => a.id === updatedAccount.id ? updatedAccount : a);
    const calculated = calculateDashboardData(
      data.assets,
      data.liabilities,
      updatedAccounts,
      expenses,
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
    const { accounts, expenses, incomes } = getRelatedData(queryClient);
    const updatedAccounts = accounts.filter(a => a.id !== accountId);
    const calculated = calculateDashboardData(
      data.assets,
      data.liabilities,
      updatedAccounts,
      expenses,
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
 * Optimistically add an expense to the dashboard
 */
export function addExpenseOptimistically(
  queryClient: QueryClient,
  newExpense: Expense
): void {
  updateDashboardOptimistically(queryClient, (data) => {
    const { accounts, expenses, incomes } = getRelatedData(queryClient);
    const updatedExpenses = [...expenses, newExpense];
    const calculated = calculateDashboardData(
      data.assets,
      data.liabilities,
      accounts,
      updatedExpenses,
      incomes
    );
    
    return {
      ...data,
      ...calculated,
      dataSources: {
        ...data.dataSources,
        expensesCount: updatedExpenses.length,
      },
    };
  });
}

/**
 * Optimistically update an expense in the dashboard
 */
export function updateExpenseOptimistically(
  queryClient: QueryClient,
  updatedExpense: Expense
): void {
  updateDashboardOptimistically(queryClient, (data) => {
    const { accounts, expenses, incomes } = getRelatedData(queryClient);
    const updatedExpenses = expenses.map(e => e.id === updatedExpense.id ? updatedExpense : e);
    const calculated = calculateDashboardData(
      data.assets,
      data.liabilities,
      accounts,
      updatedExpenses,
      incomes
    );
    
    return {
      ...data,
      ...calculated,
    };
  });
}

/**
 * Optimistically remove an expense from the dashboard
 */
export function removeExpenseOptimistically(
  queryClient: QueryClient,
  expenseId: string
): void {
  updateDashboardOptimistically(queryClient, (data) => {
    const { accounts, expenses, incomes } = getRelatedData(queryClient);
    const updatedExpenses = expenses.filter(e => e.id !== expenseId);
    const calculated = calculateDashboardData(
      data.assets,
      data.liabilities,
      accounts,
      updatedExpenses,
      incomes
    );
    
    return {
      ...data,
      ...calculated,
      dataSources: {
        ...data.dataSources,
        expensesCount: updatedExpenses.length,
      },
    };
  });
}

// Backward compatibility exports
/** @deprecated Use addExpenseOptimistically instead */
export const addSubscriptionOptimistically = addExpenseOptimistically;
/** @deprecated Use updateExpenseOptimistically instead */
export const updateSubscriptionOptimistically = updateExpenseOptimistically;
/** @deprecated Use removeExpenseOptimistically instead */
export const removeSubscriptionOptimistically = removeExpenseOptimistically;

/**
 * Optimistically add income to the dashboard
 */
export function addIncomeOptimistically(
  queryClient: QueryClient,
  newIncome: Income
): void {
  updateDashboardOptimistically(queryClient, (data) => {
    const { accounts, expenses, incomes } = getRelatedData(queryClient);
    const updatedIncomes = [...incomes, newIncome];
    const calculated = calculateDashboardData(
      data.assets,
      data.liabilities,
      accounts,
      expenses,
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
    const { accounts, expenses, incomes } = getRelatedData(queryClient);
    const updatedIncomes = incomes.map(i => i.id === updatedIncome.id ? updatedIncome : i);
    const calculated = calculateDashboardData(
      data.assets,
      data.liabilities,
      accounts,
      expenses,
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
    const { accounts, expenses, incomes } = getRelatedData(queryClient);
    const updatedIncomes = incomes.filter(i => i.id !== incomeId);
    const calculated = calculateDashboardData(
      data.assets,
      data.liabilities,
      accounts,
      expenses,
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

