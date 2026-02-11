import type { Income, Expense, Account, PayCycleConfig, TransferSuggestion, AccountCashFlow, CategoryBreakdown } from '@/types/domain';
import type { Category } from '@/types/domain';
import { normalizeToMonthly, convertFromMonthly } from './frequencyNormalization';

/**
 * Calculate account-level cash flow summary
 * Aggregates income and expenses per account, normalized to monthly amounts
 */
export function calculateAccountCashFlow(
  incomes: Income[],
  expenses: Expense[],
  accounts: Account[],
  categories: Category[]
): AccountCashFlow[] {
  // Create category map for lookups
  const categoryMap = new Map(categories.map(c => [c.id, c.name]));

  return accounts.map(account => {
    // Calculate total monthly income for this account
    const monthlyIncome = incomes
      .filter(i => i.paidToAccountId === account.id)
      .reduce((sum, i) => sum + normalizeToMonthly(i.amount, i.frequency), 0);

    // Calculate total monthly expenses for this account
    const accountExpenses = expenses.filter(
      e => e.paidFromAccountId === account.id
    );
    
    const monthlyExpenses = accountExpenses.reduce(
      (sum, e) => sum + normalizeToMonthly(e.amount, e.frequency),
      0
    );

    // Group expenses by category
    const expenseBreakdown = calculateCategoryBreakdown(accountExpenses, categoryMap);

    return {
      accountId: account.id,
      accountName: account.accountName,
      monthlyIncome,
      monthlyExpenses,
      expenseBreakdown,
    };
  });
}

/**
 * Calculate category breakdown for expenses
 * Groups expenses by category and sums monthly amounts
 */
function calculateCategoryBreakdown(
  expenses: Expense[],
  categoryMap: Map<string, string>
): CategoryBreakdown[] {
  const categoryMapInternal = new Map<string, { amount: number; ids: string[] }>();

  expenses.forEach(expense => {
    const categoryId = expense.categoryId;
    const monthlyAmount = normalizeToMonthly(expense.amount, expense.frequency);

    const existing = categoryMapInternal.get(categoryId) || { amount: 0, ids: [] };
    categoryMapInternal.set(categoryId, {
      amount: existing.amount + monthlyAmount,
      ids: [...existing.ids, expense.id],
    });
  });

  return Array.from(categoryMapInternal.entries())
    .map(([categoryId, data]) => ({
      categoryId,
      categoryName: categoryMap.get(categoryId) || 'Uncategorized',
      monthlyAmount: data.amount,
      expenseIds: data.ids,
    }))
    .sort((a, b) => b.monthlyAmount - a.monthlyAmount); // Sort by amount descending
}

/**
 * Calculate transfer suggestions based on pay cycle and cash flow
 * Generates recommendations for moving money from primary account to expense accounts
 */
export function calculateTransferSuggestions(
  payCycle: PayCycleConfig,
  cashFlowByAccount: AccountCashFlow[],
  accounts: Account[]
): TransferSuggestion[] {
  const suggestions: TransferSuggestion[] = [];
  const primaryAccount = accounts.find(a => a.id === payCycle.primaryIncomeAccountId);
  
  if (!primaryAccount) return suggestions;

  // Calculate transfers needed for each account with expenses
  cashFlowByAccount.forEach(accountFlow => {
    // Skip primary account
    if (accountFlow.accountId === payCycle.primaryIncomeAccountId) return;
    
    // Skip if no expenses
    if (accountFlow.monthlyExpenses === 0) return;

    const monthlyTransfer = accountFlow.monthlyExpenses;
    
    suggestions.push({
      fromAccountId: primaryAccount.id,
      fromAccountName: primaryAccount.accountName,
      toAccountId: accountFlow.accountId,
      toAccountName: accountFlow.accountName,
      amountMonthly: monthlyTransfer,
      amountWeekly: convertFromMonthly(monthlyTransfer, 'weekly'),
      amountFortnightly: convertFromMonthly(monthlyTransfer, 'fortnightly'),
      reason: `Covers $${monthlyTransfer.toFixed(0)}/month in recurring expenses`,
      expenseIds: accountFlow.expenseBreakdown.flatMap(b => b.expenseIds),
      isSurplus: false,
    });
  });

  // Calculate surplus
  const totalMonthlyIncome = cashFlowByAccount.reduce((sum, a) => sum + a.monthlyIncome, 0);
  const totalMonthlyExpenses = cashFlowByAccount.reduce((sum, a) => sum + a.monthlyExpenses, 0);
  const surplus = totalMonthlyIncome - totalMonthlyExpenses;

  if (surplus > 0 && payCycle.savingsAccountId) {
    const savingsAccount = accounts.find(a => a.id === payCycle.savingsAccountId);

    if (savingsAccount && savingsAccount.id !== primaryAccount.id) {
      suggestions.push({
        fromAccountId: primaryAccount.id,
        fromAccountName: primaryAccount.accountName,
        toAccountId: savingsAccount.id,
        toAccountName: savingsAccount.accountName,
        amountMonthly: surplus,
        amountWeekly: convertFromMonthly(surplus, 'weekly'),
        amountFortnightly: convertFromMonthly(surplus, 'fortnightly'),
        reason: 'Surplus after expenses',
        expenseIds: [],
        isSurplus: true,
      });
    }
  }

  return suggestions;
}

/**
 * Get expenses that don't have an account assigned
 * These need to be allocated to accounts for accurate transfer calculations
 */
export function getUnallocatedExpenses(expenses: Expense[]): Expense[] {
  return expenses.filter(e => !e.paidFromAccountId);
}

/**
 * Calculate total monthly amount of unallocated expenses
 */
export function calculateUnallocatedTotal(expenses: Expense[]): number {
  return getUnallocatedExpenses(expenses).reduce(
    (sum, e) => sum + normalizeToMonthly(e.amount, e.frequency),
    0
  );
}
