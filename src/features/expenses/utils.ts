import type {
  ExpenseFrequency,
  Expense,
} from '@/types/domain';

/**
 * Validation functions
 */
export function isValidCurrencyAmount(amount: number): boolean {
  // Allow 0.00 amounts
  return typeof amount === 'number' && amount >= 0 && amount <= 1_000_000 && !isNaN(amount);
}

export function isValidISODateString(date: string): boolean {
  const dateObj = new Date(date);
  return dateObj instanceof Date && !isNaN(dateObj.getTime()) && date === dateObj.toISOString().split('T')[0];
}

export function isValidExpenseId(id: string): boolean {
  return typeof id === 'string' && id.length > 0;
}

/**
 * Business logic validation
 */
export function validateExpenseDates(chargeDate: string, nextDueDate: string): boolean {
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

export function validateExpenseAmount(amount: number, frequency: ExpenseFrequency): boolean {
  // Check if amount is a valid number (allow 0.00)
  if (!isValidCurrencyAmount(amount) || amount < 0) {
    return false;
  }

  const minAmounts: Record<ExpenseFrequency, number> = {
    weekly: 0,
    fortnightly: 0,
    monthly: 0,
    quarterly: 0,
    yearly: 0,
  };

  const maxAmounts: Record<ExpenseFrequency, number> = {
    weekly: 2000,
    fortnightly: 4000,
    monthly: 10000,
    quarterly: 30000,
    yearly: 50000,
  };

  return amount >= minAmounts[frequency] && amount <= maxAmounts[frequency];
}

/**
 * Validate complete expense data integrity
 */
export function validateExpenseIntegrity(expense: {
  name: string;
  amount: number;
  frequency: ExpenseFrequency;
  chargeDate: string;
  nextDueDate: string;
  categoryId: string;
}): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Name validation
  if (!expense.name?.trim()) {
    errors.push('Name is required');
  } else if (expense.name.trim().length < 2) {
    errors.push('Name must be at least 2 characters long');
  } else if (expense.name.trim().length > 100) {
    errors.push('Name must be less than 100 characters');
  }

  // Amount validation
  if (!validateExpenseAmount(expense.amount, expense.frequency)) {
    const ranges = {
      weekly: '$0-2000',
      fortnightly: '$0-4000',
      monthly: '$0-10,000',
      quarterly: '$0-30,000',
      yearly: '$0-50,000',
    };
    errors.push(`Amount must be between ${ranges[expense.frequency]} for ${expense.frequency} frequency`);
  }

  // Date validation
  if (!validateExpenseDates(expense.chargeDate, expense.nextDueDate)) {
    errors.push('Invalid date configuration. Next due date must be after charge date and within reasonable ranges.');
  }

  // Category validation
  if (!expense.categoryId || expense.categoryId.trim().length === 0) {
    errors.push('Category is required');
  } else if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(expense.categoryId)) {
    errors.push('Invalid category selected');
  }

  // Business rule: Check if next due date aligns with frequency
  try {
    const calculatedNextDue = calculateNextDueDate(expense.chargeDate, expense.frequency);
    const actualNextDue = new Date(expense.nextDueDate);
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
  frequency: ExpenseFrequency
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
    case 'quarterly':
      // Add 3 months and clamp day
      date.setMonth(date.getMonth() + 3, 1);
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
export const EXPENSE_CATEGORIES: readonly string[] = [
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

export function calculateMonthlyEquivalent(amount: number, frequency: ExpenseFrequency): number {
  const multipliers: Record<ExpenseFrequency, number> = {
    weekly: 4.33, // Average weeks per month
    fortnightly: 2.167, // Average fortnights per month
    monthly: 1,
    quarterly: 1/3, // Quarterly = 3 months, so monthly equivalent = amount / 3
    yearly: 1/12,
  };

  return amount * multipliers[frequency];
}

/**
 * Constants
 */
export const EXPENSE_FREQUENCIES: readonly ExpenseFrequency[] = [
  'weekly',
  'fortnightly',
  'monthly',
  'quarterly',
  'yearly',
] as const;

/**
 * Default values
 * Note: categoryId is now required and must be provided by the caller
 */
export function getDefaultExpense(categoryId?: string): Omit<Expense, 'id'> {
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

// Backward compatibility exports
/** @deprecated Use validateExpenseDates instead */
export const validateSubscriptionDates = validateExpenseDates;
/** @deprecated Use validateExpenseAmount instead */
export const validateSubscriptionAmount = validateExpenseAmount;
/** @deprecated Use validateExpenseIntegrity instead */
export const validateSubscriptionIntegrity = validateExpenseIntegrity;
/** @deprecated Use isValidExpenseId instead */
export const isValidSubscriptionId = isValidExpenseId;
/** @deprecated Use EXPENSE_CATEGORIES instead */
export const SUBSCRIPTION_CATEGORIES = EXPENSE_CATEGORIES;
/** @deprecated Use EXPENSE_FREQUENCIES instead */
export const SUBSCRIPTION_FREQUENCIES = EXPENSE_FREQUENCIES;
/** @deprecated Use getDefaultExpense instead */
export const getDefaultSubscription = getDefaultExpense;

