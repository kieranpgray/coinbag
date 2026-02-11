import type { ExpenseFrequency } from '@/types/domain';

/**
 * Frequency normalization utilities
 * Converts amounts between different frequency periods for transfer calculations
 */

const CYCLES_PER_MONTH = {
  weekly: 4.33,      // 52 weeks / 12 months
  fortnightly: 2.17, // 26 fortnights / 12 months
  monthly: 1,
  quarterly: 0.333,  // 4 quarters / 12 months (1/3)
  yearly: 0.0833,    // 1 year / 12 months (1/12)
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
 * @returns Formatted string like "$566/week" or "$1,129/fortnight"
 */
export function formatAmountByFrequency(
  monthlyAmount: number,
  frequency: 'weekly' | 'fortnightly' | 'monthly'
): string {
  const amount = convertFromMonthly(monthlyAmount, frequency);
  const period = frequency === 'weekly' ? 'week' : frequency === 'fortnightly' ? 'fortnight' : 'month';
  return `$${amount.toFixed(0)}/${period}`;
}
