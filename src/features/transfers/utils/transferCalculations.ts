import type { Income, Expense, Account, PayCycleConfig, TransferSuggestion, AccountCashFlow, CategoryBreakdown } from '@/types/domain';
import type { Category } from '@/types/domain';
import { normalizeToMonthly, convertFromMonthly } from './frequencyNormalization';
import { formatCurrency } from '@/lib/utils';
import { isRepaymentCategoryId } from '@/features/expenses/utils/repaymentCategory';

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
  accounts: Account[],
  expenses: Expense[] = [],
  categories: Category[] = [],
  enableExplicitRepaymentTransfers = false
): TransferSuggestion[] {
  if (!enableExplicitRepaymentTransfers) {
    return calculateLegacyTransferSuggestions(payCycle, cashFlowByAccount, accounts);
  }

  const suggestions: TransferSuggestion[] = [];
  const primaryAccount = accounts.find(a => a.id === payCycle.primaryIncomeAccountId);
  
  if (!primaryAccount) return suggestions;

  const repaymentExpenses = expenses.filter((expense) =>
    isRepaymentCategoryId(expense.categoryId, categories)
  );
  const repaymentExpenseIds = new Set(repaymentExpenses.map((expense) => expense.id));

  // Emit explicit repayment rows first
  repaymentExpenses.forEach((expense) => {
    const monthlyAmount = normalizeToMonthly(expense.amount, expense.frequency);
    const fromAccount = accounts.find((account) => account.id === expense.paidFromAccountId);
    const toAccount = accounts.find((account) => account.id === expense.linkedRepaymentAccountId);

    if (fromAccount && toAccount) {
      suggestions.push({
        fromAccountId: fromAccount.id,
        fromAccountName: fromAccount.accountName,
        toAccountId: toAccount.id,
        toAccountName: toAccount.accountName,
        amountMonthly: monthlyAmount,
        amountWeekly: convertFromMonthly(monthlyAmount, 'weekly'),
        amountFortnightly: convertFromMonthly(monthlyAmount, 'fortnightly'),
        reason: 'Repayment',
        expenseIds: [expense.id],
        isSurplus: false,
        kind: 'repayment',
      });
      return;
    }

    suggestions.push({
      fromAccountId: fromAccount?.id || primaryAccount.id,
      fromAccountName: fromAccount?.accountName || primaryAccount.accountName,
      toAccountId: toAccount?.id || 'missing-linked-repayment-account',
      toAccountName: toAccount?.accountName || 'Link repayment account',
      amountMonthly: monthlyAmount,
      amountWeekly: convertFromMonthly(monthlyAmount, 'weekly'),
      amountFortnightly: convertFromMonthly(monthlyAmount, 'fortnightly'),
      reason: 'Action required: add repayment account links',
      expenseIds: [expense.id],
      isSurplus: false,
      kind: 'action_required_repayment',
      requiresAction: true,
      actionExpenseId: expense.id,
    });
  });

  // Calculate coverage transfers while excluding repayment expenses
  cashFlowByAccount.forEach(accountFlow => {
    // Skip primary account
    if (accountFlow.accountId === payCycle.primaryIncomeAccountId) return;
    
    // Skip if no expenses
    if (accountFlow.monthlyExpenses === 0) return;

    const excludedRepaymentAmount = repaymentExpenses
      .filter((expense) => expense.paidFromAccountId === accountFlow.accountId)
      .reduce((sum, expense) => sum + normalizeToMonthly(expense.amount, expense.frequency), 0);
    const monthlyTransfer = Math.max(0, accountFlow.monthlyExpenses - excludedRepaymentAmount);
    if (monthlyTransfer === 0) return;
    
    suggestions.push({
      fromAccountId: primaryAccount.id,
      fromAccountName: primaryAccount.accountName,
      toAccountId: accountFlow.accountId,
      toAccountName: accountFlow.accountName,
      amountMonthly: monthlyTransfer,
      amountWeekly: convertFromMonthly(monthlyTransfer, 'weekly'),
      amountFortnightly: convertFromMonthly(monthlyTransfer, 'fortnightly'),
      reason: `Covers ${formatCurrency(monthlyTransfer, undefined, { maximumFractionDigits: 0 })}/month in recurring expenses`,
      expenseIds: accountFlow.expenseBreakdown
        .flatMap((breakdown) => breakdown.expenseIds)
        .filter((expenseId) => !repaymentExpenseIds.has(expenseId)),
      isSurplus: false,
      kind: 'coverage',
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
        kind: 'surplus',
      });
    }
  }

  return suggestions;
}

function calculateLegacyTransferSuggestions(
  payCycle: PayCycleConfig,
  cashFlowByAccount: AccountCashFlow[],
  accounts: Account[]
): TransferSuggestion[] {
  const suggestions: TransferSuggestion[] = [];
  const primaryAccount = accounts.find(a => a.id === payCycle.primaryIncomeAccountId);
  if (!primaryAccount) return suggestions;

  cashFlowByAccount.forEach(accountFlow => {
    if (accountFlow.accountId === payCycle.primaryIncomeAccountId) return;
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
      reason: `Covers ${formatCurrency(monthlyTransfer, undefined, { maximumFractionDigits: 0 })}/month in recurring expenses`,
      expenseIds: accountFlow.expenseBreakdown.flatMap(b => b.expenseIds),
      isSurplus: false,
    });
  });

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
