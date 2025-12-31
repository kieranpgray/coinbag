/**
 * Frequency conversion utilities
 * Converts amounts between different time frequencies
 */

export type Frequency = 'weekly' | 'fortnightly' | 'monthly' | 'quarterly' | 'annually';

/**
 * Domain frequency types that may differ from Frequency type
 * SubscriptionFrequency and Income frequency use 'yearly' instead of 'annually'
 */
type DomainFrequency = 'weekly' | 'fortnightly' | 'monthly' | 'quarterly' | 'yearly' | Frequency;

/**
 * Normalize domain frequency to Frequency type
 * Maps 'yearly' to 'annually' and validates the frequency
 * @param frequency - Domain frequency (may be 'yearly' or other valid frequency)
 * @returns Valid Frequency type, defaults to 'monthly' if invalid
 */
export function normalizeToFrequency(frequency: DomainFrequency | string): Frequency {
  // Map 'yearly' to 'annually'
  if (frequency === 'yearly') {
    return 'annually';
  }
  
  // Validate that it's a valid Frequency type
  const validFrequencies: Frequency[] = ['weekly', 'fortnightly', 'monthly', 'quarterly', 'annually'];
  if (validFrequencies.includes(frequency as Frequency)) {
    return frequency as Frequency;
  }
  
  // Default fallback for invalid frequencies
  if (import.meta.env.MODE === 'development') {
    console.warn(`Invalid frequency "${frequency}", defaulting to "monthly"`);
  }
  return 'monthly';
}

/**
 * Frequency options for Select components
 */
export const FREQUENCY_OPTIONS: Array<{ value: Frequency; label: string }> = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'fortnightly', label: 'Fortnightly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'annually', label: 'Annually' },
];

/**
 * Conversion multipliers from source frequency to target frequency
 * These represent how many units of the target frequency fit in one unit of the source frequency
 */
const CONVERSION_MULTIPLIERS: Record<Frequency, Record<Frequency, number>> = {
  weekly: {
    weekly: 1,
    fortnightly: 2,
    monthly: 52 / 12, // ~4.33
    quarterly: 52 / 4, // 13
    annually: 52,
  },
  fortnightly: {
    weekly: 1 / 2,
    fortnightly: 1,
    monthly: 26 / 12, // ~2.167
    quarterly: 26 / 4, // 6.5
    annually: 26,
  },
  monthly: {
    weekly: 12 / 52, // ~0.231
    fortnightly: 12 / 26, // ~0.462
    monthly: 1,
    quarterly: 3,
    annually: 12,
  },
  quarterly: {
    weekly: 4 / 52, // ~0.077
    fortnightly: 4 / 26, // ~0.154
    monthly: 1 / 3, // ~0.333
    quarterly: 1,
    annually: 4,
  },
  annually: {
    weekly: 1 / 52, // ~0.019
    fortnightly: 1 / 26, // ~0.038
    monthly: 1 / 12, // ~0.083
    quarterly: 1 / 4, // 0.25
    annually: 1,
  },
};

/**
 * Convert an amount from one frequency to another
 * @param amount - The amount to convert
 * @param fromFrequency - The source frequency (will be normalized if needed)
 * @param toFrequency - The target frequency (will be normalized if needed)
 * @returns The converted amount, or original amount if frequencies are invalid
 */
export function convertToFrequency(
  amount: number,
  fromFrequency: Frequency | DomainFrequency | string,
  toFrequency: Frequency | DomainFrequency | string
): number {
  // Normalize frequencies to handle 'yearly' -> 'annually' conversion
  const normalizedFrom = normalizeToFrequency(fromFrequency);
  const normalizedTo = normalizeToFrequency(toFrequency);
  
  if (normalizedFrom === normalizedTo) {
    return amount;
  }

  // Defensive check: ensure both frequencies exist in CONVERSION_MULTIPLIERS
  if (!CONVERSION_MULTIPLIERS[normalizedFrom] || !CONVERSION_MULTIPLIERS[normalizedFrom][normalizedTo]) {
    if (import.meta.env.MODE === 'development') {
      console.warn(
        `Cannot convert from "${normalizedFrom}" to "${normalizedTo}". Missing conversion multiplier. Returning original amount.`
      );
    }
    return amount;
  }

  const multiplier = CONVERSION_MULTIPLIERS[normalizedFrom][normalizedTo];
  return amount * multiplier;
}

/**
 * Get the display label for a frequency (capitalized, for dropdowns)
 */
export function getFrequencyLabel(frequency: Frequency): string {
  return FREQUENCY_OPTIONS.find((opt) => opt.value === frequency)?.label || frequency;
}

/**
 * Get the display label for "per {frequency}" context (lowercase, singular)
 * Used in phrases like "per week", "per month", "per year"
 */
export function getFrequencyLabelForDisplay(frequency: Frequency): string {
  const labels: Record<Frequency, string> = {
    weekly: 'week',
    fortnightly: 'fortnight',
    monthly: 'month',
    quarterly: 'quarter',
    annually: 'year',
  };
  return labels[frequency] || frequency;
}

