/**
 * Committed rows aggregation for the Allocate plan stack.
 *
 * Grouping strategy:
 * - Expenses are grouped by ExpenseType (from getExpenseType on category name).
 * - Display name uses getExpenseTypeLabel (e.g. "Bills", "Subscriptions").
 * - Category rows are resolved via useCategories for name → type mapping only.
 *
 * Cycle amount formula:
 * - Each expense's monthly-equivalent amount is converted to the per-cycle amount
 *   using cycleCommittedAmount (consistent with frequencyNormalization.ts).
 *
 * Parity note:
 * - Sum(row.amount) still equals total monthly-equivalent converted per-cycle across
 *   all expenses; grouping is coarser than per-category transfer suggestions.
 */

import type { Expense, Category, PayCycleConfig } from '@/types/domain';
import { normalizeToMonthly } from './frequencyNormalization';
import { cycleCommittedAmount } from './payCycles';
import { getExpenseType, getExpenseTypeLabel } from '@/features/budget/utils/expenseTypeMapping';
import type { ExpenseType } from '@/features/budget/utils/expenseTypeMapping';

export interface CommittedRow {
  /** ExpenseType string — stable React key */
  rowKey: string;
  displayName: string;
  /** e.g. "3 expenses · fortnightly" */
  metaLine: string;
  /** Per-cycle amount in dollars */
  amount: number;
  /** True when the row has $0 expenses this cycle (display as muted zero) */
  isMutedZero: boolean;
  /** CSS icon class suffix, e.g. "utilities" → "commitment-icon-utilities" */
  iconSlug: string;
}

function expenseTypeToIconSlug(type: ExpenseType): string {
  const map: Record<ExpenseType, string> = {
    bills: 'utilities',
    repayments: 'repayments',
    savings: 'savings',
    subscriptions: 'subscriptions',
    living: 'transport',
    lifestyle: 'default',
    health: 'health',
    other: 'default',
  };
  return map[type] ?? 'default';
}

/**
 * Build the metaLine string: "{n} expense(s) · {frequency}"
 */
function buildMetaLine(count: number, frequency: PayCycleConfig['frequency']): string {
  const countLabel = count === 1 ? '1 expense' : `${count} expenses`;
  const freqLabel = frequency === 'weekly' ? 'weekly' : frequency === 'fortnightly' ? 'fortnightly' : 'monthly';
  return `${countLabel} · ${freqLabel}`;
}

/**
 * Aggregate expenses into committed rows for the Allocate plan stack.
 *
 * @param expenses  All recurring expenses for the user
 * @param categories  All user categories (for name resolution)
 * @param payCycleFrequency  Active pay cycle frequency (for per-cycle conversion)
 */
export function buildCommittedRows(
  expenses: Expense[],
  categories: Category[],
  payCycleFrequency: PayCycleConfig['frequency']
): CommittedRow[] {
  const grouped = new Map<
    ExpenseType,
    { displayName: string; amount: number; count: number; iconSlug: string }
  >();

  const categoryById = new Map(categories.map((c) => [c.id, c]));

  for (const expense of expenses) {
    const category = categoryById.get(expense.categoryId);
    const categoryName = category?.name ?? '';
    const expenseType = getExpenseType(categoryName);
    const monthlyAmount = normalizeToMonthly(expense.amount, expense.frequency);
    const cycleAmount = cycleCommittedAmount(monthlyAmount, payCycleFrequency);

    const existing = grouped.get(expenseType);
    if (existing) {
      grouped.set(expenseType, {
        ...existing,
        amount: existing.amount + cycleAmount,
        count: existing.count + 1,
      });
    } else {
      grouped.set(expenseType, {
        displayName: getExpenseTypeLabel(expenseType),
        amount: cycleAmount,
        count: 1,
        iconSlug: expenseTypeToIconSlug(expenseType),
      });
    }
  }

  const rows: CommittedRow[] = Array.from(grouped.entries())
    .map(([rowKey, data]): CommittedRow => ({
      rowKey,
      displayName: data.displayName,
      metaLine: buildMetaLine(data.count, payCycleFrequency),
      amount: Math.round(data.amount * 100) / 100,
      isMutedZero: data.amount === 0,
      iconSlug: data.iconSlug,
    }))
    .sort((a, b) => {
      if (a.rowKey === 'repayments') return -1;
      if (b.rowKey === 'repayments') return 1;
      return b.amount - a.amount;
    });

  return rows;
}

/**
 * Sum all committed row amounts (for income − committed = surplus calculation).
 */
export function sumCommittedRows(rows: CommittedRow[]): number {
  return rows.reduce((sum, r) => sum + r.amount, 0);
}
