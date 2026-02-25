import { v4 as uuidv4 } from 'uuid';
import type {
  Asset,
  Liability,
  Account,
  Transaction,
  Goal,
  Expense,
  Subscription,
  SubscriptionCategory,
  Category,
  User,
  DashboardData,
  SetupChecklistItem,
  Income,
} from '@/types/domain';
import { DashboardCalculations } from '@/features/dashboard/services/dashboardCalculations';

/**
 * Generate a random number between min and max (inclusive)
 */
function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Generate a random date within the last N days
 */
function randomDate(daysAgo: number): string {
  const date = new Date();
  date.setDate(date.getDate() - randomBetween(0, daysAgo));
  return date.toISOString();
}

/**
 * Asset types
 */
const ASSET_TYPES: Asset['type'][] = ['Real Estate', 'Other Investments', 'Vehicles', 'Crypto', 'Cash', 'Superannuation', 'Stock', 'RSU'];

/**
 * Liability types
 */
const LIABILITY_TYPES: Liability['type'][] = ['Loans', 'Credit Cards', 'Other'];

/**
 * Goal types
 */
const SOURCE_OPTIONS = ['Cash', 'Savings account', 'Bank account', 'Credit card', 'Loan', 'Investment', 'Other'];

/**
 * Account types
 */
const ACCOUNT_TYPES = ['Bank Account', 'Savings', 'Investment', 'Credit Card', 'Loan', 'Crypto'];

/**
 * Institutions
 */
const INSTITUTIONS = [
  'Chase',
  'Bank of America',
  'Wells Fargo',
  'Citi',
  'Goldman Sachs',
  'Fidelity',
  'Vanguard',
  'Coinbase',
  'Kraken',
];

/**
 * Create a mock Asset
 */
export function createAsset(overrides?: Partial<Asset>): Asset {
  const typeIndex = randomBetween(0, ASSET_TYPES.length - 1);
  const type = ASSET_TYPES[typeIndex]! as Asset['type']; // Safe: index is guaranteed to be valid
  const baseValue = randomBetween(10000, 1000000);
  const change1D = randomBetween(-5, 5);
  const change1W = randomBetween(-10, 10);

  const institutionIndex = randomBetween(0, INSTITUTIONS.length - 1);
  const institution = INSTITUTIONS[institutionIndex]!; // Safe: index is guaranteed to be valid
  const dateAdded = randomDate(365);
  const notes = randomBetween(0, 1) === 1 ? `Notes for ${type} asset` : undefined;
  
  const asset: Asset = {
    id: uuidv4(),
    name: `${type} Asset ${randomBetween(1, 100)}`,
    type,
    value: baseValue,
    change1D,
    change1W,
    dateAdded,
    institution,
    notes,
  };
  if (!overrides) return asset;
  return {
    id: overrides.id ?? asset.id,
    name: overrides.name ?? asset.name,
    type: (overrides.type ?? asset.type) as Asset['type'],
    value: overrides.value ?? asset.value,
    change1D: overrides.change1D ?? asset.change1D,
    change1W: overrides.change1W ?? asset.change1W,
    dateAdded: overrides.dateAdded ?? dateAdded,
    institution: overrides.institution ?? institution,
    notes: overrides.notes ?? notes,
  };
}

/**
 * Create multiple mock Assets
 */
export function createAssets(count: number): Asset[] {
  return Array.from({ length: count }, () => createAsset());
}

/**
 * Create a mock Liability
 */
export function createLiability(overrides?: Partial<Liability>): Liability {
  const typeIndex = randomBetween(0, LIABILITY_TYPES.length - 1);
  const type = LIABILITY_TYPES[typeIndex]! as Liability['type']; // Safe: index is guaranteed to be valid
  const balance = randomBetween(1000, 500000);
  const interestRate = type === 'Loans' ? randomBetween(2, 12) : randomBetween(15, 25);
  const monthlyPayment = type === 'Loans' ? randomBetween(200, 2000) : undefined;
  const dueDate = randomDate(30);
  const institutionIndex = randomBetween(0, INSTITUTIONS.length - 1);
  const institution = INSTITUTIONS[institutionIndex]!; // Safe: index is guaranteed to be valid

  const liability: Liability = {
    id: uuidv4(),
    name: `${type} ${randomBetween(1, 100)}`,
    type,
    balance,
    interestRate,
    monthlyPayment,
    dueDate,
    institution,
  };
  if (!overrides) return liability;
  return {
    id: overrides.id ?? liability.id,
    name: overrides.name ?? liability.name,
    type: (overrides.type ?? liability.type) as Liability['type'],
    balance: overrides.balance ?? liability.balance,
    interestRate: overrides.interestRate ?? liability.interestRate,
    monthlyPayment: overrides.monthlyPayment ?? liability.monthlyPayment,
    dueDate: overrides.dueDate ?? dueDate,
    institution: overrides.institution ?? institution,
  };
}

/**
 * Create multiple mock Liabilities
 */
export function createLiabilities(count: number): Liability[] {
  return Array.from({ length: count }, () => createLiability());
}

/**
 * Create a mock Account
 */
export function createAccount(overrides?: Partial<Account>): Account {
  const accountTypeIndex = randomBetween(0, ACCOUNT_TYPES.length - 1);
  const accountType = ACCOUNT_TYPES[accountTypeIndex]!; // Safe: index is guaranteed to be valid
  const balance = randomBetween(1000, 500000);
  const institutionIndex = randomBetween(0, INSTITUTIONS.length - 1);
  const institution = INSTITUTIONS[institutionIndex]!; // Safe: index is guaranteed to be valid
  const lastUpdated = randomDate(7);

  const account: Account = {
    id: uuidv4(),
    institution,
    accountName: `${accountType} Account ${randomBetween(1, 100)}`,
    balance,
    accountType,
    lastUpdated,
    hidden: false,
  };
  if (!overrides) return account;
  return {
    id: overrides.id ?? account.id,
    institution: overrides.institution ?? institution,
    accountName: overrides.accountName ?? account.accountName,
    balance: overrides.balance ?? account.balance,
    accountType: overrides.accountType ?? accountType,
    creditLimit: overrides.creditLimit ?? account.creditLimit,
    balanceOwed: overrides.balanceOwed ?? account.balanceOwed,
    lastUpdated: overrides.lastUpdated ?? lastUpdated,
    hidden: overrides.hidden ?? account.hidden,
  };
}

/**
 * Create multiple mock Accounts
 */
export function createAccounts(count: number): Account[] {
  return Array.from({ length: count }, () => createAccount());
}

/**
 * Create a mock Transaction
 * 
 * WARNING: This function generates mock/fake transaction data for testing ONLY.
 * 
 * CRITICAL: DO NOT use this in production code paths. Use the transactions repository
 * pattern instead to ensure only factual statement-extracted transactions are displayed.
 * 
 * @param accountId - Account ID for the mock transaction
 * @param overrides - Optional overrides for transaction fields
 * @returns A mock Transaction object
 */
export function createTransaction(accountId: string, overrides?: Partial<Transaction>): Transaction {
  const type: Transaction['type'] = randomBetween(0, 1) === 0 ? 'expense' : 'income';
  const amount = type === 'expense' ? randomBetween(10, 5000) : randomBetween(100, 10000);
  const categories = [
    'Food',
    'Transportation',
    'Shopping',
    'Bills',
    'Entertainment',
    'Salary',
    'Investment',
    'Transfer',
  ];

  const categoryIndex = randomBetween(0, categories.length - 1);
  const category = categories[categoryIndex]!; // Safe: index is guaranteed to be valid
  const date = randomDate(30);
  const description = `${type === 'expense' ? 'Paid' : 'Received'} ${category}`;

  const transaction: Transaction = {
    id: uuidv4(),
    date,
    description,
    amount,
    category,
    accountId,
    type,
  };
  if (!overrides) return transaction;
  return {
    id: overrides.id ?? transaction.id,
    date: overrides.date ?? date,
    description: overrides.description ?? description,
    amount: overrides.amount ?? transaction.amount,
    category: (overrides.category ?? category) as string,
    accountId: overrides.accountId ?? accountId,
    type: (overrides.type ?? transaction.type) as Transaction['type'],
  };
}

/**
 * Create multiple mock Transactions
 */
export function createTransactions(accountIds: string[], count: number): Transaction[] {
  if (accountIds.length === 0) return [];
  return Array.from({ length: count }, () => {
    const accountId = accountIds[randomBetween(0, accountIds.length - 1)];
    if (!accountId) {
      throw new Error('Account ID is required');
    }
    return createTransaction(accountId);
  });
}

/**
 * Create a mock Goal
 */
export function createGoal(overrides?: Partial<Goal>): Goal {
  const sourceIndex = randomBetween(0, SOURCE_OPTIONS.length - 1);
  const source = SOURCE_OPTIONS[sourceIndex]!;
  const targetAmount = randomBetween(10000, 500000);
  const currentAmount = randomBetween(0, targetAmount * 0.8);
  const status: Goal['status'] =
    currentAmount >= targetAmount
      ? 'completed'
      : randomBetween(0, 9) === 0
        ? 'paused'
        : 'active';

  const deadline = randomDate(-365);

  const goal: Goal = {
    id: uuidv4(),
    name: `Goal ${randomBetween(1, 100)}`,
    description: randomBetween(0, 2) === 0 ? `Description for goal` : undefined,
    source: randomBetween(0, 2) === 0 ? source : undefined,
    targetAmount,
    currentAmount,
    deadline,
    status,
  };
  if (!overrides) return goal;
  return {
    id: overrides.id ?? goal.id,
    name: overrides.name ?? goal.name,
    description: overrides.description ?? goal.description,
    source: overrides.source ?? goal.source,
    accountId: overrides.accountId ?? goal.accountId,
    targetAmount: overrides.targetAmount ?? goal.targetAmount,
    currentAmount: overrides.currentAmount ?? goal.currentAmount,
    deadline: overrides.deadline ?? deadline,
    status: (overrides.status ?? goal.status) as Goal['status'],
  };
}

/**
 * Create multiple mock Goals
 */
export function createGoals(count: number): Goal[] {
  return Array.from({ length: count }, () => createGoal());
}

/**
 * Create a mock Subscription
 */
export function createExpense(overrides?: Partial<Expense>): Expense {
  const frequencies: Subscription['frequency'][] = ['monthly', 'yearly', 'weekly', 'fortnightly'];
  const categoryNames: SubscriptionCategory[] = ['Utilities', 'Entertainment', 'Software', 'Streaming', 'Cloud Storage', 'Insurance'];
  const frequencyIndex = randomBetween(0, frequencies.length - 1);
  const frequency = frequencies[frequencyIndex]! as Subscription['frequency']; // Safe: index is guaranteed to be valid

  // Amount logic based on frequency and typical costs
  let amount: number;
  switch (frequency) {
    case 'weekly':
      amount = randomBetween(10, 100);
      break;
    case 'fortnightly':
      amount = randomBetween(20, 200);
      break;
    case 'monthly':
      amount = randomBetween(5, 200);
      break;
    case 'yearly':
      amount = randomBetween(50, 1500);
      break;
    default:
      amount = randomBetween(5, 50);
  }

  const categoryIndex = randomBetween(0, categoryNames.length - 1);
  const categoryName = categoryNames[categoryIndex]!; // Safe: index is guaranteed to be valid

  const chargeDate = randomDate(365); // Charge date within the past year
  const nextDueDate = randomDate(-30); // Next due date within the next 30 days
  const paidFromAccountId = randomBetween(0, 2) === 0 ? uuidv4() : undefined; // Sometimes has an account

  const expense: Expense = {
    id: uuidv4(),
    name: `${categoryName} Subscription ${randomBetween(1, 100)}`,
    amount,
    frequency,
    chargeDate,
    nextDueDate,
    categoryId: uuidv4(),
    paidFromAccountId,
  };

  // Ensure all required fields are present when merging overrides
  if (overrides) {
    return {
      id: overrides.id ?? expense.id,
      name: overrides.name ?? expense.name,
      amount: overrides.amount ?? expense.amount,
      frequency: (overrides.frequency ?? frequency) as Expense['frequency'],
      chargeDate: overrides.chargeDate ?? chargeDate,
      nextDueDate: overrides.nextDueDate ?? nextDueDate,
      categoryId: overrides.categoryId ?? expense.categoryId,
      paidFromAccountId: overrides.paidFromAccountId ?? paidFromAccountId,
    };
  }
  return expense;
}

/**
 * Create multiple mock Subscriptions
 */
export function createExpenses(count: number): Expense[] {
  return Array.from({ length: count }, () => createExpense());
}

/**
 * Create a mock User
 */
export function createUser(overrides?: Partial<User>): User {
  return {
    id: uuidv4(),
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    phoneNumber: undefined,
    privacyMode: false,
    themePreference: 'system' as const,
    taxRate: 20,
    emailNotifications: {
      portfolioSummary: true,
      spendingAlerts: true,
      stockPriceAlerts: true,
      featureAnnouncements: false,
      monthlyReports: false,
      marketingPromotions: false,
    },
    ...overrides,
  };
}

/**
 * Predefined category names for mock data
 */
const MOCK_CATEGORY_NAMES = [
  'Utilities',
  'Entertainment',
  'Software',
  'Streaming',
  'Cloud Storage',
  'Insurance',
  'Food',
  'Transportation',
  'Health',
  'Education',
  'Other',
];

/**
 * Create a single category
 */
export function createCategory(overrides: Partial<Category> = {}): Category {
  const name = overrides.name ?? MOCK_CATEGORY_NAMES[randomBetween(0, MOCK_CATEGORY_NAMES.length - 1)]!;

  return {
    id: uuidv4(),
    userId: 'mock-user-id',
    name,
    createdAt: randomDate(30),
    updatedAt: randomDate(7),
    ...overrides,
  };
}

/**
 * Create multiple categories
 */
export function createCategories(count: number = 5): Category[] {
  const categories: Category[] = [];

  // Create a subset of the predefined categories
  const selectedNames = MOCK_CATEGORY_NAMES.slice(0, Math.min(count, MOCK_CATEGORY_NAMES.length));

  selectedNames.forEach((name) => {
    categories.push(createCategory({ name }));
  });

  return categories;
}

/**
 * Create setup checklist items based on actual data source counts
 */
export function createSetupChecklist(
  accountsCount: number,
  assetsCount: number,
  liabilitiesCount: number,
  expensesCount: number,
  incomeCount: number,
  transactionsCount: number,
  holdingsCount: number
): SetupChecklistItem[] {
  return [
    {
      id: 'accounts',
      label: 'Add an account',
      description: 'Track your cash and balances',
      completed: accountsCount > 0,
    },
    {
      id: 'assets',
      label: 'Add an asset',
      description: 'Property, vehicles, or other assets',
      completed: assetsCount > 0,
    },
    {
      id: 'liabilities',
      label: 'Add a liability',
      description: 'Loans, credit cards, or debts',
      completed: liabilitiesCount > 0,
    },
    {
      id: 'expenses',
      label: 'Add an expense',
      description: 'Recurring expenses',
      completed: expensesCount > 0,
    },
    {
      id: 'income',
      label: 'Add income',
      description: 'Salary or other income sources',
      completed: incomeCount > 0,
    },
    {
      id: 'transactions',
      label: 'Add transactions (optional)',
      description: 'For detailed cashflow',
      completed: transactionsCount > 0,
    },
    {
      id: 'investments',
      label: 'Add investments / crypto (optional)',
      description: 'Track your portfolio',
      completed: holdingsCount > 0,
    },
  ];
}

/**
 * Calculate dashboard data from assets, liabilities, accounts, expenses, and incomes
 * Now uses memoized calculation service for better performance
 */
export function calculateDashboardData(
  assets: Asset[],
  liabilities: Liability[],
  accounts: Account[],
  expenses: Expense[] = [],
  incomes: Income[] = []
): Partial<DashboardData> {
  const calculations = DashboardCalculations.calculateAll(assets, liabilities, accounts, expenses, incomes);

  // Calculate data source counts (use from calculations.dataSources for consistency)
  const accountsCount = accounts.length;
  const assetsCount = assets.length;
  const liabilitiesCount = liabilities.length;
  const expensesCount = expenses.length;
  const transactionsCount = 0; // Mock transactions not implemented yet
  const incomeCount = incomes.length; // Use actual income count from incomes array
  const holdingsCount = assets.filter(a => a.type === 'Other Investments' || a.type === 'Crypto' || a.type === 'Stock' || a.type === 'RSU').length;

  const checklist = createSetupChecklist(
    accountsCount,
    assetsCount,
    liabilitiesCount,
    expensesCount,
    incomeCount,
    transactionsCount,
    holdingsCount
  );

  // Calculate setup progress based on completed applicable items
  // Core items are always counted, optional items only if feature exists
  const applicableItems = checklist.filter(item => 
    !item.id.includes('optional') || item.completed
  );
  const completedCount = applicableItems.filter((item) => item.completed).length;
  const setupProgress = applicableItems.length > 0 
    ? Math.round((completedCount / applicableItems.length) * 100)
    : 0;

  return {
    ...calculations,
    setupProgress,
    setupChecklist: checklist,
  };
}

