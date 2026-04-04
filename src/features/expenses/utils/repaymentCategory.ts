import type { Category } from '@/types/domain';
import { getExpenseType } from '@/features/budget/utils/expenseTypeMapping';

/**
 * Returns true when the category id maps to the "repayments" expense type.
 */
export function isRepaymentCategoryId(categoryId: string, categories: Category[]): boolean {
  const categoryName = categories.find((category) => category.id === categoryId)?.name;
  if (!categoryName) return false;
  return getExpenseType(categoryName) === 'repayments';
}

