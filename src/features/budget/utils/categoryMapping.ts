/**
 * Category mapping utilities
 * Maps expense types to category names for auto-selection
 */

import type { ExpenseType } from './expenseTypeMapping';
import type { Category } from '@/types/domain';

/**
 * Preferred category names for each expense type
 * Ordered by preference (first match wins)
 */
const EXPENSE_TYPE_CATEGORY_PREFERENCES: Record<ExpenseType, string[]> = {
  subscriptions: [
    'Streaming',
    'Entertainment',
    'Software',
    'Cloud Storage',
    'Gym Membership',
    'News & Media',
  ],
  bills: [
    'Utilities',
    'Electricity',
    'Gas',
    'Water',
    'Internet',
    'Phone',
    'Insurance',
    'Rent',
    'Mortgage',
  ],
  repayments: [
    'Credit Card',
    'Student Loan',
    'Personal Loan',
    'Car Loan',
    'Home Loan',
  ],
  savings: [
    'Savings',
    'Emergency Fund',
    'Investment',
  ],
  living: [
    'Groceries',
    'Food',
    'Transportation',
    'Public Transport',
    'Fuel',
    'Health',
    'Medical',
    'Pharmacy',
    'Education',
  ],
  lifestyle: [
    'Dining Out',
    'Coffee',
    'Shopping',
    'Clothing',
    'Hobbies',
    'Travel',
    'Entertainment',
  ],
};

/**
 * Find a category ID for a given expense type
 * Returns the first matching category from preferences, or undefined if none found
 */
export function findCategoryIdByExpenseType(
  expenseType: ExpenseType,
  categories: Category[]
): string | undefined {
  const preferences = EXPENSE_TYPE_CATEGORY_PREFERENCES[expenseType];
  
  // Try to find a category matching the preferences (in order)
  for (const preferredName of preferences) {
    const category = categories.find(
      (c) => c.name.toLowerCase() === preferredName.toLowerCase()
    );
    if (category) {
      return category.id;
    }
  }
  
  // If no preference match, return undefined (form will use default)
  return undefined;
}

/**
 * Get all category names that map to a given expense type
 */
export function getCategoryNamesForExpenseType(expenseType: ExpenseType): string[] {
  return EXPENSE_TYPE_CATEGORY_PREFERENCES[expenseType] || [];
}

