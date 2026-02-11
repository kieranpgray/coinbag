import { z } from 'zod';

/**
 * Liability contracts - Zod-first schemas for type-safe API communication
 * These schemas define the contract between frontend and backend for liability data.
 */

// Validation limits
const VALIDATION_LIMITS = {
  name: { min: 1, max: 100 },
  balance: { max: 99999999.99 }, // Matches numeric(10,2)
  interestRate: { max: 100 }, // Percentage 0-100
  monthlyPayment: { max: 99999999.99 }, // Matches numeric(10,2)
  repaymentAmount: { max: 99999999.99 }, // Matches numeric(10,2)
  institution: { max: 100 },
} as const;

// Base institution validation (optional)
// Standardized across all contracts to handle empty strings consistently
const institutionSchema = z.preprocess(
  (val) => {
    // Handle null/undefined values before string validation
    if (val === null || val === undefined) return '';
    return val;
  },
  z.string()
    .max(VALIDATION_LIMITS.institution.max, `Institution name must be less than ${VALIDATION_LIMITS.institution.max} characters`)
    .trim()
    .optional()
    .or(z.literal(''))
    .transform((val) => {
      // Convert empty string to undefined for consistent TypeScript types
      if (val === '') return undefined;
      return val;
    })
);

// Liability type enum
const liabilityTypeSchema = z.enum(['Loans', 'Credit Cards', 'Other'], {
  errorMap: () => ({ message: 'Invalid liability type' }),
});

// Base liability name validation
const liabilityNameSchema = z.string()
  .min(VALIDATION_LIMITS.name.min, `Name must be at least ${VALIDATION_LIMITS.name.min} character`)
  .max(VALIDATION_LIMITS.name.max, `Name must be less than ${VALIDATION_LIMITS.name.max} characters`)
  .trim()
  .refine(name => name.length > 0 && !/^\s*$/.test(name), "Name can't be empty.");

// Balance validation (must be positive and within database precision limits)
const balanceSchema = z.number()
  .min(0, 'Balance must be positive')
  .max(VALIDATION_LIMITS.balance.max, `Balance cannot exceed ${VALIDATION_LIMITS.balance.max}`)
  .refine(value => /^\d+(\.\d{1,2})?$/.test(value.toFixed(2)), 'Balance can have at most 2 decimal places');

// Interest rate validation (percentage 0-100)
const interestRateSchema = z.number()
  .min(0, 'Interest rate must be positive')
  .max(VALIDATION_LIMITS.interestRate.max, `Interest rate cannot exceed ${VALIDATION_LIMITS.interestRate.max}%`)
  .refine(value => /^\d+(\.\d{1,2})?$/.test(value.toFixed(2)), 'Interest rate can have at most 2 decimal places')
  .optional();

// Monthly payment validation
const monthlyPaymentSchema = z.number()
  .min(0, 'Monthly payment must be positive')
  .max(VALIDATION_LIMITS.monthlyPayment.max, `Monthly payment cannot exceed ${VALIDATION_LIMITS.monthlyPayment.max}`)
  .refine(value => /^\d+(\.\d{1,2})?$/.test(value.toFixed(2)), 'Monthly payment can have at most 2 decimal places')
  .optional();

// Repayment amount validation
const repaymentAmountSchema = z.number()
  .min(0, 'Repayment amount must be positive')
  .max(VALIDATION_LIMITS.repaymentAmount.max, `Repayment amount cannot exceed ${VALIDATION_LIMITS.repaymentAmount.max}`)
  .refine(value => /^\d+(\.\d{1,2})?$/.test(value.toFixed(2)), 'Repayment amount can have at most 2 decimal places')
  .optional();

// Repayment frequency validation (matches SubscriptionFrequency)
const repaymentFrequencySchema = z.enum(['weekly', 'fortnightly', 'monthly', 'quarterly', 'yearly'], {
  errorMap: () => ({ message: 'Invalid repayment frequency' }),
}).optional();

// Date validation (ISO date string in YYYY-MM-DD format)
const dueDateSchema = z.preprocess(
  (val) => {
    if (val === undefined || val === null || val === '') {
      return undefined;
    }
    const str = String(val);
    // If it's an ISO datetime string, extract just the date part (YYYY-MM-DD)
    if (str.includes('T')) {
      return str.split('T')[0];
    }
    return str;
  },
  z.string()
    .refine(
      (date) => /^\d{4}-\d{2}-\d{2}$/.test(date),
      'Date must be in YYYY-MM-DD format'
    )
    .refine(
      (date) => {
        const parsed = Date.parse(date);
        if (isNaN(parsed)) return false;
        const parts = date.split('-');
        if (parts.length !== 3) return false;
        const year = Number(parts[0]);
        const month = Number(parts[1]);
        const day = Number(parts[2]);
        if (!year || !month || !day) return false;
        const dateObj = new Date(year, month - 1, day);
        return (
          dateObj.getFullYear() === year &&
          dateObj.getMonth() === month - 1 &&
          dateObj.getDate() === day
        );
      },
      'Date must be a valid calendar date'
    )
    .optional()
);

// API request schemas
export const liabilityCreateSchema = z.object({
  name: liabilityNameSchema,
  type: liabilityTypeSchema,
  balance: balanceSchema,
  interestRate: interestRateSchema,
  monthlyPayment: monthlyPaymentSchema,
  dueDate: dueDateSchema,
  institution: institutionSchema,
  // Note: repaymentAmount and repaymentFrequency are not included in create schema
  // as they are only used for update operations and the database columns may not exist
});

export const liabilityUpdateSchema = z.object({
  name: liabilityNameSchema.optional(),
  type: liabilityTypeSchema.optional(),
  balance: balanceSchema.optional(),
  interestRate: interestRateSchema,
  monthlyPayment: monthlyPaymentSchema,
  dueDate: dueDateSchema,
  institution: institutionSchema,
  repaymentAmount: repaymentAmountSchema,
  repaymentFrequency: repaymentFrequencySchema,
});

// Helper to handle nullable numbers from database (transform null to undefined)
const nullableNumberSchema = z.number()
  .nullable()
  .optional()
  .transform(val => val === null ? undefined : val);

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
export const liabilityEntitySchema = z.object({
  id: z.string().uuid('Invalid liability ID format'),
  userId: z.string().min(1, 'User ID is required'),
  name: liabilityNameSchema,
  type: liabilityTypeSchema,
  balance: balanceSchema,
  interestRate: nullableNumberSchema,
  monthlyPayment: nullableNumberSchema,
  dueDate: z.preprocess(
    (val) => {
      if (val === undefined || val === null || val === '') {
        return undefined;
      }
      const str = String(val);
      if (str.includes('T')) {
        return str.split('T')[0];
      }
      return str;
    },
    z.string()
      .refine(
        (date) => /^\d{4}-\d{2}-\d{2}$/.test(date),
        'Date must be in YYYY-MM-DD format'
      )
      .optional()
  )
    .nullable()
    .optional()
    .transform(val => val === null ? undefined : val),
  institution: nullableStringSchema,
  repaymentAmount: nullableNumberSchema,
  repaymentFrequency: z.enum(['weekly', 'fortnightly', 'monthly', 'quarterly', 'yearly'])
    .nullable()
    .optional()
    .transform(val => val === null ? undefined : val),
  createdAt: datetimeSchema,
  updatedAt: datetimeSchema,
});

export const liabilityListSchema = z.array(liabilityEntitySchema);

// Type exports for convenience
export type LiabilityCreate = z.infer<typeof liabilityCreateSchema>;
export type LiabilityUpdate = z.infer<typeof liabilityUpdateSchema>;
export type LiabilityEntity = z.infer<typeof liabilityEntitySchema>;
export type LiabilityError = {
  error: string;
  code: string;
  details?: unknown;
};

// Error codes that can be returned by the liabilities API
export const LIABILITY_ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  DUPLICATE_ENTRY: 'DUPLICATE_ENTRY',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  AUTH_EXPIRED: 'AUTH_EXPIRED',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
} as const;


// Liability balance history schemas
export const liabilityBalanceHistorySchema = z.object({
  id: z.string().uuid('Invalid liability balance history ID format'),
  liabilityId: z.string().uuid('Invalid liability ID format'),
  previousBalance: z.number().nullable(),
  newBalance: balanceSchema,
  changeAmount: z.number(),
  createdAt: datetimeSchema,
});

export const liabilityBalanceHistoryListSchema = z.array(liabilityBalanceHistorySchema);

// Type exports for liability balance history
export type LiabilityBalanceHistory = z.infer<typeof liabilityBalanceHistorySchema>;
