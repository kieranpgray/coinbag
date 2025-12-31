/**
 * Expense type mapping utility
 * Maps subscription category names to expense types for filtering and organization
 */

export type ExpenseType = 'subscriptions' | 'bills' | 'repayments' | 'savings' | 'living' | 'lifestyle';

/**
 * Default category mappings to expense types
 * Case-insensitive matching
 */
const EXPENSE_TYPE_MAPPINGS: Record<string, ExpenseType> = {
  // Subscriptions
  entertainment: 'subscriptions',
  streaming: 'subscriptions',
  software: 'subscriptions',
  'cloud storage': 'subscriptions',
  'gym membership': 'subscriptions',
  'news & media': 'subscriptions',
  'news': 'subscriptions',
  media: 'subscriptions',
  
  // Bills
  utilities: 'bills',
  electricity: 'bills',
  gas: 'bills',
  water: 'bills',
  internet: 'bills',
  phone: 'bills',
  insurance: 'bills',
  rent: 'bills',
  mortgage: 'bills',
  
  // Repayments
  loans: 'repayments',
  'credit card': 'repayments',
  'credit cards': 'repayments',
  'student loan': 'repayments',
  'student loans': 'repayments',
  'personal loan': 'repayments',
  'car loan': 'repayments',
  'home loan': 'repayments',
  repayment: 'repayments',
  repayments: 'repayments',
  
  // Savings
  savings: 'savings',
  'savings account': 'savings',
  'emergency fund': 'savings',
  investment: 'savings',
  
  // Living
  food: 'living',
  groceries: 'living',
  transportation: 'living',
  'public transport': 'repayments',
  fuel: 'living',
  health: 'living',
  medical: 'living',
  pharmacy: 'living',
  education: 'living',
  
  // Lifestyle
  'dining out': 'lifestyle',
  coffee: 'lifestyle',
  shopping: 'lifestyle',
  clothing: 'lifestyle',
  hobbies: 'lifestyle',
  travel: 'lifestyle',
  
  // Default fallback
  other: 'lifestyle',
  uncategorised: 'lifestyle',
};

/**
 * Get expense type for a given category name
 * @param categoryName - The category name to map
 * @returns The expense type, defaults to 'lifestyle' if not found
 */
export function getExpenseType(categoryName: string): ExpenseType {
  if (!categoryName) {
    return 'lifestyle';
  }
  
  const normalized = categoryName.toLowerCase().trim();
  
  // Direct match
  if (EXPENSE_TYPE_MAPPINGS[normalized]) {
    return EXPENSE_TYPE_MAPPINGS[normalized];
  }
  
  // Partial match (e.g., "Entertainment Services" matches "entertainment")
  for (const [key, value] of Object.entries(EXPENSE_TYPE_MAPPINGS)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return value;
    }
  }
  
  // Default fallback
  return 'lifestyle';
}

/**
 * Get all expense types
 */
export function getAllExpenseTypes(): ExpenseType[] {
  return ['subscriptions', 'bills', 'repayments', 'savings', 'living', 'lifestyle'];
}

/**
 * Get display label for expense type
 */
export function getExpenseTypeLabel(type: ExpenseType): string {
  const labels: Record<ExpenseType, string> = {
    subscriptions: 'Subscriptions',
    bills: 'Bills',
    repayments: 'Repayments',
    savings: 'Savings',
    living: 'Living',
    lifestyle: 'Lifestyle',
  };
  return labels[type];
}

/**
 * Get display label for expense type in plural form (for empty states)
 */
export function getExpenseTypeLabelPlural(type: ExpenseType): string {
  const labels: Record<ExpenseType, string> = {
    subscriptions: 'subscriptions',
    bills: 'bills',
    repayments: 'repayments',
    savings: 'savings',
    living: 'living expenses',
    lifestyle: 'lifestyle expenses',
  };
  return labels[type];
}

/**
 * Get singular form label for expense type (for "Add [type]" buttons)
 */
export function getExpenseTypeLabelSingular(type: ExpenseType): string {
  const labels: Record<ExpenseType, string> = {
    subscriptions: 'subscription',
    bills: 'bill',
    repayments: 'repayment',
    savings: 'saving',
    living: 'living expense',
    lifestyle: 'lifestyle expense',
  };
  return labels[type];
}

