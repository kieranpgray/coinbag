import type { ExpenseFrequency } from '@/types/domain';
import { formatNumber } from '@/lib/utils';

/**
 * Frequency normalization utilities
 * Converts amounts between different frequency periods for transfer calculations
 */

const CYCLES_PER_MONTH = {
  weekly: 52 / 12,     // 52 weeks per year ÷ 12 months = 4.333...
  fortnightly: 26 / 12, // 26 fortnights per year ÷ 12 months = 2.166...
  monthly: 1,
  quarterly: 1 / 3,    // 4 quarters per year ÷ 12 months = 0.333...
  yearly: 1 / 12,      // 1 year ÷ 12 months = 0.0833...
} as const;

/**
 * Normalize an amount to monthly equivalent based on frequency
 * @param amount - The amount in the given frequency
 * @param frequency - The frequency of the amount
 * @returns Monthly equivalent amount
 */
export function normalizeToMonthly(amount: number, frequency: ExpenseFrequency): number {
  return amount * CYCLES_PER_MONTH[frequency];
}

/**
 * Convert a monthly amount to a target frequency
 * @param monthlyAmount - The amount per month
 * @param targetFrequency - The target frequency to convert to
 * @returns Amount in the target frequency
 */
export function convertFromMonthly(
  monthlyAmount: number,
  targetFrequency: 'weekly' | 'fortnightly' | 'monthly'
): number {
  if (targetFrequency === 'monthly') return monthlyAmount;
  if (targetFrequency === 'weekly') return monthlyAmount / CYCLES_PER_MONTH.weekly;
  return monthlyAmount / CYCLES_PER_MONTH.fortnightly;
}

/**
 * Format an amount with frequency label for display
 * @param monthlyAmount - The amount per month
 * @param frequency - The frequency to display
 * @param locale - Locale code for formatting (defaults to 'en-US')
 * @returns Formatted string like "$566/week" or "$1,129/fortnight"
 */
export function formatAmountByFrequency(
  monthlyAmount: number,
  frequency: 'weekly' | 'fortnightly' | 'monthly',
  locale: string = 'en-US'
): string {
  const amount = convertFromMonthly(monthlyAmount, frequency);
  const period = frequency === 'weekly' ? 'week' : frequency === 'fortnightly' ? 'fortnight' : 'month';
  const formattedAmount = formatNumber(amount, locale, { maximumFractionDigits: 0 });
  return `$${formattedAmount}/${period}`;
}
