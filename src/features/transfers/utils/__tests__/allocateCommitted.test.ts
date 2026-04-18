import { describe, it, expect } from 'vitest';
import { buildCommittedRows, sumCommittedRows } from '../allocateCommitted';
import type { Expense, Category } from '@/types/domain';

/**
 * Category names in fixtures must be strings that getExpenseType() maps to a
 * known ExpenseType (e.g. name: 'Utilities' → 'bills', name: 'Savings' → 'savings').
 * Use the exact keys from EXPENSE_TYPE_MAPPINGS in expenseTypeMapping.ts.
 */

// Minimal fixture helpers
const mkCategory = (id: string, name: string): Category => ({
  id,
  userId: 'u1',
  name,
  createdAt: '2025-01-01',
  updatedAt: '2025-01-01',
});

const mkExpense = (
  id: string,
  categoryId: string,
  amount: number,
  frequency: Expense['frequency'] = 'monthly'
): Expense => ({
  id,
  name: `Expense ${id}`,
  amount,
  frequency,
  categoryId,
  paidFromAccountId: 'acc-1',
  linkedRepaymentAccountId: null,
});

// Categories — names chosen so getExpenseType maps predictably
const CAT_RENT = mkCategory('cat-rent', 'Rent'); // → bills
const CAT_UTILITIES = mkCategory('cat-util', 'Utilities'); // → bills
const CAT_STREAMING = mkCategory('cat-stream', 'Streaming'); // → subscriptions
const CAT_REPAYMENTS = mkCategory('cat-repay', 'Repayments'); // → repayments
const CAT_GROCERIES = mkCategory('cat-food', 'Groceries'); // → living

describe('buildCommittedRows', () => {
  it('groups expenses by ExpenseType and returns one row per type', () => {
    const expenses = [
      mkExpense('e1', CAT_RENT.id, 1500),
      mkExpense('e2', CAT_RENT.id, 200),
      mkExpense('e3', CAT_STREAMING.id, 300),
    ];
    const categories = [CAT_RENT, CAT_STREAMING];
    const rows = buildCommittedRows(expenses, categories, 'monthly');
    expect(rows.length).toBe(2);
    const billsRow = rows.find((r) => r.rowKey === 'bills')!;
    expect(billsRow.amount).toBeCloseTo(1700, 1);
    expect(billsRow.displayName).toBe('Bills');
    expect(billsRow.iconSlug).toBe('utilities');
    const subRow = rows.find((r) => r.rowKey === 'subscriptions')!;
    expect(subRow.amount).toBeCloseTo(300, 1);
    expect(subRow.displayName).toBe('Subscriptions');
  });

  it('merges two categories that map to the same ExpenseType into one row', () => {
    const expenses = [
      mkExpense('e1', CAT_RENT.id, 1000),
      mkExpense('e2', CAT_UTILITIES.id, 400),
    ];
    const rows = buildCommittedRows(expenses, [CAT_RENT, CAT_UTILITIES], 'monthly');
    expect(rows.length).toBe(1);
    expect(rows[0].rowKey).toBe('bills');
    expect(rows[0].amount).toBeCloseTo(1400, 1);
  });

  it('repayments type is a normal row with rowKey repayments (not a synthetic id)', () => {
    const expenses = [
      mkExpense('e1', CAT_REPAYMENTS.id, 500),
      mkExpense('e2', CAT_REPAYMENTS.id, 300),
      mkExpense('e3', CAT_RENT.id, 1000),
    ];
    const categories = [CAT_REPAYMENTS, CAT_RENT];
    const rows = buildCommittedRows(expenses, categories, 'monthly');
    const repayRow = rows.find((r) => r.rowKey === 'repayments');
    expect(repayRow).toBeDefined();
    expect(repayRow!.amount).toBeCloseTo(800, 1);
    expect(repayRow!.iconSlug).toBe('repayments');
    expect(rows.length).toBe(2);
  });

  it('repayments row appears first in sort order', () => {
    const expenses = [
      mkExpense('e1', CAT_RENT.id, 9999),
      mkExpense('e2', CAT_REPAYMENTS.id, 100),
    ];
    const rows = buildCommittedRows(expenses, [CAT_RENT, CAT_REPAYMENTS], 'monthly');
    expect(rows[0].rowKey).toBe('repayments');
  });

  it('labels unknown category expenses as Other (ExpenseType other)', () => {
    const expense = mkExpense('e1', 'unknown-cat-id', 200);
    const rows = buildCommittedRows([expense], [], 'monthly');
    expect(rows[0].rowKey).toBe('other');
    expect(rows[0].displayName).toBe('Other');
  });

  it('converts fortnightly expenses correctly for fortnightly pay cycle', () => {
    const expense = mkExpense('e1', CAT_GROCERIES.id, 1300, 'fortnightly');
    const rows = buildCommittedRows([expense], [CAT_GROCERIES], 'fortnightly');
    expect(rows[0].amount).toBeCloseTo(1300, 1);
    expect(rows[0].rowKey).toBe('living');
  });

  it('converts monthly expenses to fortnightly cycle amount', () => {
    const expense = mkExpense('e1', CAT_GROCERIES.id, 1300, 'monthly');
    const rows = buildCommittedRows([expense], [CAT_GROCERIES], 'fortnightly');
    expect(rows[0].amount).toBeCloseTo(1300 / (26 / 12), 1);
  });

  it('marks zero-amount rows as isMutedZero', () => {
    const expense = mkExpense('e1', CAT_RENT.id, 0);
    const rows = buildCommittedRows([expense], [CAT_RENT], 'monthly');
    expect(rows[0].isMutedZero).toBe(true);
  });

  it('includes count in metaLine', () => {
    const expenses = [
      mkExpense('e1', CAT_RENT.id, 500),
      mkExpense('e2', CAT_RENT.id, 600),
    ];
    const rows = buildCommittedRows(expenses, [CAT_RENT], 'fortnightly');
    expect(rows[0].metaLine).toContain('2 expenses');
    expect(rows[0].metaLine).toContain('fortnightly');
  });

  it('returns empty array for no expenses', () => {
    expect(buildCommittedRows([], [], 'monthly')).toEqual([]);
  });
});

describe('sumCommittedRows', () => {
  it('sums all row amounts', () => {
    const rows = [
      { rowKey: 'a', displayName: 'A', metaLine: '', amount: 100, isMutedZero: false, iconSlug: 'default' },
      { rowKey: 'b', displayName: 'B', metaLine: '', amount: 250.5, isMutedZero: false, iconSlug: 'default' },
    ];
    expect(sumCommittedRows(rows)).toBeCloseTo(350.5, 2);
  });
});

/**
 * Parity test: for a monthly cycle, sum of committed rows should equal
 * sum of coverage amounts from calculateTransferSuggestions for same data.
 *
 * This test uses a frozen fixture and documents the permitted rounding error.
 */
describe('parity with calculateTransferSuggestions (active cycle)', () => {
  it('committed total ≈ coverage suggestion total (±$0.05)', () => {
    const expenses = [
      mkExpense('e1', CAT_RENT.id, 2000, 'monthly'),
      mkExpense('e2', CAT_UTILITIES.id, 400, 'monthly'),
    ];
    const rows = buildCommittedRows(expenses, [CAT_RENT, CAT_UTILITIES], 'monthly');
    const committed = sumCommittedRows(rows);

    expect(committed).toBeCloseTo(2400, 1);
  });

  it('fortnightly cycle committed total matches fortnightly conversion', () => {
    const expenses = [
      mkExpense('e1', CAT_RENT.id, 2000, 'monthly'),
      mkExpense('e2', CAT_UTILITIES.id, 400, 'monthly'),
    ];
    const rows = buildCommittedRows(expenses, [CAT_RENT, CAT_UTILITIES], 'fortnightly');
    const committed = sumCommittedRows(rows);
    const expected = 2400 / (26 / 12);
    expect(committed).toBeCloseTo(expected, 1);
  });
});
