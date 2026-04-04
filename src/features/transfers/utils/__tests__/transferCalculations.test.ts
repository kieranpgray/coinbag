import { describe, expect, it } from 'vitest';
import { calculateTransferSuggestions } from '../transferCalculations';
import type {
  Account,
  AccountCashFlow,
  Category,
  Expense,
  PayCycleConfig,
} from '@/types/domain';

describe('calculateTransferSuggestions with explicit repayments', () => {
  const payCycle: PayCycleConfig = {
    frequency: 'monthly',
    nextPayDate: '2026-03-14',
    primaryIncomeAccountId: 'account-primary',
    savingsAccountId: 'account-savings',
  };

  const accounts: Account[] = [
    {
      id: 'account-primary',
      accountName: 'Main Income Account',
      accountType: 'Bank Account',
      balance: 5000,
      lastUpdated: '2026-03-01T00:00:00.000Z',
      hidden: false,
    },
    {
      id: 'account-spend',
      accountName: 'Everyday Spending',
      accountType: 'Bank Account',
      balance: 1200,
      lastUpdated: '2026-03-01T00:00:00.000Z',
      hidden: false,
    },
    {
      id: 'account-cc',
      accountName: 'Chase Sapphire',
      accountType: 'Credit Card',
      balance: -2000,
      lastUpdated: '2026-03-01T00:00:00.000Z',
      hidden: false,
    },
    {
      id: 'account-savings',
      accountName: 'Emergency Savings',
      accountType: 'Savings',
      balance: 800,
      lastUpdated: '2026-03-01T00:00:00.000Z',
      hidden: false,
    },
  ];

  const categories: Category[] = [
    {
      id: 'cat-repay',
      userId: 'user_1',
      name: 'Loan Repayments',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
    {
      id: 'cat-grocery',
      userId: 'user_1',
      name: 'Groceries',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
  ];

  const cashFlowByAccount: AccountCashFlow[] = [
    {
      accountId: 'account-primary',
      accountName: 'Main Income Account',
      monthlyIncome: 3500,
      monthlyExpenses: 0,
      expenseBreakdown: [],
    },
    {
      accountId: 'account-spend',
      accountName: 'Everyday Spending',
      monthlyIncome: 0,
      monthlyExpenses: 700,
      expenseBreakdown: [
        {
          categoryId: 'cat-repay',
          categoryName: 'Loan Repayments',
          monthlyAmount: 300,
          expenseIds: ['exp-repay-complete'],
        },
        {
          categoryId: 'cat-grocery',
          categoryName: 'Groceries',
          monthlyAmount: 400,
          expenseIds: ['exp-grocery'],
        },
      ],
    },
  ];

  const expenses: Expense[] = [
    {
      id: 'exp-repay-complete',
      name: 'Credit Card Repayment',
      amount: 300,
      frequency: 'monthly',
      categoryId: 'cat-repay',
      paidFromAccountId: 'account-spend',
      linkedRepaymentAccountId: 'account-cc',
    },
    {
      id: 'exp-grocery',
      name: 'Groceries',
      amount: 400,
      frequency: 'monthly',
      categoryId: 'cat-grocery',
      paidFromAccountId: 'account-spend',
    },
  ];

  it('creates explicit repayment rows and excludes repayment amount from generic coverage', () => {
    const suggestions = calculateTransferSuggestions(
      payCycle,
      cashFlowByAccount,
      accounts,
      expenses,
      categories,
      true
    );

    const repayment = suggestions.find((s) => s.kind === 'repayment');
    const coverage = suggestions.find(
      (s) => s.kind === 'coverage' && s.toAccountId === 'account-spend'
    );

    expect(repayment).toBeDefined();
    expect(repayment?.fromAccountId).toBe('account-spend');
    expect(repayment?.toAccountId).toBe('account-cc');
    expect(repayment?.amountMonthly).toBe(300);

    expect(coverage).toBeDefined();
    expect(coverage?.amountMonthly).toBe(400);
  });

  it('creates an action-required row when repayment destination is missing', () => {
    const incompleteRepaymentExpense: Expense = {
      id: 'exp-repay-missing-link',
      name: 'Car Loan Repayment',
      amount: 200,
      frequency: 'monthly',
      categoryId: 'cat-repay',
      paidFromAccountId: 'account-spend',
    };

    const suggestions = calculateTransferSuggestions(
      payCycle,
      cashFlowByAccount,
      accounts,
      [incompleteRepaymentExpense],
      categories,
      true
    );

    const actionRequiredRow = suggestions.find((s) => s.kind === 'action_required_repayment');

    expect(actionRequiredRow).toBeDefined();
    expect(actionRequiredRow?.requiresAction).toBe(true);
    expect(actionRequiredRow?.actionExpenseId).toBe('exp-repay-missing-link');
  });
});

