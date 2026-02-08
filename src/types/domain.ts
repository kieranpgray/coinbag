/**
 * Domain types for Coinbag application
 *
 * This file contains all TypeScript interfaces and types representing
 * the core domain entities and data structures used throughout the application.
 */

/**
 * Category entity representing a user-defined expense category
 */
export interface Category {
  id: string;
  userId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Asset entity representing a user's financial asset
 */
export interface Asset {
  id: string;
  name: string;
  type: 'Real Estate' | 'Investments' | 'Vehicles' | 'Crypto' | 'Cash' | 'Superannuation' | 'Other';
  value: number;
  change1D?: number;
  change1W?: number;
  dateAdded: string;
  institution?: string;
  notes?: string;
}

/**
 * Liability entity representing a user's financial liability
 */
export interface Liability {
  id: string;
  name: string;
  type: 'Loans' | 'Credit Cards' | 'Other';
  balance: number;
  interestRate?: number;
  monthlyPayment?: number;
  dueDate?: string;
  institution?: string;
  repaymentAmount?: number;
  repaymentFrequency?: ExpenseFrequency;
}

/**
 * Account entity representing a connected financial account
 */
export interface Account {
  id: string;
  institution?: string; // Optional institution name
  accountName: string;
  balance: number;
  accountType: string;
  currency?: string; // Optional for backward compatibility
  creditLimit?: number; // Credit limit for credit cards/loans
  balanceOwed?: number; // Balance owed for credit cards/loans (positive number)
  lastUpdated: string;
  hidden: boolean;
}

/**
 * Transaction entity representing a financial transaction
 */
export interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  category: string;
  accountId: string;
  type: 'income' | 'expense' | 'credit' | 'debit';
  status?: 'completed' | 'pending';
}

/**
 * Goal entity representing a financial goal
 */
export interface Goal {
  id: string;
  name: string;
  description?: string;
  source?: string; // e.g., "Net Worth", "Total Cash", "ANZ CC", etc.
  type?: 'Grow' | 'Save' | 'Pay Off' | 'Invest';
  targetAmount: number;
  currentAmount: number;
  deadline?: string; // ISO date string
  status: 'active' | 'completed' | 'paused';
  accountId?: string; // Linked account ID for bidirectional sync
}

/**
 * Expense frequency options
 */
export type ExpenseFrequency = 'weekly' | 'fortnightly' | 'monthly' | 'quarterly' | 'yearly';

/**
 * Predefined expense categories
 * @deprecated Use categories from the categories table instead
 */
export type ExpenseCategory =
  | 'Utilities'
  | 'Entertainment'
  | 'Software'
  | 'Streaming'
  | 'Cloud Storage'
  | 'Insurance'
  | 'Food'
  | 'Transportation'
  | 'Health'
  | 'Education'
  | 'Other';

/**
 * Expense entity representing a recurring expense
 * Includes subscriptions, bills, savings, repayments, living, and lifestyle expenses
 */
export interface Expense {
  id: string;
  name: string;
  amount: number;
  frequency: ExpenseFrequency;
  chargeDate?: string;
  nextDueDate?: string | null;
  categoryId: string;
  paidFromAccountId?: string;
}

/**
 * @deprecated Use Expense instead
 */
export type SubscriptionFrequency = ExpenseFrequency;

/**
 * @deprecated Use ExpenseCategory instead
 */
export type SubscriptionCategory = ExpenseCategory;

/**
 * @deprecated Use Expense instead
 */
export interface Subscription extends Expense {}

/**
 * Scenario entity representing a financial scenario
 */
export interface Scenario {
  id: string;
  name: string;
  description: string;
  assumptions: Record<string, unknown>;
  projections: Record<string, unknown>;
}

/**
 * Document entity representing a vault document
 */
export interface Document {
  id: string;
  name: string;
  type: string;
  uploadDate: string;
  size: number;
  url: string;
}

/**
 * News entity representing market news and updates
 */
export interface News {
  id: string;
  title: string;
  summary: string;
  source: string;
  date: string;
  relatedHoldings?: string[];
}

/**
 * Market summary data
 */
export interface MarketSummary {
  sp500: {
    change1D: number;
    change7D: number;
    change30D: number;
  };
  commentary: string;
}

/**
 * Earnings calendar item
 */
export interface Earnings {
  id: string;
  company: string;
  date: string;
  estimatedEps?: number;
  previousEps?: number;
}

/**
 * Income source entity representing a user's income
 */
export interface Income {
  id: string;
  name: string;
  source: 'Salary' | 'Freelance' | 'Business' | 'Investments' | 'Rental' | 'Other';
  amount: number;
  frequency: 'weekly' | 'fortnightly' | 'monthly' | 'yearly';
  nextPaymentDate?: string;
  paidToAccountId?: string;
}

/**
 * User entity representing the authenticated user
 */
export interface User {
  id: string;
  firstName?: string;
  lastName?: string;
  email: string;
  phoneNumber?: string;
  privacyMode: boolean;
  themePreference: 'system' | 'light' | 'dark';
  taxRate: number;
  emailNotifications: {
    portfolioSummary: boolean;
    spendingAlerts: boolean;
    stockPriceAlerts: boolean;
    featureAnnouncements: boolean;
    monthlyReports: boolean;
    marketingPromotions: boolean;
  };
}

/**
 * Setup checklist item
 */
export interface SetupChecklistItem {
  id: string;
  label: string;
  description?: string;
  completed: boolean;
}

/**
 * Data source presence counts for dashboard state logic
 * A source "exists" only if its count > 0 (not derived from aggregated $0 values)
 */
export interface DashboardDataSources {
  accountsCount: number;
  assetsCount: number;
  liabilitiesCount: number;
  expensesCount: number;
  transactionsCount: number;
  incomeCount: number;
  holdingsCount: number; // Count of Investments or Crypto assets
}

/**
 * Dashboard data aggregation
 */
export interface DashboardData {
  netWorth: number;
  netWorthChange1D: number;
  netWorthChange1W: number;
  investments: number;
  investmentsChange1D: number;
  investmentsChange1W: number;
  superannuation: number;
  superannuationChange1D: number;
  superannuationChange1W: number;
  totalCash: number;
  totalCashChange1D: number;
  totalCashChange1W: number;
  totalDebts: number;
  totalDebtsChange1D: number;
  totalDebtsChange1W: number;
  estimatedTaxOnGains: number;
  adjustedNetWorth: number;
  assets: Asset[];
  liabilities: Liability[];
  accounts: Account[];
  expenses: Expense[];
  expenseBreakdown: ExpenseBreakdown[];
  incomeBreakdown: IncomeBreakdown[];
  setupProgress: number;
  setupChecklist: SetupChecklistItem[];
  dataSources: DashboardDataSources;
}

/**
 * Asset breakdown by category
 */
export interface AssetBreakdown {
  category: Asset['type'];
  value: number;
  percentage: number;
}

/**
 * Liability breakdown by category
 */
export interface LiabilityBreakdown {
  category: Liability['type'];
  balance: number;
  percentage: number;
}

/**
 * Expense breakdown by category
 */
export interface ExpenseBreakdown {
  category: string;
  amount: number;
  percentage: number;
}

/**
 * Income breakdown by category
 */
export interface IncomeBreakdown {
  category: string;
  amount: number;
  percentage: number;
}