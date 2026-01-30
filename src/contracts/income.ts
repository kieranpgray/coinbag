import { z } from 'zod';
import { accountIdSchema } from './expenses';

/**
 * Income contracts - Zod-first schemas for type-safe API communication
 * These schemas define the contract between frontend and backend for income data.
 */

// Validation limits
const VALIDATION_LIMITS = {
  name: { min: 1, max: 100 },
  amount: { max: 99999999.99 }, // Matches numeric(10,2)
  notes: { max: 1000 },
} as const;

// Income source enum
const incomeSourceSchema = z.enum(['Salary', 'Freelance', 'Business', 'Investments', 'Rental', 'Other'], {
  errorMap: () => ({ message: 'Invalid income source' }),
});

// Income frequency enum
const incomeFrequencySchema = z.enum(['weekly', 'fortnightly', 'monthly', 'quarterly', 'yearly'], {
  errorMap: () => ({ message: 'Invalid income frequency' }),
});

// Base income name validation
const incomeNameSchema = z.string()
  .min(VALIDATION_LIMITS.name.min, `Name must be at least ${VALIDATION_LIMITS.name.min} character`)
  .max(VALIDATION_LIMITS.name.max, `Name must be less than ${VALIDATION_LIMITS.name.max} characters`)
  .trim()
  .refine(name => name.length > 0 && !/^\s*$/.test(name), "Name can't be empty.");

// Amount validation (must be positive and within database precision limits)
const amountSchema = z.number()
  .min(0, 'Amount must be positive')
  .max(VALIDATION_LIMITS.amount.max, `Amount cannot exceed ${VALIDATION_LIMITS.amount.max}`)
  .refine(value => /^\d+(\.\d{1,2})?$/.test(value.toFixed(2)), 'Amount can have at most 2 decimal places');

// Date validation (ISO date string in YYYY-MM-DD format or null)
const nextPaymentDateSchema = z.string().nullable().optional()
  .refine(
    (date): date is string | null | undefined => {
      if (date === undefined || date === null || date === '') return true; // Optional field
      if (!date || typeof date !== 'string') return false;

      // Check basic YYYY-MM-DD format
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;

      const parts = date.split('-');
      if (parts.length !== 3) return false;

      const yearStr = parts[0];
      const monthStr = parts[1];
      const dayStr = parts[2];

      if (!yearStr || !monthStr || !dayStr) return false;

      const year = parseInt(yearStr, 10);
      const month = parseInt(monthStr, 10);
      const day = parseInt(dayStr, 10);

      // Basic range checks
      if (year < 1900 || year > 2100) return false;
      if (month < 1 || month > 12) return false;
      if (day < 1 || day > 31) return false;

      // Validate the date actually exists (handles leap years, etc.)
      const dateObj = new Date(year, month - 1, day);
      return dateObj.getFullYear() === year &&
             dateObj.getMonth() === month - 1 &&
             dateObj.getDate() === day;
    },
    'Please enter a valid date in YYYY-MM-DD format'
  );

// API request schemas
export const incomeCreateSchema = z.object({
  name: incomeNameSchema,
  source: incomeSourceSchema,
  amount: amountSchema,
  frequency: incomeFrequencySchema,
  nextPaymentDate: nextPaymentDateSchema,
  paidToAccountId: accountIdSchema.optional(),
});

export const incomeUpdateSchema = z.object({
  name: incomeNameSchema.optional(),
  source: incomeSourceSchema.optional(),
  amount: amountSchema.optional(),
  frequency: incomeFrequencySchema.optional(),
  nextPaymentDate: nextPaymentDateSchema.optional(),
  paidToAccountId: accountIdSchema.optional(),
});

// Helper to handle nullable strings from database (transform null to undefined)
const nullableStringSchema = z.string()
  .nullable()
  .optional()
  .transform(val => val === null ? undefined : val);

// Helper to handle datetime strings from Supabase
const datetimeSchema = z.string()
  .refine(
    (val) => {
      if (val.includes('T') && val.includes('Z')) return true;
      if (val.includes('T')) return true;
      const parsed = Date.parse(val);
      return !isNaN(parsed);
    },
    'Invalid datetime format'
  );

// API response schemas
export const incomeEntitySchema = z.object({
  id: z.string().uuid('Invalid income ID format'),
  userId: z.string().min(1, 'User ID is required'),
  name: incomeNameSchema,
  source: incomeSourceSchema,
  amount: amountSchema,
  frequency: incomeFrequencySchema,
  nextPaymentDate: z.preprocess(
    (val) => {
      if (val === undefined || val === null || val === '') {
        return null; // Allow null for optional dates
      }
      const str = String(val);
      if (str.includes('T')) {
        return str.split('T')[0];
      }
      return str;
    },
    z.string().nullable()
      .refine(
        (date) => date === null || /^\d{4}-\d{2}-\d{2}$/.test(date),
        'Date must be in YYYY-MM-DD format'
      )
  ),
  paidToAccountId: nullableStringSchema,
  createdAt: datetimeSchema,
  updatedAt: datetimeSchema,
});

export const incomeListSchema = z.array(incomeEntitySchema);

// Type exports for convenience
export type IncomeCreate = z.infer<typeof incomeCreateSchema>;
export type IncomeUpdate = z.infer<typeof incomeUpdateSchema>;
export type IncomeEntity = z.infer<typeof incomeEntitySchema>;
export type IncomeError = {
  error: string;
  code: string;
  details?: unknown;
};

// Error codes that can be returned by the income API
export const INCOME_ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  DUPLICATE_ENTRY: 'DUPLICATE_ENTRY',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  AUTH_EXPIRED: 'AUTH_EXPIRED',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
} as const;

