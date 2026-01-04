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

/**
 * Dynamically discover expense types from actual expense data
 * Returns only expense types that exist in the user's expenses
 * @param expenses - Array of expenses to analyze
 * @param categoryMap - Map of category IDs to category names
 * @param uncategorisedId - Optional ID of "Uncategorised" category for fallback
 * @returns Array of expense types that exist in the expenses
 */
export function getExpenseTypesFromExpenses(
  expenses: Array<{ categoryId: string }>,
  categoryMap: Map<string, string>,
  uncategorisedId?: string
): ExpenseType[] {
  const expenseTypes = new Set<ExpenseType>();
  
  for (const expense of expenses) {
    // Get category name safely
    const categoryName = categoryMap.get(expense.categoryId) || 
      (uncategorisedId && expense.categoryId === uncategorisedId ? 'Uncategorised' : '');
    
    if (categoryName) {
      const expenseType = getExpenseType(categoryName);
      expenseTypes.add(expenseType);
    }
  }
  
  // Return in a consistent order (same as getAllExpenseTypes)
  const allTypes = getAllExpenseTypes();
  return allTypes.filter(type => expenseTypes.has(type));
}

/**
 * Get expense type totals (monthly equivalents) from expenses
 * Returns a record of expense type → total monthly amount
 * Dynamically handles any expense type, not just hardcoded ones
 * @param expenses - Array of expenses with amount, frequency, and categoryId
 * @param categoryMap - Map of category IDs to category names
 * @param uncategorisedId - Optional ID of "Uncategorised" category for fallback
 * @param calculateMonthlyEquivalent - Function to calculate monthly equivalent from amount and frequency
 * @returns Record mapping expense types to total monthly amounts
 */
export function getExpenseTypeTotals(
  expenses: Array<{ amount: number; frequency: string; categoryId: string }>,
  categoryMap: Map<string, string>,
  uncategorisedId: string | undefined,
  calculateMonthlyEquivalent: (amount: number, frequency: string) => number
): Record<ExpenseType, number> {
  const totals: Record<string, number> = {};
  
  for (const expense of expenses) {
    // Get category name safely
    const categoryName = categoryMap.get(expense.categoryId) || 
      (uncategorisedId && expense.categoryId === uncategorisedId ? 'Uncategorised' : '');
    
    if (categoryName) {
      const expenseType = getExpenseType(categoryName);
      const monthlyAmount = calculateMonthlyEquivalent(expense.amount, expense.frequency);
      totals[expenseType] = (totals[expenseType] || 0) + monthlyAmount;
    }
  }
  
  // Ensure all expense types are present (even if 0)
  const allTypes = getAllExpenseTypes();
  const result: Record<ExpenseType, number> = {} as Record<ExpenseType, number>;
  for (const type of allTypes) {
    result[type] = totals[type] || 0;
  }
  
  return result;
}

