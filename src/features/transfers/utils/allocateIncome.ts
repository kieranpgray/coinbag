/**
 * Income helpers for the Allocate plan stack.
 *
 * Primary income:
 *   - The income entry whose paidToAccountId matches payCycle.primaryIncomeAccountId.
 *   - Amount displayed is per-cycle (using cycleIncomeAmount from payCycles.ts).
 *
 * Secondary incomes:
 *   - All other income entries.
 *   - Rendered as .income-card-secondary links to the Budget page.
 *
 * Source line format: "[Name] · [Account] · [Frequency]"
 * The third token is each income row's own frequency (not the pay cycle cadence).
 */

import type { Income, Account, PayCycleConfig } from '@/types/domain';
import { normalizeToMonthly } from './frequencyNormalization';
import { cycleIncomeAmount } from './payCycles';
import { formatCurrency } from '@/lib/utils';

export interface PrimaryIncomeInfo {
  /** Per-cycle amount to display in the income card */
  cycleAmount: number;
  /** Display name of the income source */
  name: string;
  /** Source line: "Name · Account · Frequency" */
  sourceLine: string;
  /** Whether data is available (false = no matching income entry) */
  found: boolean;
}

export interface SecondaryIncomeLink {
  id: string;
  /** Link text shown on the income card */
  label: string;
  /** Monthly-normalised amount (for tooltip / context) */
  monthlyAmount: number;
}

/** Display label for an income source's billing frequency. */
export function incomeFrequencyLabel(frequency: Income['frequency']): string {
  switch (frequency) {
    case 'weekly':
      return 'Weekly';
    case 'fortnightly':
      return 'Fortnightly';
    case 'monthly':
      return 'Monthly';
    case 'yearly':
      return 'Yearly';
    default:
      return 'Monthly';
  }
}

/**
 * Resolve the primary income entry and compute its per-cycle amount.
 */
export function getPrimaryIncomeInfo(
  incomes: Income[],
  accounts: Account[],
  payCycle: PayCycleConfig
): PrimaryIncomeInfo {
  const primary = incomes.find(
    (i) => i.paidToAccountId === payCycle.primaryIncomeAccountId
  );

  if (!primary) {
    return { cycleAmount: 0, name: 'Income', sourceLine: '', found: false };
  }

  const monthlyAmount = normalizeToMonthly(primary.amount, primary.frequency);
  const cycleAmount = cycleIncomeAmount(monthlyAmount, payCycle.frequency);

  const account = accounts.find((a) => a.id === primary.paidToAccountId);
  const accountLabel = account?.accountName ?? 'Primary account';
  const freqLabel = incomeFrequencyLabel(primary.frequency);
  const sourceLine = `${primary.name} · ${accountLabel} · ${freqLabel}`;

  return { cycleAmount, name: primary.name, sourceLine, found: true };
}

/**
 * Resolve all secondary income entries (not the primary account).
 */
export function getSecondaryIncomeLinks(
  incomes: Income[],
  accounts: Account[],
  payCycle: PayCycleConfig,
  locale: string
): SecondaryIncomeLink[] {
  return incomes
    .filter((i) => i.paidToAccountId !== payCycle.primaryIncomeAccountId)
    .map((income) => {
      const account = accounts.find((a) => a.id === income.paidToAccountId);
      const accountLabel = account?.accountName ?? 'Other account';
      const freqLabel = incomeFrequencyLabel(income.frequency);
      const monthlyAmount = normalizeToMonthly(income.amount, income.frequency);
      const cycleAmount = cycleIncomeAmount(monthlyAmount, payCycle.frequency);
      const amountStr = formatCurrency(cycleAmount, locale, { maximumFractionDigits: 0 });
      return {
        id: income.id,
        label: `${income.name} · ${accountLabel} · ${freqLabel} · ${amountStr}`,
        monthlyAmount,
      };
    });
}
