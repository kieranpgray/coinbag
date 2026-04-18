/**
 * Upcoming transfers derivation for the Allocate screen.
 *
 * Groups recurring expenses by paidFromAccountId (the account that pays them)
 * and shows one row per account with per-cycle amounts.
 *
 * Urgency logic:
 * - daysUntil >= 0 && daysUntil <= 3 && !isDone → amber (due soon)
 * - cycleState === 'past' → grey / done
 * - Otherwise → green (scheduled)
 *
 * categoryMeta is urgency suffix only (empty for green/past; "due in N day(s)" for amber).
 *
 * The guard `daysUntil >= 0` prevents false-positive amber on past dates where
 * differenceInCalendarDays would return a negative value.
 */

import { differenceInCalendarDays, format } from 'date-fns';
import type { Expense, Account, PayCycleConfig } from '@/types/domain';
import { normalizeToMonthly } from './frequencyNormalization';
import { cycleCommittedAmount, type CycleState } from './payCycles';

export interface UpcomingTransferRow {
  /** accountId — stable React key */
  id: string;
  /** Account display name, e.g. "Joint Account" */
  name: string;
  /** Formatted pay date, e.g. "Fri 25 Apr" */
  dateLabel: string;
  /**
   * Urgency suffix only.
   * Amber: "due in N day(s)" | Green/past: "" (empty string)
   * Rendered as: dateLabel + (categoryMeta ? ' · ' + categoryMeta : '')
   */
  categoryMeta: string;
  amount: number;
  dotVariant: 'green' | 'amber' | 'grey';
  isDone: boolean;
  iconVariant: 'arrow' | 'warning' | 'check';
}

/**
 * Derive upcoming transfer rows from expenses grouped by paid-from account.
 *
 * @param expenses  All recurring expenses for the user
 * @param accounts  All accounts (for name resolution)
 * @param payCycleFrequency  Active pay cycle frequency (for per-cycle conversion)
 * @param cyclePayDate   The pay date for the selected cycle
 * @param cycleState     'active' | 'upcoming' | 'past'
 */
export function buildUpcomingTransfers(
  expenses: Expense[],
  accounts: Account[],
  payCycleFrequency: PayCycleConfig['frequency'],
  cyclePayDate: Date,
  cycleState: CycleState
): UpcomingTransferRow[] {
  const accountById = new Map(accounts.map((a) => [a.id, a]));
  const isDone = cycleState === 'past';
  const daysUntil = differenceInCalendarDays(cyclePayDate, new Date());
  const isAmber = !isDone && daysUntil >= 0 && daysUntil <= 3;
  const dateLabel = format(cyclePayDate, 'EEE d MMM');
  const dayWord = daysUntil === 1 ? 'day' : 'days';
  const categoryMeta = isAmber ? `due in ${daysUntil} ${dayWord}` : '';

  const grouped = new Map<string, { accountName: string; amount: number }>();

  for (const expense of expenses) {
    if (!expense.paidFromAccountId) continue;
    const account = accountById.get(expense.paidFromAccountId);
    if (!account) continue;

    const cycleAmt = cycleCommittedAmount(
      normalizeToMonthly(expense.amount, expense.frequency),
      payCycleFrequency
    );
    const existing = grouped.get(expense.paidFromAccountId);
    if (existing) {
      grouped.set(expense.paidFromAccountId, {
        ...existing,
        amount: existing.amount + cycleAmt,
      });
    } else {
      grouped.set(expense.paidFromAccountId, {
        accountName: account.accountName,
        amount: cycleAmt,
      });
    }
  }

  return Array.from(grouped.entries())
    .filter(([, data]) => data.amount > 0)
    .map(([accountId, data]): UpcomingTransferRow => {
      const dotVariant: UpcomingTransferRow['dotVariant'] = isDone ? 'grey' : isAmber ? 'amber' : 'green';
      const iconVariant: UpcomingTransferRow['iconVariant'] = isDone ? 'check' : isAmber ? 'warning' : 'arrow';

      return {
        id: accountId,
        name: data.accountName,
        dateLabel,
        categoryMeta,
        amount: Math.round(data.amount * 100) / 100,
        dotVariant,
        isDone,
        iconVariant,
      };
    });
}
