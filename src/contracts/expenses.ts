import { z } from 'zod';

/**
 * Expense contracts - Zod-first schemas for type-safe API communication
 * These schemas define the contract between frontend and backend for expense data.
 */

// Constants for validation rules
const AMOUNT_RANGES = {
  weekly: { min: 0, max: 2000, label: '$0-2000' },
  fortnightly: { min: 0, max: 4000, label: '$0-4000' },
  monthly: { min: 0, max: 10000, label: '$0-10,000' },
  quarterly: { min: 0, max: 30000, label: '$0-30,000' },
  yearly: { min: 0, max: 50000, label: '$0-50,000' },
} as const;

const VALIDATION_LIMITS = {
  name: { min: 1, max: 100 },
  amount: { min: 0, max: 100000 },
  notes: { max: 500 },
} as const;

// Base schemas for domain types
export const expenseFrequencySchema = z.enum(['weekly', 'fortnightly', 'monthly', 'quarterly', 'yearly']);

// Category ID schema - references categories table
export const categoryIdSchema = z.string().uuid('Invalid category ID format');

// Account ID schema - references accounts table (optional for paid from account)
export const accountIdSchema = z.string().uuid('Invalid account ID format');

// Reusable validation schemas
const validDateString = z.string().refine(
  (date) => !isNaN(Date.parse(date)),
  'Invalid date format'
);

const validAmount = z.number()
  .min(VALIDATION_LIMITS.amount.min, `Amount must be at least $${VALIDATION_LIMITS.amount.min}`)
  .max(VALIDATION_LIMITS.amount.max, `Amount must be less than $${VALIDATION_LIMITS.amount.max}`)
  .finite('Amount must be a valid number');

// Validation functions
const validateDateOrder = (chargeDate: string, nextDueDate: string): boolean => {
  const charge = new Date(chargeDate);
  const nextDue = new Date(nextDueDate);
  return nextDue >= charge;
};

const validateAmountForFrequency = (amount: number, frequency: keyof typeof AMOUNT_RANGES): boolean => {
  const range = AMOUNT_RANGES[frequency];
  return amount >= range.min && amount <= range.max;
};

const getAmountRangeError = (frequency: keyof typeof AMOUNT_RANGES): string => {
  return `Amount must be between ${AMOUNT_RANGES[frequency].label} for ${frequency} frequency`;
};

// Common field schemas
const baseExpenseFields = {
  name: z.string()
    .min(VALIDATION_LIMITS.name.min, 'Name is required')
    .max(VALIDATION_LIMITS.name.max, `Name must be less than ${VALIDATION_LIMITS.name.max} characters`)
    .trim(),
  amount: validAmount,
  frequency: expenseFrequencySchema,
  chargeDate: validDateString.optional().nullable(),
  nextDueDate: validDateString.optional().nullable(),
  categoryId: categoryIdSchema,
  paidFromAccountId: accountIdSchema.optional(),
};

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

// Entity schema - represents stored expense data (includes userId and timestamps from DB)
export const expenseEntitySchema = z.object({
  id: z.string().uuid('Invalid expense ID format'),
  userId: z.string().min(1, 'User ID is required'),
  ...baseExpenseFields,
  paidFromAccountId: nullableStringSchema, // Override paidFromAccountId to handle null from DB
  createdAt: datetimeSchema,
  updatedAt: datetimeSchema,
}).superRefine((data, ctx) => {
  // Only validate date order if both dates are provided
  if (data.chargeDate && data.nextDueDate && !validateDateOrder(data.chargeDate, data.nextDueDate)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Next due date must be after or equal to charge date',
      path: ['nextDueDate'],
    });
  }

  if (!validateAmountForFrequency(data.amount, data.frequency)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: getAmountRangeError(data.frequency),
      path: ['amount'],
    });
  }
});

// Create schema - input for creating new expenses (excludes id)
export const expenseCreateSchema = z.object(baseExpenseFields)
  .superRefine((data, ctx) => {
    // Only validate date order if both dates are provided
    if (data.chargeDate && data.nextDueDate && !validateDateOrder(data.chargeDate, data.nextDueDate)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Next due date must be after or equal to charge date',
        path: ['nextDueDate'],
      });
    }

    if (!validateAmountForFrequency(data.amount, data.frequency)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: getAmountRangeError(data.frequency),
        path: ['amount'],
      });
    }
  });

// Update schema - partial update input (all fields optional)
export const expenseUpdateSchema = z.object({
  name: baseExpenseFields.name.optional(),
  amount: baseExpenseFields.amount.optional(),
  frequency: expenseFrequencySchema.optional(),
  chargeDate: validDateString.optional(),
  nextDueDate: validDateString.nullable().optional(),
  categoryId: categoryIdSchema.optional(),
  paidFromAccountId: baseExpenseFields.paidFromAccountId,
}).superRefine((data, ctx) => {
  // If both dates are provided, validate next due date is after charge date
  if (data.chargeDate && data.nextDueDate) {
    if (!validateDateOrder(data.chargeDate, data.nextDueDate)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Next due date must be after or equal to charge date',
        path: ['nextDueDate'],
      });
    }
  }

  // If amount and frequency are both provided, validate amount ranges
  if (data.amount !== undefined && data.frequency) {
    if (!validateAmountForFrequency(data.amount, data.frequency)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: getAmountRangeError(data.frequency),
        path: ['amount'],
      });
    }
  }
});

// List schema - array of entities
export const expenseListSchema = z.array(expenseEntitySchema);

// ID schema - just the ID for lookup operations
export const expenseIdSchema = z.object({
  id: z.string().uuid('Invalid expense ID format'),
});

// Derived TypeScript types from Zod schemas
export type ExpenseEntity = z.infer<typeof expenseEntitySchema>;
export type ExpenseCreate = z.infer<typeof expenseCreateSchema>;
export type ExpenseUpdate = z.infer<typeof expenseUpdateSchema>;
export type ExpenseList = z.infer<typeof expenseListSchema>;
export type ExpenseId = z.infer<typeof expenseIdSchema>;

// Utility types for API responses
export type ExpenseCreateResponse = ExpenseEntity;
export type ExpenseUpdateResponse = ExpenseEntity;
export type ExpenseListResponse = ExpenseList;
export type ExpenseGetResponse = ExpenseEntity;

// Error response schema (for consistent error handling)
export const expenseErrorSchema = z.object({
  error: z.string(),
  code: z.string().optional(),
  details: z.unknown().optional(),
});

export type ExpenseError = z.infer<typeof expenseErrorSchema>;

// API response wrapper schema
export const expenseApiResponseSchema = <T extends z.ZodType>(dataSchema: T) => z.object({
  data: dataSchema,
  error: expenseErrorSchema.optional(),
});

export type ExpenseApiResponse<T> = {
  data: T;
  error?: ExpenseError;
};

// Backward compatibility exports (deprecated)
/** @deprecated Use expenseFrequencySchema instead */
export const subscriptionFrequencySchema = expenseFrequencySchema;
/** @deprecated Use expenseEntitySchema instead */
export const subscriptionEntitySchema = expenseEntitySchema;
/** @deprecated Use expenseCreateSchema instead */
export const subscriptionCreateSchema = expenseCreateSchema;
/** @deprecated Use expenseUpdateSchema instead */
export const subscriptionUpdateSchema = expenseUpdateSchema;
/** @deprecated Use expenseListSchema instead */
export const subscriptionListSchema = expenseListSchema;
/** @deprecated Use expenseIdSchema instead */
export const subscriptionIdSchema = expenseIdSchema;
/** @deprecated Use ExpenseEntity instead */
export type SubscriptionEntity = ExpenseEntity;
/** @deprecated Use ExpenseCreate instead */
export type SubscriptionCreate = ExpenseCreate;
/** @deprecated Use ExpenseUpdate instead */
export type SubscriptionUpdate = ExpenseUpdate;
/** @deprecated Use ExpenseList instead */
export type SubscriptionList = ExpenseList;
/** @deprecated Use ExpenseId instead */
export type SubscriptionId = ExpenseId;
/** @deprecated Use ExpenseCreateResponse instead */
export type SubscriptionCreateResponse = ExpenseCreateResponse;
/** @deprecated Use ExpenseUpdateResponse instead */
export type SubscriptionUpdateResponse = ExpenseUpdateResponse;
/** @deprecated Use ExpenseListResponse instead */
export type SubscriptionListResponse = ExpenseListResponse;
/** @deprecated Use ExpenseGetResponse instead */
export type SubscriptionGetResponse = ExpenseGetResponse;
/** @deprecated Use expenseErrorSchema instead */
export const subscriptionErrorSchema = expenseErrorSchema;
/** @deprecated Use ExpenseError instead */
export type SubscriptionError = ExpenseError;
/** @deprecated Use expenseApiResponseSchema instead */
export const subscriptionApiResponseSchema = expenseApiResponseSchema;
/** @deprecated Use ExpenseApiResponse instead */
export type SubscriptionApiResponse<T> = ExpenseApiResponse<T>;

