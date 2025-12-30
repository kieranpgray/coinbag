import { v4 as uuidv4 } from 'uuid';
import type {
  Asset,
  Liability,
  Account,
  Transaction,
  Goal,
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
const ASSET_TYPES: Asset['type'][] = ['Real Estate', 'Investments', 'Vehicles', 'Crypto', 'Cash', 'Superannuation', 'Other'];

/**
 * Liability types
 */
const LIABILITY_TYPES: Liability['type'][] = ['Loans', 'Credit Cards', 'Other'];

/**
 * Goal types
 */
const GOAL_TYPES: Goal['type'][] = ['Grow', 'Save', 'Pay Off', 'Invest'];

/**
 * Account types
 */
const ACCOUNT_TYPES = ['Checking', 'Savings', 'Investment', 'Credit Card', 'Loan', 'Crypto'];

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
  const availableBalance = accountType === 'Credit Card' ? randomBetween(1000, 10000) : balance;
  const institutionIndex = randomBetween(0, INSTITUTIONS.length - 1);
  const institution = INSTITUTIONS[institutionIndex]!; // Safe: index is guaranteed to be valid
  const lastUpdated = randomDate(7);

  const account: Account = {
    id: uuidv4(),
    institution,
    accountName: `${accountType} Account ${randomBetween(1, 100)}`,
    balance,
    availableBalance,
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
    availableBalance: overrides.availableBalance ?? account.availableBalance,
    accountType: overrides.accountType ?? accountType,
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
  const typeIndex = randomBetween(0, GOAL_TYPES.length - 1);
  const type = GOAL_TYPES[typeIndex]! as Goal['type']; // Safe: index is guaranteed to be valid
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
    name: `${type} Goal ${randomBetween(1, 100)}`,
    description: randomBetween(0, 2) === 0 ? `Description for ${type} goal` : undefined,
    type,
    source: randomBetween(0, 2) === 0 ? 'Net Worth' : undefined,
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
    type: (overrides.type ?? goal.type) as Goal['type'],
    source: overrides.source ?? goal.source,
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
export function createSubscription(overrides?: Partial<Subscription>): Subscription {
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
  const notes = randomBetween(0, 2) === 0 ? `Notes for ${categoryName.toLowerCase()} subscription` : undefined;

  const subscription: Subscription = {
    id: uuidv4(),
    name: `${categoryName} Subscription ${randomBetween(1, 100)}`,
    amount,
    frequency,
    chargeDate,
    nextDueDate,
    categoryId: uuidv4(),
    notes,
  };

  // Ensure all required fields are present when merging overrides
  if (overrides) {
    return {
      id: overrides.id ?? subscription.id,
      name: overrides.name ?? subscription.name,
      amount: overrides.amount ?? subscription.amount,
      frequency: (overrides.frequency ?? frequency) as Subscription['frequency'],
      chargeDate: overrides.chargeDate ?? chargeDate,
      nextDueDate: overrides.nextDueDate ?? nextDueDate,
      categoryId: overrides.categoryId ?? subscription.categoryId,
      notes: overrides.notes ?? notes,
    };
  }
  return subscription;
}

/**
 * Create multiple mock Subscriptions
 */
export function createSubscriptions(count: number): Subscription[] {
  return Array.from({ length: count }, () => createSubscription());
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
    darkMode: false,
    taxRate: 20,
    emailNotifications: {
      portfolioSummary: true,
      spendingAlerts: true,
      stockPriceAlerts: true,
      featureAnnouncements: false,
      monthlyReports: false,
      marketingPromotions: false,
    },
    mfaEnabled: false,
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
  subscriptionsCount: number,
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
      id: 'subscriptions',
      label: 'Add a subscription',
      description: 'Recurring expenses',
      completed: subscriptionsCount > 0,
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
 * Calculate dashboard data from assets, liabilities, accounts, subscriptions, and incomes
 * Now uses memoized calculation service for better performance
 */
export function calculateDashboardData(
  assets: Asset[],
  liabilities: Liability[],
  accounts: Account[],
  subscriptions: Subscription[] = [],
  incomes: Income[] = []
): Partial<DashboardData> {
  const calculations = DashboardCalculations.calculateAll(assets, liabilities, accounts, subscriptions, incomes);

  // Calculate data source counts (use from calculations.dataSources for consistency)
  const accountsCount = accounts.length;
  const assetsCount = assets.length;
  const liabilitiesCount = liabilities.length;
  const subscriptionsCount = subscriptions.length;
  const transactionsCount = 0; // Mock transactions not implemented yet
  const incomeCount = incomes.length; // Use actual income count from incomes array
  const holdingsCount = assets.filter(a => a.type === 'Investments' || a.type === 'Crypto').length;

  const checklist = createSetupChecklist(
    accountsCount,
    assetsCount,
    liabilitiesCount,
    subscriptionsCount,
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

