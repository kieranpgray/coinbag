import type {
  SubscriptionFrequency,
  Subscription,
} from '@/types/domain';

/**
 * Validation functions
 */
export function isValidCurrencyAmount(amount: number): boolean {
  // Treat 0 as invalid for subscription amounts (subscriptions must be > 0)
  return typeof amount === 'number' && amount > 0 && amount <= 1_000_000 && !isNaN(amount);
}

export function isValidISODateString(date: string): boolean {
  const dateObj = new Date(date);
  return dateObj instanceof Date && !isNaN(dateObj.getTime()) && date === dateObj.toISOString().split('T')[0];
}

export function isValidSubscriptionId(id: string): boolean {
  return typeof id === 'string' && id.length > 0;
}

/**
 * Business logic validation
 */
export function validateSubscriptionDates(chargeDate: string, nextDueDate: string): boolean {
  try {
    const charge = new Date(chargeDate);
    const nextDue = new Date(nextDueDate);

    // Check if dates are valid
    if (isNaN(charge.getTime()) || isNaN(nextDue.getTime())) {
      return false;
    }

    // Next due date must be after or equal to charge date
    if (nextDue < charge) {
      return false;
    }

    return true;
  } catch (error) {
    return false;
  }
}

export function validateSubscriptionAmount(amount: number, frequency: SubscriptionFrequency): boolean {
  // Check if amount is a valid positive number
  if (!isValidCurrencyAmount(amount) || amount <= 0) {
    return false;
  }

  const minAmounts: Record<SubscriptionFrequency, number> = {
    weekly: 1,
    fortnightly: 1,
    monthly: 1,
    yearly: 1,
  };

  const maxAmounts: Record<SubscriptionFrequency, number> = {
    weekly: 2000,
    fortnightly: 4000,
    monthly: 10000,
    yearly: 50000,
  };

  return amount >= minAmounts[frequency] && amount <= maxAmounts[frequency];
}

/**
 * Validate complete subscription data integrity
 */
export function validateSubscriptionIntegrity(subscription: {
  name: string;
  amount: number;
  frequency: SubscriptionFrequency;
  chargeDate: string;
  nextDueDate: string;
  categoryId: string;
}): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Name validation
  if (!subscription.name?.trim()) {
    errors.push('Name is required');
  } else if (subscription.name.trim().length < 2) {
    errors.push('Name must be at least 2 characters long');
  } else if (subscription.name.trim().length > 100) {
    errors.push('Name must be less than 100 characters');
  }

  // Amount validation
  if (!validateSubscriptionAmount(subscription.amount, subscription.frequency)) {
    const ranges = {
      weekly: '$1-2000',
      fortnightly: '$1-4000',
      monthly: '$1-10,000',
      yearly: '$1-50,000',
    };
    errors.push(`Amount must be between ${ranges[subscription.frequency]} for ${subscription.frequency} frequency`);
  }

  // Date validation
  if (!validateSubscriptionDates(subscription.chargeDate, subscription.nextDueDate)) {
    errors.push('Invalid date configuration. Next due date must be after charge date and within reasonable ranges.');
  }

  // Category validation
  if (!subscription.categoryId || subscription.categoryId.trim().length === 0) {
    errors.push('Category is required');
  } else if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(subscription.categoryId)) {
    errors.push('Invalid category selected');
  }

  // Business rule: Check if next due date aligns with frequency
  try {
    const calculatedNextDue = calculateNextDueDate(subscription.chargeDate, subscription.frequency);
    const actualNextDue = new Date(subscription.nextDueDate);
    const calculatedDate = new Date(calculatedNextDue);

    // Allow for small discrepancies (e.g., manual adjustments)
    const diffTime = Math.abs(actualNextDue.getTime() - calculatedDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays > 7) { // More than a week difference might indicate an error
      errors.push('Next due date seems inconsistent with the selected frequency. Consider using auto-calculation.');
    }
  } catch (error) {
    errors.push('Unable to validate date consistency');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Calculation utilities
 */
export function calculateNextDueDate(
  chargeDate: string,
  frequency: SubscriptionFrequency
): string {
  const date = new Date(chargeDate);
  const originalDay = date.getDate();

  const clampDayInMonth = (d: Date, day: number) => {
    const year = d.getFullYear();
    const month = d.getMonth();
    const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
    d.setDate(Math.min(day, lastDayOfMonth));
  };

  switch (frequency) {
    case 'weekly':
      date.setDate(date.getDate() + 7);
      break;
    case 'fortnightly':
      date.setDate(date.getDate() + 14);
      break;
    case 'monthly':
      // Add month and clamp day (e.g. Jan 31 -> Feb 29 in leap years)
      date.setMonth(date.getMonth() + 1, 1);
      clampDayInMonth(date, originalDay);
      break;
    case 'yearly':
      // Add year and clamp day (e.g. Feb 29 -> Feb 28 on non-leap years)
      date.setFullYear(date.getFullYear() + 1, date.getMonth(), 1);
      clampDayInMonth(date, originalDay);
      break;
  }

  return date.toISOString().split('T')[0] as string;
}

/**
 * Legacy constant list (kept for UI hints / tests). Categories are now persisted via CategoriesRepository.
 */
export const SUBSCRIPTION_CATEGORIES: readonly string[] = [
  'Utilities',
  'Entertainment',
  'Software',
  'Streaming',
  'Cloud Storage',
  'Insurance',
  'Food',
  'Transportation',
  'Health',
  'Education',
  'Other',
] as const;

export function calculateMonthlyEquivalent(amount: number, frequency: SubscriptionFrequency): number {
  const multipliers: Record<SubscriptionFrequency, number> = {
    weekly: 4.33, // Average weeks per month
    fortnightly: 2.167, // Average fortnights per month
    monthly: 1,
    yearly: 1/12,
  };

  return amount * multipliers[frequency];
}

/**
 * Constants
 */
export const SUBSCRIPTION_FREQUENCIES: readonly SubscriptionFrequency[] = [
  'weekly',
  'fortnightly',
  'monthly',
  'yearly',
] as const;

/**
 * Default values
 * Note: categoryId is now required and must be provided by the caller
 */
export function getDefaultSubscription(categoryId?: string): Omit<Subscription, 'id'> {
  const today = new Date().toISOString().split('T')[0] as string;
  return {
    name: '',
    amount: 0,
    frequency: 'monthly',
    chargeDate: today,
    nextDueDate: today,
    categoryId: categoryId || '',
  };
}
