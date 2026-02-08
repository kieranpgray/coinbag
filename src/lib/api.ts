import type {
  Asset,
  Liability,
  Account,
  Transaction,
  Goal,
  Expense,
  User,
  DashboardData,
  MarketSummary,
  Income,
} from '@/types/domain';
import { ExpenseService } from '@/features/expenses/services/expenseService';
import {
  calculateDashboardData,
} from '@/mocks/factories';
import { v4 as uuidv4 } from 'uuid';
import { createAssetsRepository } from '@/data/assets/repo';
import { createLiabilitiesRepository } from '@/data/liabilities/repo';
import { createAccountsRepository } from '@/data/accounts/repo';
import { createExpensesRepository } from '@/data/expenses/repo';
import { createIncomeRepository } from '@/data/income/repo';
import { createNetWorthHistoryRepository } from '@/data/netWorthHistory/repo';
import type { NetWorthPoint } from '@/features/dashboard/hooks/useNetWorthHistory';

// Simulate API delay (only in development)
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Random delay between 50-200ms (only in development)
// In production, this adds unnecessary latency - removed for better performance
const randomDelay = () => {
  if (import.meta.env.DEV) {
    return delay(Math.floor(Math.random() * 150) + 50);
  }
  return Promise.resolve();
};

// In-memory data stores (no auto-seeding)
let assets: Asset[] = [];
let liabilities: Liability[] = [];
let accounts: Account[] = [];
let transactions: Transaction[] = [];
let goals: Goal[] = [];
let expenses: Expense[] = [];
let incomes: Income[] = [];

/**
 * Helper functions to seed mock data (for tests only)
 */
export function seedMockDashboardData(data: {
  assets?: Asset[];
  liabilities?: Liability[];
  accounts?: Account[];
  transactions?: Transaction[];
  goals?: Goal[];
  expenses?: Expense[];
  incomes?: Income[];
}): void {
  if (data.assets) assets = [...data.assets];
  if (data.liabilities) liabilities = [...data.liabilities];
  if (data.accounts) accounts = [...data.accounts];
  if (data.transactions) transactions = [...data.transactions];
  if (data.goals) goals = [...data.goals];
  if (data.expenses) expenses = [...data.expenses];
  if (data.incomes) incomes = [...data.incomes];
}

/**
 * Helper function to clear mock data (for tests)
 */
export function clearMockDashboardData(): void {
  assets = [];
  liabilities = [];
  accounts = [];
  transactions = [];
  goals = [];
  expenses = [];
  incomes = [];
}

/**
 * Assets API
 */
export const assetsApi = {
  async getAll(): Promise<Asset[]> {
    await randomDelay();
    return [...assets];
  },

  async getById(id: string): Promise<Asset | undefined> {
    await randomDelay();
    return assets.find((a) => a.id === id);
  },

  async create(data: Omit<Asset, 'id'>): Promise<Asset> {
    await randomDelay();
    const newAsset: Asset = {
      id: uuidv4(),
      name: data.name,
      type: data.type,
      value: data.value,
      change1D: data.change1D,
      change1W: data.change1W,
      dateAdded: data.dateAdded,
      institution: data.institution,
      notes: data.notes,
    };
    assets.push(newAsset);
    return newAsset;
  },

  async update(id: string, data: Partial<Asset>): Promise<Asset> {
    await randomDelay();
    const index = assets.findIndex((a) => a.id === id);
    if (index === -1) {
      throw new Error(`Asset with id ${id} not found`);
    }
    const existing = assets[index];
    if (!existing) {
      throw new Error(`Asset with id ${id} not found`);
    }
    const updated: Asset = {
      id: existing.id,
      name: data.name ?? existing.name,
      type: data.type ?? existing.type,
      value: data.value ?? existing.value,
      change1D: data.change1D ?? existing.change1D,
      change1W: data.change1W ?? existing.change1W,
      dateAdded: data.dateAdded ?? existing.dateAdded,
      institution: data.institution ?? existing.institution,
      notes: data.notes ?? existing.notes,
    };
    assets[index] = updated;
    return updated;
  },

  async delete(id: string): Promise<void> {
    await randomDelay();
    const index = assets.findIndex((a) => a.id === id);
    if (index === -1) {
      throw new Error(`Asset with id ${id} not found`);
    }
    assets.splice(index, 1);
  },
};

/**
 * Liabilities API
 */
export const liabilitiesApi = {
  async getAll(): Promise<Liability[]> {
    await randomDelay();
    return [...liabilities];
  },

  async getById(id: string): Promise<Liability | undefined> {
    await randomDelay();
    return liabilities.find((l) => l.id === id);
  },

  async create(data: Omit<Liability, 'id'>): Promise<Liability> {
    await randomDelay();
    const newLiability: Liability = {
      id: uuidv4(),
      name: data.name,
      type: data.type,
      balance: data.balance,
      interestRate: data.interestRate,
      monthlyPayment: data.monthlyPayment,
      dueDate: data.dueDate,
      institution: data.institution,
    };
    liabilities.push(newLiability);
    return newLiability;
  },

  async update(id: string, data: Partial<Liability>): Promise<Liability> {
    await randomDelay();
    const index = liabilities.findIndex((l) => l.id === id);
    if (index === -1) {
      throw new Error(`Liability with id ${id} not found`);
    }
    const existing = liabilities[index];
    if (!existing) {
      throw new Error(`Liability with id ${id} not found`);
    }
    const updated: Liability = {
      id: existing.id,
      name: data.name ?? existing.name,
      type: data.type ?? existing.type,
      balance: data.balance ?? existing.balance,
      interestRate: data.interestRate ?? existing.interestRate,
      monthlyPayment: data.monthlyPayment ?? existing.monthlyPayment,
      dueDate: data.dueDate ?? existing.dueDate,
      institution: data.institution ?? existing.institution,
    };
    liabilities[index] = updated;
    return updated;
  },

  async delete(id: string): Promise<void> {
    await randomDelay();
    const index = liabilities.findIndex((l) => l.id === id);
    if (index === -1) {
      throw new Error(`Liability with id ${id} not found`);
    }
    liabilities.splice(index, 1);
  },
};

/**
 * Accounts API
 */
export const accountsApi = {
  async getAll(): Promise<Account[]> {
    await randomDelay();
    return [...accounts];
  },

  async getById(id: string): Promise<Account | undefined> {
    await randomDelay();
    return accounts.find((a) => a.id === id);
  },

  async create(data: Omit<Account, 'id'>): Promise<Account> {
    await randomDelay();
    const newAccount: Account = {
      id: uuidv4(),
      institution: data.institution,
      accountName: data.accountName,
      balance: data.balance,
      accountType: data.accountType,
      creditLimit: data.creditLimit,
      balanceOwed: data.balanceOwed,
      lastUpdated: data.lastUpdated,
      hidden: data.hidden,
    };
    accounts.push(newAccount);
    return newAccount;
  },

  async update(id: string, data: Partial<Account>): Promise<Account> {
    await randomDelay();
    const index = accounts.findIndex((a) => a.id === id);
    if (index === -1) {
      throw new Error(`Account with id ${id} not found`);
    }
    const existing = accounts[index];
    if (!existing) {
      throw new Error(`Account with id ${id} not found`);
    }
    const updated: Account = {
      id: existing.id,
      institution: data.institution ?? existing.institution,
      accountName: data.accountName ?? existing.accountName,
      balance: data.balance ?? existing.balance,
      accountType: data.accountType ?? existing.accountType,
      creditLimit: data.creditLimit ?? existing.creditLimit,
      balanceOwed: data.balanceOwed ?? existing.balanceOwed,
      lastUpdated: data.lastUpdated ?? existing.lastUpdated,
      hidden: data.hidden ?? existing.hidden,
    };
    accounts[index] = updated;
    return updated;
  },

  async delete(id: string): Promise<void> {
    await randomDelay();
    const index = accounts.findIndex((a) => a.id === id);
    if (index === -1) {
      throw new Error(`Account with id ${id} not found`);
    }
    accounts.splice(index, 1);
  },
};

/**
 * Transactions API
 * 
 * @deprecated This API uses in-memory mock data and should NOT be used in production code.
 * Use the transactions repository pattern instead:
 * - `createTransactionsRepository()` from `@/data/transactions/repo`
 * - `useTransactions()` hook from `@/features/transactions/hooks`
 * 
 * CRITICAL: This API can return mock/fake transaction data.
 * The repository pattern ensures only factual transactions from statement imports are returned.
 * 
 * Currently only used by `dashboardApi.getData()` which should be migrated to use the repository.
 */
export const transactionsApi = {
  async getAll(params?: {
    page?: number;
    size?: number;
    dateRange?: string;
    accountId?: string;
  }): Promise<{ data: Transaction[]; total: number }> {
    // CRITICAL: Warn in production if this is accidentally used
    if (import.meta.env.MODE === 'production' || import.meta.env.PROD === true) {
      console.error('[DEPRECATED] transactionsApi.getAll() called in production! This uses mock data. Use transactions repository instead.');
    }
    
    await randomDelay();
    let filtered = [...transactions];

    if (params?.accountId) {
      filtered = filtered.filter((t) => t.accountId === params.accountId);
    }

    // Sort by date descending
    filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const total = filtered.length;
    const page = params?.page ?? 0;
    const size = params?.size ?? 10;
    const start = page * size;
    const end = start + size;
    const data = filtered.slice(start, end);

    return { data, total };
  },
};

/**
 * Goals API
 */
export const goalsApi = {
  async getAll(): Promise<Goal[]> {
    await randomDelay();
    return [...goals];
  },

  async getById(id: string): Promise<Goal | undefined> {
    await randomDelay();
    return goals.find((g) => g.id === id);
  },

  async create(data: Omit<Goal, 'id'>): Promise<Goal> {
    await randomDelay();
    const newGoal: Goal = {
      id: uuidv4(),
      name: data.name,
      description: data.description,
      source: data.source,
      accountId: data.accountId,
      targetAmount: data.targetAmount,
      currentAmount: data.currentAmount,
      deadline: data.deadline,
      status: data.status,
    };
    goals.push(newGoal);
    return newGoal;
  },

  async update(id: string, data: Partial<Goal>): Promise<Goal> {
    await randomDelay();
    const index = goals.findIndex((g) => g.id === id);
    if (index === -1) {
      throw new Error(`Goal with id ${id} not found`);
    }
    const existing = goals[index];
    if (!existing) {
      throw new Error(`Goal with id ${id} not found`);
    }
    const updated: Goal = {
      id: existing.id,
      name: data.name ?? existing.name,
      description: data.description ?? existing.description,
      source: data.source ?? existing.source,
      accountId: data.accountId ?? existing.accountId,
      targetAmount: data.targetAmount ?? existing.targetAmount,
      currentAmount: data.currentAmount ?? existing.currentAmount,
      deadline: data.deadline ?? existing.deadline,
      status: data.status ?? existing.status,
    };
    goals[index] = updated;
    return updated;
  },

  async delete(id: string): Promise<void> {
    await randomDelay();
    const index = goals.findIndex((g) => g.id === id);
    if (index === -1) {
      throw new Error(`Goal with id ${id} not found`);
    }
    goals.splice(index, 1);
  },
};

/**
 * Income API
 */
export const incomeApi = {
  async getAll(): Promise<Income[]> {
    await randomDelay();
    return [...incomes];
  },

  async getById(id: string): Promise<Income | undefined> {
    await randomDelay();
    return incomes.find((i) => i.id === id);
  },

  async create(data: Omit<Income, 'id'>): Promise<Income> {
    await randomDelay();
    const newIncome: Income = {
      id: uuidv4(),
      name: data.name,
      source: data.source,
      amount: data.amount,
      frequency: data.frequency,
      nextPaymentDate: data.nextPaymentDate,
      paidToAccountId: data.paidToAccountId,
    };
    incomes.push(newIncome);
    return newIncome;
  },

  async update(id: string, data: Partial<Income>): Promise<Income> {
    await randomDelay();
    const index = incomes.findIndex((i) => i.id === id);
    if (index === -1) {
      throw new Error(`Income with id ${id} not found`);
    }
    const existing = incomes[index];
    if (!existing) {
      throw new Error(`Income with id ${id} not found`);
    }
    const updated: Income = {
      id: existing.id,
      name: data.name ?? existing.name,
      source: data.source ?? existing.source,
      amount: data.amount ?? existing.amount,
      frequency: data.frequency ?? existing.frequency,
      nextPaymentDate: data.nextPaymentDate ?? existing.nextPaymentDate,
      paidToAccountId: data.paidToAccountId ?? existing.paidToAccountId,
    };
    incomes[index] = updated;
    return updated;
  },

  async delete(id: string): Promise<void> {
    await randomDelay();
    const index = incomes.findIndex((i) => i.id === id);
    if (index === -1) {
      throw new Error(`Income with id ${id} not found`);
    }
    incomes.splice(index, 1);
  },
};

/**
 * Dashboard API
 * 
 * IMPORTANT: Uses repository pattern to ensure data consistency.
 * Dashboard reads from the same data source that entity creation writes to.
 * 
 * This prevents data loss bugs where creating an entity causes other entities
 * to disappear because the dashboard was reading from a different data store.
 * 
 * @param getToken - Function to get authentication token (required for Supabase)
 * @returns Dashboard data aggregated from all repositories
 * @throws Error if any repository fails to fetch data
 */
export const dashboardApi = {
  async getData(getToken: () => Promise<string | null>): Promise<DashboardData> {
    await randomDelay();
    
    // Use repositories instead of legacy APIs to ensure data consistency
    // All entity creation/update/delete operations use these same repositories
    const assetsRepo = createAssetsRepository();
    const liabilitiesRepo = createLiabilitiesRepository();
    const accountsRepo = createAccountsRepository();
    const expensesRepo = createExpensesRepository();
    const incomeRepo = createIncomeRepository();
    
    // Log dashboard fetch attempt
    if (import.meta.env.VITE_DEBUG_LOGGING === 'true') {
      const { logger, getCorrelationId } = await import('@/lib/logger');
      logger.info(
        'DASHBOARD:FETCH',
        'Fetching dashboard data from repositories',
        {
          dataSource: import.meta.env.VITE_DATA_SOURCE || 'mock',
        },
        getCorrelationId() || undefined
      );
    }
    
    // Fetch all repository data in parallel for better performance
    const [assetsResult, liabilitiesResult, accountsResult, expensesResult, incomeResult] = await Promise.all([
      assetsRepo.list(getToken).catch(async (error) => {
        if (import.meta.env.VITE_DEBUG_LOGGING === 'true') {
          const { logger, getCorrelationId } = await import('@/lib/logger');
          logger.error(
            'DASHBOARD:FETCH',
            'Assets repository failed',
            { error: error instanceof Error ? error.message : String(error) },
            getCorrelationId() || undefined
          );
        }
        return { data: [], error: { error: 'Failed to load assets. Please try again.', code: 'UNKNOWN_ERROR' } };
      }),
      liabilitiesRepo.list(getToken).catch(async (error) => {
        if (import.meta.env.VITE_DEBUG_LOGGING === 'true') {
          const { logger, getCorrelationId } = await import('@/lib/logger');
          logger.error(
            'DASHBOARD:FETCH',
            'Liabilities repository failed',
            { error: error instanceof Error ? error.message : String(error) },
            getCorrelationId() || undefined
          );
        }
        return { data: [], error: { error: 'Failed to load liabilities. Please try again.', code: 'UNKNOWN_ERROR' } };
      }),
      accountsRepo.list(getToken).catch(async (error) => {
        if (import.meta.env.VITE_DEBUG_LOGGING === 'true') {
          const { logger, getCorrelationId } = await import('@/lib/logger');
          logger.error(
            'DASHBOARD:FETCH',
            'Accounts repository failed',
            { error: error instanceof Error ? error.message : String(error) },
            getCorrelationId() || undefined
          );
        }
        return { data: [], error: { error: 'Failed to load accounts. Please try again.', code: 'UNKNOWN_ERROR' } };
      }),
      expensesRepo.list(getToken).catch(async (error) => {
        if (import.meta.env.VITE_DEBUG_LOGGING === 'true') {
          const { logger, getCorrelationId } = await import('@/lib/logger');
          logger.error(
            'DASHBOARD:FETCH',
            'Expenses repository failed',
            { error: error instanceof Error ? error.message : String(error) },
            getCorrelationId() || undefined
          );
        }
        return { data: [], error: { error: 'Failed to load expenses. Please try again.', code: 'UNKNOWN_ERROR' } };
      }),
      incomeRepo.list(getToken).catch(async (error) => {
        if (import.meta.env.VITE_DEBUG_LOGGING === 'true') {
          const { logger, getCorrelationId } = await import('@/lib/logger');
          logger.error(
            'DASHBOARD:FETCH',
            'Income repository failed',
            { error: error instanceof Error ? error.message : String(error) },
            getCorrelationId() || undefined
          );
        }
        return { data: [], error: { error: 'Failed to load income. Please try again.', code: 'UNKNOWN_ERROR' } };
      }),
    ]);
    
    // Aggregate errors for better debugging
    const errors: Array<{ source: string; error: { error: string; code: string } }> = [];
    if (assetsResult.error) {
      errors.push({ source: 'assets', error: assetsResult.error });
    }
    if (liabilitiesResult.error) {
      errors.push({ source: 'liabilities', error: liabilitiesResult.error });
    }
    if (accountsResult.error) {
      errors.push({ source: 'accounts', error: accountsResult.error });
    }
    if (expensesResult.error) {
      errors.push({ source: 'expenses', error: expensesResult.error });
    }
    if (incomeResult.error) {
      errors.push({ source: 'income', error: incomeResult.error });
    }
    
    // Log errors if debug logging is enabled
    if (errors.length > 0 && import.meta.env.VITE_DEBUG_LOGGING === 'true') {
      const { logger, getCorrelationId } = await import('@/lib/logger');
      logger.warn(
        'DASHBOARD:FETCH',
        'Dashboard fetch partial failures (continuing with available data)',
        { errors: errors.map(e => ({ source: e.source, error: e.error.error, code: e.error.code })) },
        getCorrelationId() || undefined
      );
    }
    
    // Don't throw if some repositories failed - allow partial data
    // This makes the dashboard resilient to individual repository failures
    // (e.g., expenses table schema mismatch, missing migrations, etc.)
    // Only throw if ALL repositories failed
    const allFailed = errors.length === 5; // assets, liabilities, accounts, expenses, income
    if (allFailed) {
      const errorMessages = errors.map(e => `${e.source}: ${e.error.error} (${e.error.code})`).join('; ');
      throw new Error(`Failed to fetch dashboard data from all repositories: ${errorMessages}`);
    }
    
    // Type-safe data extraction (we know data exists because we checked for errors)
    const assetsData = assetsResult.data ?? [];
    const liabilitiesData = liabilitiesResult.data ?? [];
    const accountsData = accountsResult.data ?? [];
    const expensesData = expensesResult.data ?? [];
    const incomesData = incomeResult.data ?? [];
    
    // TODO: Migrate to transactions repository pattern
    // Currently using legacy transactionsApi which uses in-memory mock data.
    // Should use: createTransactionsRepository().list() for production data.
    // Note: This only affects transaction counts in dashboard, not the transaction list UI.
    const [transactionsResult] = await Promise.all([
      transactionsApi.getAll(),
    ]);

    const calculated = calculateDashboardData(assetsData, liabilitiesData, accountsData, expensesData, incomesData);

    // Calculate data source counts (existence = count > 0)
    const holdingsCount = assetsData.filter(a => a.type === 'Investments' || a.type === 'Crypto').length;
    
    // Create daily snapshot if it doesn't exist (on-demand snapshot creation)
    // This runs asynchronously and doesn't block dashboard rendering
    // Errors are logged but don't affect dashboard data
    try {
      const netWorthHistoryRepo = createNetWorthHistoryRepository();
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      
      // Check if today's snapshot exists by querying for it
      const existingSnapshot = await netWorthHistoryRepo.list(getToken, today, today);
      
      // Only create snapshot if it doesn't exist
      if (!existingSnapshot.error && (!existingSnapshot.data || existingSnapshot.data.length === 0)) {
        // Calculate total assets and liabilities for snapshot
        // Use same calculation logic as dashboard for consistency
        const totalAssets = assetsData.reduce((sum, asset) => sum + asset.value, 0);
        const totalLiabilities = liabilitiesData.reduce((sum, liability) => sum + liability.balance, 0);
        
        // Create snapshot using calculated values from dashboard
        // This ensures snapshot matches what user sees on dashboard
        const todayStr = today || new Date().toISOString().split('T')[0]!;
        const netWorthValue = calculated.netWorth ?? 0;
        await netWorthHistoryRepo.createSnapshot(
          getToken,
          todayStr,
          netWorthValue,
          totalAssets,
          totalLiabilities
        ).catch(async (error) => {
          // Log error but don't throw - snapshot creation is non-blocking
          if (import.meta.env.VITE_DEBUG_LOGGING === 'true') {
            const { logger, getCorrelationId } = await import('@/lib/logger');
            logger.warn(
              'DASHBOARD:SNAPSHOT',
              'Failed to create daily snapshot (non-blocking)',
              { error: error instanceof Error ? error.message : String(error) },
              getCorrelationId() || undefined
            );
          }
        });
      }
    } catch (error) {
      // Silently fail - snapshot creation is optional and shouldn't block dashboard
      if (import.meta.env.VITE_DEBUG_LOGGING === 'true') {
        const { logger, getCorrelationId } = await import('@/lib/logger');
        logger.warn(
          'DASHBOARD:SNAPSHOT',
          'Snapshot creation failed (non-blocking)',
          { error: error instanceof Error ? error.message : String(error) },
          getCorrelationId() || undefined
        );
      }
    }
    
    return {
      ...calculated,
      assets: assetsData,
      liabilities: liabilitiesData,
      expenses: expensesData,
      dataSources: {
        accountsCount: accountsData.length,
        assetsCount: assetsData.length,
        liabilitiesCount: liabilitiesData.length,
        expensesCount: expensesData.length,
        transactionsCount: transactionsResult.total,
        incomeCount: incomesData.length,
        holdingsCount,
      },
    } as DashboardData;
  },
};

/**
 * Net Worth History API
 */
export const netWorthHistoryApi = {
  async getHistory(
    getToken: () => Promise<string | null>,
    startDate?: string,
    endDate?: string
  ): Promise<NetWorthPoint[]> {
    const repo = createNetWorthHistoryRepository();
    const result = await repo.list(getToken, startDate, endDate);
    if (result.error) {
      throw new Error(result.error.error);
    }
    return result.data || [];
  },
  
  async createDailySnapshot(
    getToken: () => Promise<string | null>,
    netWorth: number,
    totalAssets: number,
    totalLiabilities: number
  ): Promise<void> {
    const repo = createNetWorthHistoryRepository();
    const today = new Date().toISOString().split('T')[0]!; // YYYY-MM-DD
    const result = await repo.createSnapshot(
      getToken,
      today,
      netWorth,
      totalAssets,
      totalLiabilities
    );
    if (result.error) {
      throw new Error(result.error.error);
    }
  }
};

/**
 * Market API
 */
export const marketApi = {
  async getSummary(): Promise<MarketSummary> {
    await randomDelay();
    return {
      sp500: {
        change1D: 0.85,
        change7D: 2.3,
        change30D: -1.2,
      },
      commentary:
        'Markets are showing resilience amid economic uncertainty. Technology stocks continue to lead gains while energy sectors face headwinds.',
    };
  },
};

/**
 * Expenses API
 */
export const expensesApi = {
  async getAll(): Promise<Expense[]> {
    await randomDelay();
    return [...expenses];
  },

  async getById(id: string): Promise<Expense | undefined> {
    await randomDelay();
    return expenses.find((e) => e.id === id);
  },

  async create(data: Omit<Expense, 'id'>): Promise<Expense> {
    await randomDelay();

    try {
      // Use service layer for business logic validation
      const validatedExpense = ExpenseService.createExpense(data);

    const newExpense: Expense = {
      id: uuidv4(),
      ...validatedExpense,
    };

      expenses.push(newExpense);
      return newExpense;
    } catch (error) {
      // Re-throw with API-specific context
      throw new Error(`Failed to create expense: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  async update(id: string, data: Partial<Expense>): Promise<Expense> {
    await randomDelay();
    const index = expenses.findIndex((e) => e.id === id);
    if (index === -1) {
      throw new Error(`Expense with id ${id} not found`);
    }

    const existing = expenses[index]!;

    try {
      // Use service layer for business logic validation
      const validatedExpense = ExpenseService.updateExpense(existing, data);

      const updated: Expense = validatedExpense;

      expenses[index] = updated;
      return updated;
    } catch (error) {
      // Re-throw with API-specific context
      throw new Error(`Failed to update expense: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  async delete(id: string): Promise<void> {
    await randomDelay();
    const index = expenses.findIndex((e) => e.id === id);
    if (index === -1) {
      throw new Error(`Expense with id ${id} not found`);
    }
    expenses.splice(index, 1);
  },
};

// Backward compatibility export
/** @deprecated Use expensesApi instead */
export const subscriptionsApi = expensesApi;

/**
 * User API
 */
export const userApi = {
  async getCurrentUser(): Promise<User> {
    await randomDelay();
    /**
     * IMPORTANT:
     * Identity (name/email/phone) must come from Clerk.
     * Preferences must come from the app-owned preferences store (Supabase/local fallback).
     *
     * This API previously returned a mocked "Mock User" which caused the Settings screen to
     * display fake data. We keep the export to avoid breaking older tests, but it should not
     * be used by application code.
     */
    throw new Error('userApi.getCurrentUser is deprecated. Use Clerk for identity and user_preferences for preferences.');
  },

  async updateUser(): Promise<User> {
    await randomDelay();
    throw new Error('userApi.updateUser is deprecated. Use Clerk for identity and user_preferences for preferences.');
  },
};

