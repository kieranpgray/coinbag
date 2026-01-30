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

// Base institution validation (optional)
// Standardized across all contracts to handle empty strings consistently
// This ensures React Hook Form doesn't show validation errors for empty values
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

// Base account name validation
const accountNameSchema = z.string()
  .min(VALIDATION_LIMITS.accountName.min, `Account name must be at least ${VALIDATION_LIMITS.accountName.min} character`)
  .max(VALIDATION_LIMITS.accountName.max, `Account name must be less than ${VALIDATION_LIMITS.accountName.max} characters`)
  .trim()
  .refine(name => name.length > 0 && !/^\s*$/.test(name), "Account name can't be empty.");

// Balance validation (can be negative for credit cards)
// Use preprocess to handle NaN/empty values and provide user-friendly errors
const balanceSchema = z.preprocess(
  (val) => {
    // Handle empty/null/undefined values
    if (val === undefined || val === null || val === '') return undefined;
    // Handle NaN values from form inputs
    const num = typeof val === 'number' ? val : parseFloat(String(val));
    return isNaN(num) ? undefined : num;
  },
  z.number({
    required_error: "Balance is required",
    invalid_type_error: "Please enter a valid amount"
  })
    .max(VALIDATION_LIMITS.balance.max, `Balance cannot exceed ${VALIDATION_LIMITS.balance.max}`)
    .refine(value => /^-?\d+(\.\d{1,2})?$/.test(value.toFixed(2)), 'Balance can have at most 2 decimal places')
);


// Credit limit validation (for credit cards/loans)
// Use preprocess to handle NaN/empty values and provide user-friendly errors
const creditLimitSchema = z.preprocess(
  (val) => {
    // Handle empty/null/undefined values
    if (val === undefined || val === null || val === '') return undefined;
    // Handle NaN values from form inputs
    const num = typeof val === 'number' ? val : parseFloat(String(val));
    return isNaN(num) ? undefined : num;
  },
  z.number({
    required_error: "Credit limit is required",
    invalid_type_error: "Please enter a valid amount"
  })
    .min(0, 'Credit limit must be positive')
    .max(VALIDATION_LIMITS.balance.max, `Credit limit cannot exceed ${VALIDATION_LIMITS.balance.max}`)
    .refine(value => /^\d+(\.\d{1,2})?$/.test(value.toFixed(2)), 'Credit limit can have at most 2 decimal places')
    .optional()
);

// Balance owed validation (for credit cards/loans - always positive)
// Use preprocess to handle NaN/empty values and provide user-friendly errors
const balanceOwedSchema = z.preprocess(
  (val) => {
    // Handle empty/null/undefined values
    if (val === undefined || val === null || val === '') return undefined;
    // Handle NaN values from form inputs
    const num = typeof val === 'number' ? val : parseFloat(String(val));
    return isNaN(num) ? undefined : num;
  },
  z.number({
    required_error: "Balance owed is required",
    invalid_type_error: "Please enter a valid amount"
  })
    .min(0, 'Balance owed must be positive')
    .max(VALIDATION_LIMITS.balance.max, `Balance owed cannot exceed ${VALIDATION_LIMITS.balance.max}`)
    .refine(value => /^\d+(\.\d{1,2})?$/.test(value.toFixed(2)), 'Balance owed can have at most 2 decimal places')
    .optional()
);

// Account type validation
const accountTypeSchema = z.string()
  .min(1, "Account type can't be empty.")
  .trim();

// Currency validation (ISO 4217 codes - simplified to common ones)
const currencySchema = z.string()
  .min(3, "Currency code must be at least 3 characters")
  .max(3, "Currency code must be exactly 3 characters")
  .default('AUD');

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
  accountType: accountTypeSchema,
  currency: currencySchema.optional(),
  creditLimit: creditLimitSchema,
  balanceOwed: balanceOwedSchema,
  lastUpdated: datetimeSchema,
  hidden: z.boolean().default(false),
}).refine(
  (data) => {
    // Credit Card and Loan require creditLimit and balanceOwed
    if (data.accountType === 'Credit Card' || data.accountType === 'Loan') {
      return data.creditLimit !== undefined && data.balanceOwed !== undefined;
    }
    return true;
  },
  {
    message: 'Credit limit and balance owed are required for Credit Card and Loan accounts',
    path: ['creditLimit'],
  }
);

export const accountUpdateSchema = z.object({
  institution: institutionSchema,
  accountName: accountNameSchema.optional(),
  balance: balanceSchema.optional(),
  accountType: accountTypeSchema.optional(),
  currency: currencySchema.optional(),
  creditLimit: creditLimitSchema,
  balanceOwed: balanceOwedSchema,
  lastUpdated: datetimeSchema.optional(),
  hidden: z.boolean().optional(),
});


// Helper to handle nullable institution from database (transform null to undefined)
// Matches the pattern used in institutionSchema but handles null from database
const nullableInstitutionSchema = z.string()
  .max(VALIDATION_LIMITS.institution.max, `Institution name must be less than ${VALIDATION_LIMITS.institution.max} characters`)
  .trim()
  .nullable()
  .optional()
  .transform((val) => {
    // Convert empty/null/undefined to undefined for TypeScript consistency
    if (val === '' || val === null || val === undefined) return undefined;
    return val;
  });

// API response schemas
export const accountEntitySchema = z.object({
  id: z.string().uuid('Invalid account ID format'),
  userId: z.string().min(1, 'User ID is required'),
  institution: nullableInstitutionSchema,
  accountName: accountNameSchema,
  balance: balanceSchema,
  accountType: accountTypeSchema,
  currency: currencySchema.optional(),
  creditLimit: creditLimitSchema,
  balanceOwed: balanceOwedSchema,
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

