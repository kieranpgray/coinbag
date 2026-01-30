import { z } from 'zod';

/**
 * Goals contracts - Zod-first schemas for type-safe API communication
 * These schemas define the contract between frontend and backend for goal data.
 */

// Validation limits
const VALIDATION_LIMITS = {
  name: { min: 1, max: 100 },
  description: { max: 1000 },
  source: { max: 100 },
  amount: { max: 99999999.99 }, // Matches numeric(10,2)
} as const;

// Goal status enum
const goalStatusSchema = z.enum(['active', 'completed', 'paused'], {
  errorMap: () => ({ message: 'Invalid goal status' }),
});

// Goal type enum
const goalTypeSchema = z.enum(['Grow', 'Save', 'Pay Off', 'Invest'], {
  errorMap: () => ({ message: 'Invalid goal type' }),
});

// Base goal name validation
const goalNameSchema = z.string()
  .min(VALIDATION_LIMITS.name.min, `Name must be at least ${VALIDATION_LIMITS.name.min} character`)
  .max(VALIDATION_LIMITS.name.max, `Name must be less than ${VALIDATION_LIMITS.name.max} characters`)
  .trim()
  .refine(name => name.length > 0 && !/^\s*$/.test(name), "Name can't be empty.");

// Amount validation (must be positive and within database precision limits)
const amountSchema = z.number()
  .min(0, 'Amount must be positive')
  .max(VALIDATION_LIMITS.amount.max, `Amount cannot exceed ${VALIDATION_LIMITS.amount.max}`)
  .refine(value => /^\d+(\.\d{1,2})?$/.test(value.toFixed(2)), 'Amount can have at most 2 decimal places');

// Date validation (ISO date string in YYYY-MM-DD format)
const deadlineSchema = z.preprocess(
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
export const goalCreateSchema = z.object({
  name: goalNameSchema,
  description: z.string()
    .max(VALIDATION_LIMITS.description.max, `Description must be less than ${VALIDATION_LIMITS.description.max} characters`)
    .trim()
    .optional()
    .transform(e => e === '' ? undefined : e), // Convert empty string to undefined
  source: z.string()
    .max(VALIDATION_LIMITS.source.max, `Source must be less than ${VALIDATION_LIMITS.source.max} characters`)
    .trim()
    .optional()
    .transform(e => e === '' ? undefined : e), // Convert empty string to undefined
  type: goalTypeSchema.optional(),
  targetAmount: amountSchema,
  currentAmount: amountSchema.optional().default(0),
  deadline: deadlineSchema,
  status: goalStatusSchema.optional().default('active'),
  accountId: z.string().uuid('Invalid account ID format').optional(),
});

export const goalUpdateSchema = z.object({
  name: goalNameSchema.optional(),
  description: z.string()
    .max(VALIDATION_LIMITS.description.max, `Description must be less than ${VALIDATION_LIMITS.description.max} characters`)
    .trim()
    .optional()
    .transform(e => e === '' ? null : e), // Convert empty string to null for DB
  source: z.string()
    .max(VALIDATION_LIMITS.source.max, `Source must be less than ${VALIDATION_LIMITS.source.max} characters`)
    .trim()
    .optional()
    .transform(e => e === '' ? null : e), // Convert empty string to null for DB
  type: goalTypeSchema.optional(),
  targetAmount: amountSchema.optional(),
  currentAmount: amountSchema.optional(),
  deadline: deadlineSchema,
  status: goalStatusSchema.optional(),
  accountId: z.string().uuid('Invalid account ID format').optional().nullable(),
});

// Helper to handle nullable strings from database (transform null to undefined)
const nullableStringSchema = z.string()
  .nullable()
  .optional()
  .transform(val => val === null ? undefined : val);

// Helper to handle nullable dates from database (transform null to undefined)
const nullableDateSchema = z.preprocess(
  (val) => {
    if (val === null || val === undefined || val === '') {
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
).transform((val) => {
    if (val === null || val === undefined) return undefined;
    // If it's an ISO datetime string, extract just the date part (YYYY-MM-DD)
    if (typeof val === 'string' && val.includes('T')) {
      return val.split('T')[0];
    }
    return val;
  });

// Helper to handle datetime strings from Supabase
const datetimeSchema = z.string()
  .datetime({ offset: true })
  .or(z.string().transform(s => new Date(s).toISOString()));

// Helper to handle nullable UUIDs from database (transform null to undefined)
const nullableUuidSchema = z.string()
  .uuid('Invalid account ID format')
  .nullable()
  .optional()
  .transform(val => val === null ? undefined : val);

// API response schemas
export const goalEntitySchema = z.object({
  id: z.string().uuid('Invalid goal ID format'),
  userId: z.string().min(1, 'User ID is required'),
  name: goalNameSchema,
  description: nullableStringSchema,
  source: nullableStringSchema,
  type: goalTypeSchema.optional(),
  targetAmount: amountSchema,
  currentAmount: amountSchema,
  deadline: nullableDateSchema.optional(),
  status: goalStatusSchema,
  accountId: nullableUuidSchema,
  createdAt: datetimeSchema,
  updatedAt: datetimeSchema,
});

export const goalListSchema = z.array(goalEntitySchema);

// Type exports for convenience
export type GoalCreate = z.infer<typeof goalCreateSchema>;
export type GoalUpdate = z.infer<typeof goalUpdateSchema>;
export type GoalEntity = z.infer<typeof goalEntitySchema>;
export type GoalError = {
  error: string;
  code: string;
  details?: unknown;
};

// Error codes that can be returned by the goals API
export const GOAL_ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  DUPLICATE_ENTRY: 'DUPLICATE_ENTRY',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  AUTH_EXPIRED: 'AUTH_EXPIRED',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
} as const;

