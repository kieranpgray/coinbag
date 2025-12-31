/**
 * Expense filtering and grouping utilities
 * Filters subscriptions by expense type and groups by category
 */

import type { Subscription } from '@/types/domain';
import { getExpenseType, type ExpenseType } from './expenseTypeMapping';
import { getCategoryNameSafe } from './categoryHelpers';

/**
 * Filter subscriptions by expense type
 * @param subscriptions - Array of subscriptions to filter
 * @param type - The expense type to filter by ('all' returns all subscriptions)
 * @param categoryMap - Map of category IDs to category names
 * @param uncategorisedId - Optional ID of "Uncategorised" category for fallback
 */
export function filterByExpenseType(
  subscriptions: Subscription[],
  type: ExpenseType | 'all',
  categoryMap: Map<string, string>,
  uncategorisedId?: string
): Subscription[] {
  if (type === 'all') {
    return subscriptions;
  }
  
  return subscriptions.filter((subscription) => {
    // Use safe lookup - deprecated categories will be treated as "Uncategorised"
    const categoryName = getCategoryNameSafe(subscription.categoryId, categoryMap, uncategorisedId);
    const expenseType = getExpenseType(categoryName);
    return expenseType === type;
  });
}

/**
 * Group subscriptions by category
 * @param subscriptions - Array of subscriptions to group
 * @param categoryMap - Map of category IDs to category names
 * @param uncategorisedId - Optional ID of "Uncategorised" category for fallback
 * @returns Record mapping category names to arrays of subscriptions
 */
export function groupByCategory(
  subscriptions: Subscription[],
  categoryMap: Map<string, string>,
  uncategorisedId?: string
): Record<string, Subscription[]> {
  return subscriptions.reduce((acc, subscription) => {
    // Use safe lookup - deprecated categories will be grouped under "Uncategorised"
    const categoryName = getCategoryNameSafe(subscription.categoryId, categoryMap, uncategorisedId);
    
    if (!acc[categoryName]) {
      acc[categoryName] = [];
    }
    
    acc[categoryName].push(subscription);
    return acc;
  }, {} as Record<string, Subscription[]>);
}

/**
 * Calculate total amount for a group of subscriptions
 */
export function calculateGroupTotal(subscriptions: Subscription[]): number {
  return subscriptions.reduce((sum, subscription) => {
    return sum + subscription.amount;
  }, 0);
}

