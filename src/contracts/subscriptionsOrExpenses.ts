import { z } from 'zod';

/**
 * Subscription contracts - Zod-first schemas for type-safe API communication
 * These schemas define the contract between frontend and backend for subscription data.
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
export const subscriptionFrequencySchema = z.enum(['weekly', 'fortnightly', 'monthly', 'quarterly', 'yearly']);

// Category ID schema - references categories table
export const categoryIdSchema = z.string().uuid('Invalid category ID format');

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
const baseSubscriptionFields = {
  name: z.string()
    .min(VALIDATION_LIMITS.name.min, 'Name is required')
    .max(VALIDATION_LIMITS.name.max, `Name must be less than ${VALIDATION_LIMITS.name.max} characters`)
    .trim(),
  amount: validAmount,
  frequency: subscriptionFrequencySchema,
  chargeDate: validDateString,
  nextDueDate: validDateString,
  categoryId: categoryIdSchema,
  notes: z.string()
    .max(VALIDATION_LIMITS.notes.max, `Notes must be less than ${VALIDATION_LIMITS.notes.max} characters`)
    .optional(),
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

// Entity schema - represents stored subscription data (includes userId and timestamps from DB)
export const subscriptionEntitySchema = z.object({
  id: z.string().uuid('Invalid subscription ID format'),
  userId: z.string().min(1, 'User ID is required'),
  ...baseSubscriptionFields,
  notes: nullableStringSchema, // Override notes to handle null from DB
  createdAt: datetimeSchema,
  updatedAt: datetimeSchema,
}).superRefine((data, ctx) => {
  if (!validateDateOrder(data.chargeDate, data.nextDueDate)) {
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

// Create schema - input for creating new subscriptions (excludes id)
export const subscriptionCreateSchema = z.object(baseSubscriptionFields)
  .superRefine((data, ctx) => {
    if (!validateDateOrder(data.chargeDate, data.nextDueDate)) {
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
export const subscriptionUpdateSchema = z.object({
  name: baseSubscriptionFields.name.optional(),
  amount: baseSubscriptionFields.amount.optional(),
  frequency: subscriptionFrequencySchema.optional(),
  chargeDate: validDateString.optional(),
  nextDueDate: validDateString.optional(),
  categoryId: categoryIdSchema.optional(),
  notes: baseSubscriptionFields.notes,
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
export const subscriptionListSchema = z.array(subscriptionEntitySchema);

// ID schema - just the ID for lookup operations
export const subscriptionIdSchema = z.object({
  id: z.string().uuid('Invalid subscription ID format'),
});

// Derived TypeScript types from Zod schemas
export type SubscriptionEntity = z.infer<typeof subscriptionEntitySchema>;
export type SubscriptionCreate = z.infer<typeof subscriptionCreateSchema>;
export type SubscriptionUpdate = z.infer<typeof subscriptionUpdateSchema>;
export type SubscriptionList = z.infer<typeof subscriptionListSchema>;
export type SubscriptionId = z.infer<typeof subscriptionIdSchema>;

// Utility types for API responses
export type SubscriptionCreateResponse = SubscriptionEntity;
export type SubscriptionUpdateResponse = SubscriptionEntity;
export type SubscriptionListResponse = SubscriptionList;
export type SubscriptionGetResponse = SubscriptionEntity;

// Error response schema (for consistent error handling)
export const subscriptionErrorSchema = z.object({
  error: z.string(),
  code: z.string().optional(),
  details: z.unknown().optional(),
});

export type SubscriptionError = z.infer<typeof subscriptionErrorSchema>;

// API response wrapper schema
export const subscriptionApiResponseSchema = <T extends z.ZodType>(dataSchema: T) => z.object({
  data: dataSchema,
  error: subscriptionErrorSchema.optional(),
});

export type SubscriptionApiResponse<T> = {
  data: T;
  error?: SubscriptionError;
};
