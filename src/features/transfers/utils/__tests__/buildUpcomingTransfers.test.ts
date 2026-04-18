import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { buildUpcomingTransfers } from '../buildUpcomingTransfers';
import type { Account, Expense, ExpenseFrequency } from '@/types/domain';

const mkExpense = (
  id: string,
  amount: number,
  frequency: ExpenseFrequency,
  paidFromAccountId: string | null
): Expense => ({
  id,
  name: 'Test',
  amount,
  frequency,
  categoryId: 'cat-1',
  paidFromAccountId,
  linkedRepaymentAccountId: null,
});

const mkAccount = (id: string, name: string): Account => ({
  id,
  accountName: name,
  balance: 0,
  accountType: 'Savings',
  lastUpdated: '',
  hidden: false,
});

const ACC_A = mkAccount('acc-a', 'Joint Account');
const ACC_B = mkAccount('acc-b', 'Offset Account');
const FUTURE_DATE = new Date(2099, 11, 25);
const PAST_DATE = new Date(2000, 0, 1);

describe('buildUpcomingTransfers', () => {
  describe('filtering', () => {
    it('filters out zero-amount account groups', () => {
      const expenses = [
        mkExpense('e1', 500, 'monthly', 'acc-a'),
        mkExpense('e2', 0, 'monthly', 'acc-b'),
      ];
      const result = buildUpcomingTransfers(expenses, [ACC_A, ACC_B], 'monthly', FUTURE_DATE, 'active');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('acc-a');
    });

    it('returns empty when all expenses lack paidFromAccountId', () => {
      const expenses = [mkExpense('e1', 500, 'monthly', null)];
      const result = buildUpcomingTransfers(expenses, [ACC_A], 'monthly', FUTURE_DATE, 'active');
      expect(result).toHaveLength(0);
    });

    it('excludes expense when paidFromAccountId not in accounts list', () => {
      const expenses = [mkExpense('e1', 500, 'monthly', 'missing-acc-id')];
      const result = buildUpcomingTransfers(expenses, [ACC_A], 'monthly', FUTURE_DATE, 'active');
      expect(result).toHaveLength(0);
    });
  });

  describe('account grouping', () => {
    it('uses account name as row.name', () => {
      const expenses = [mkExpense('e1', 500, 'monthly', 'acc-a')];
      const result = buildUpcomingTransfers(expenses, [ACC_A], 'monthly', FUTURE_DATE, 'active');
      expect(result[0].name).toBe('Joint Account');
    });

    it('sums multiple expenses to same account into one row', () => {
      const expenses = [
        mkExpense('e1', 300, 'monthly', 'acc-a'),
        mkExpense('e2', 200, 'monthly', 'acc-a'),
      ];
      const result = buildUpcomingTransfers(expenses, [ACC_A], 'monthly', FUTURE_DATE, 'active');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('acc-a');
      expect(result[0].amount).toBe(500);
    });

    it('produces separate rows per account', () => {
      const expenses = [
        mkExpense('e1', 100, 'monthly', 'acc-a'),
        mkExpense('e2', 200, 'monthly', 'acc-b'),
      ];
      const result = buildUpcomingTransfers(expenses, [ACC_A, ACC_B], 'monthly', FUTURE_DATE, 'active');
      expect(result).toHaveLength(2);
      const ids = result.map((r) => r.id).sort();
      expect(ids).toEqual(['acc-a', 'acc-b']);
    });
  });

  describe('past cycle → grey / done', () => {
    it('sets isDone=true and grey/check variant for past cycle state', () => {
      const expenses = [mkExpense('e1', 500, 'monthly', 'acc-a')];
      const result = buildUpcomingTransfers(expenses, [ACC_A], 'monthly', PAST_DATE, 'past');
      expect(result[0].isDone).toBe(true);
      expect(result[0].dotVariant).toBe('grey');
      expect(result[0].iconVariant).toBe('check');
    });

    it('sets empty categoryMeta for past cycles', () => {
      const expenses = [mkExpense('e1', 500, 'monthly', 'acc-a')];
      const result = buildUpcomingTransfers(expenses, [ACC_A], 'monthly', PAST_DATE, 'past');
      expect(result[0].categoryMeta).toBe('');
    });
  });

  describe('amber urgency (daysUntil 0–3)', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2025, 3, 22));
    });
    afterEach(() => {
      vi.useRealTimers();
    });

    it('sets amber/warning when pay date is 3 days away', () => {
      const payDate = new Date(2025, 3, 25);
      const expenses = [mkExpense('e1', 500, 'monthly', 'acc-a')];
      const result = buildUpcomingTransfers(expenses, [ACC_A], 'monthly', payDate, 'active');
      expect(result[0].dotVariant).toBe('amber');
      expect(result[0].iconVariant).toBe('warning');
      expect(result[0].categoryMeta).toContain('due in 3 days');
    });

    it('sets amber/warning when pay date is today (0 days)', () => {
      const payDate = new Date(2025, 3, 22);
      const expenses = [mkExpense('e1', 500, 'monthly', 'acc-a')];
      const result = buildUpcomingTransfers(expenses, [ACC_A], 'monthly', payDate, 'active');
      expect(result[0].dotVariant).toBe('amber');
      expect(result[0].iconVariant).toBe('warning');
    });

    it('uses singular "day" when daysUntil === 1', () => {
      const payDate = new Date(2025, 3, 23);
      const expenses = [mkExpense('e1', 500, 'monthly', 'acc-a')];
      const result = buildUpcomingTransfers(expenses, [ACC_A], 'monthly', payDate, 'active');
      expect(result[0].categoryMeta).toContain('due in 1 day');
      expect(result[0].categoryMeta).not.toContain('days');
    });

    it('does NOT set amber when daysUntil > 3', () => {
      const payDate = new Date(2025, 3, 27);
      const expenses = [mkExpense('e1', 500, 'monthly', 'acc-a')];
      const result = buildUpcomingTransfers(expenses, [ACC_A], 'monthly', payDate, 'active');
      expect(result[0].dotVariant).toBe('green');
      expect(result[0].categoryMeta).toBe('');
    });
  });

  describe('negative daysUntil guard (past date, non-past cycle state)', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2025, 3, 22));
    });
    afterEach(() => {
      vi.useRealTimers();
    });

    it('does NOT set amber for a date in the past when cycleState is not past', () => {
      const payDate = new Date(2025, 3, 19);
      const expenses = [mkExpense('e1', 500, 'monthly', 'acc-a')];
      const result = buildUpcomingTransfers(expenses, [ACC_A], 'monthly', payDate, 'active');
      expect(result[0].dotVariant).toBe('green');
      expect(result[0].categoryMeta).toBe('');
    });
  });

  describe('green state (upcoming, >3 days)', () => {
    it('sets green/arrow for active cycle with future pay date', () => {
      const expenses = [mkExpense('e1', 500, 'monthly', 'acc-a')];
      const result = buildUpcomingTransfers(expenses, [ACC_A], 'monthly', FUTURE_DATE, 'active');
      expect(result[0].isDone).toBe(false);
      expect(result[0].dotVariant).toBe('green');
      expect(result[0].iconVariant).toBe('arrow');
      expect(result[0].categoryMeta).toBe('');
    });

    it('sets green/arrow for upcoming cycle', () => {
      const expenses = [mkExpense('e1', 500, 'monthly', 'acc-a')];
      const result = buildUpcomingTransfers(expenses, [ACC_A], 'monthly', FUTURE_DATE, 'upcoming');
      expect(result[0].dotVariant).toBe('green');
    });
  });

  describe('output shape', () => {
    it('maps row fields to UpcomingTransferRow correctly', () => {
      const expenses = [mkExpense('e1', 500, 'monthly', 'acc-b')];
      const result = buildUpcomingTransfers(expenses, [ACC_B], 'monthly', FUTURE_DATE, 'active');
      expect(result[0].id).toBe('acc-b');
      expect(result[0].name).toBe('Offset Account');
      expect(result[0].amount).toBe(500);
      expect(result[0].dateLabel).toBeTruthy();
    });
  });
});
