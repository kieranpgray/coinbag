/**
 * Expense filtering and grouping utilities
 * Filters expenses by expense type and groups by category
 */

import type { Expense } from '@/types/domain';
import { getExpenseType, type ExpenseType } from './expenseTypeMapping';
import { getCategoryNameSafe } from './categoryHelpers';

/**
 * Filter expenses by expense type
 * @param expenses - Array of expenses to filter
 * @param type - The expense type to filter by ('all' returns all expenses)
 * @param categoryMap - Map of category IDs to category names
 * @param uncategorisedId - Optional ID of "Uncategorised" category for fallback
 */
export function filterByExpenseType(
  expenses: Expense[],
  type: ExpenseType | 'all',
  categoryMap: Map<string, string>,
  uncategorisedId?: string
): Expense[] {
  if (type === 'all') {
    return expenses;
  }
  
  return expenses.filter((expense) => {
    // Use safe lookup - deprecated categories will be treated as "Uncategorised"
    const categoryName = getCategoryNameSafe(expense.categoryId, categoryMap, uncategorisedId);
    const expenseType = getExpenseType(categoryName);
    return expenseType === type;
  });
}

/**
 * Group expenses by category
 * @param expenses - Array of expenses to group
 * @param categoryMap - Map of category IDs to category names
 * @param uncategorisedId - Optional ID of "Uncategorised" category for fallback
 * @returns Record mapping category names to arrays of expenses
 */
export function groupByCategory(
  expenses: Expense[],
  categoryMap: Map<string, string>,
  uncategorisedId?: string
): Record<string, Expense[]> {
  return expenses.reduce((acc, expense) => {
    // Use safe lookup - deprecated categories will be grouped under "Uncategorised"
    const categoryName = getCategoryNameSafe(expense.categoryId, categoryMap, uncategorisedId);
    
    if (!acc[categoryName]) {
      acc[categoryName] = [];
    }
    
    acc[categoryName].push(expense);
    return acc;
  }, {} as Record<string, Expense[]>);
}

/**
 * Calculate total amount for a group of expenses
 */
export function calculateGroupTotal(expenses: Expense[]): number {
  return expenses.reduce((sum, expense) => {
    return sum + expense.amount;
  }, 0);
}

// Backward compatibility exports
/** @deprecated Use Expense[] instead of Subscription[] */
export type Subscription = Expense;

