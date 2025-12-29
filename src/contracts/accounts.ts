import { z } from 'zod';

/**
 * Account contracts - Zod-first schemas for type-safe API communication
 * These schemas define the contract between frontend and backend for account data.
 */

// Validation limits
const VALIDATION_LIMITS = {
  institution: { min: 1, max: 100 },
  accountName: { min: 1, max: 100 },
  balance: { max: 99999999.99 }, // Matches numeric(10,2)
} as const;

// Base institution validation
const institutionSchema = z.string()
  .min(VALIDATION_LIMITS.institution.min, `Institution name must be at least ${VALIDATION_LIMITS.institution.min} character`)
  .max(VALIDATION_LIMITS.institution.max, `Institution name must be less than ${VALIDATION_LIMITS.institution.max} characters`)
  .trim()
  .refine(name => name.length > 0 && !/^\s*$/.test(name), "Institution name can't be empty.");

// Base account name validation
const accountNameSchema = z.string()
  .min(VALIDATION_LIMITS.accountName.min, `Account name must be at least ${VALIDATION_LIMITS.accountName.min} character`)
  .max(VALIDATION_LIMITS.accountName.max, `Account name must be less than ${VALIDATION_LIMITS.accountName.max} characters`)
  .trim()
  .refine(name => name.length > 0 && !/^\s*$/.test(name), "Account name can't be empty.");

// Balance validation (can be negative for credit cards)
const balanceSchema = z.number()
  .max(VALIDATION_LIMITS.balance.max, `Balance cannot exceed ${VALIDATION_LIMITS.balance.max}`)
  .refine(value => /^-?\d+(\.\d{1,2})?$/.test(value.toFixed(2)), 'Balance can have at most 2 decimal places');

// Available balance validation (can be negative for credit cards)
const availableBalanceSchema = z.number()
  .max(VALIDATION_LIMITS.balance.max, `Available balance cannot exceed ${VALIDATION_LIMITS.balance.max}`)
  .refine(value => /^-?\d+(\.\d{1,2})?$/.test(value.toFixed(2)), 'Available balance can have at most 2 decimal places');

// Account type validation
const accountTypeSchema = z.string()
  .min(1, "Account type can't be empty.")
  .trim();

// Datetime validation (handles ISO strings and timestamps)
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

// API request schemas
export const accountCreateSchema = z.object({
  institution: institutionSchema,
  accountName: accountNameSchema,
  balance: balanceSchema,
  availableBalance: availableBalanceSchema,
  accountType: accountTypeSchema,
  lastUpdated: datetimeSchema,
  hidden: z.boolean().default(false),
});

export const accountUpdateSchema = z.object({
  institution: institutionSchema.optional(),
  accountName: accountNameSchema.optional(),
  balance: balanceSchema.optional(),
  availableBalance: availableBalanceSchema.optional(),
  accountType: accountTypeSchema.optional(),
  lastUpdated: datetimeSchema.optional(),
  hidden: z.boolean().optional(),
});


// API response schemas
export const accountEntitySchema = z.object({
  id: z.string().uuid('Invalid account ID format'),
  userId: z.string().min(1, 'User ID is required'),
  institution: institutionSchema,
  accountName: accountNameSchema,
  balance: balanceSchema,
  availableBalance: availableBalanceSchema,
  accountType: accountTypeSchema,
  lastUpdated: datetimeSchema,
  hidden: z.boolean(),
  createdAt: datetimeSchema,
  updatedAt: datetimeSchema,
});

export const accountListSchema = z.array(accountEntitySchema);

// Type exports for convenience
export type AccountCreate = z.infer<typeof accountCreateSchema>;
export type AccountUpdate = z.infer<typeof accountUpdateSchema>;
export type AccountEntity = z.infer<typeof accountEntitySchema>;
export type AccountError = {
  error: string;
  code: string;
  details?: unknown;
};

// Error codes that can be returned by the accounts API
export const ACCOUNT_ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  DUPLICATE_ENTRY: 'DUPLICATE_ENTRY',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  AUTH_EXPIRED: 'AUTH_EXPIRED',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
} as const;

