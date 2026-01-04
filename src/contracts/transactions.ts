import { z } from 'zod';

/**
 * Transaction contracts - Zod-first schemas for type-safe API communication
 * These schemas define the contract between frontend and backend for transaction data.
 */

// Validation limits
const VALIDATION_LIMITS = {
  description: { min: 1, max: 500 },
  amount: { max: 99999999.99 }, // Matches numeric(10,2)
  transactionReference: { max: 200 },
} as const;

// Base description validation
const descriptionSchema = z.string()
  .min(VALIDATION_LIMITS.description.min, `Description must be at least ${VALIDATION_LIMITS.description.min} character`)
  .max(VALIDATION_LIMITS.description.max, `Description must be less than ${VALIDATION_LIMITS.description.max} characters`)
  .trim()
  .refine(name => name.length > 0 && !/^\s*$/.test(name), "Description can't be empty.");

// Amount validation (can be negative for expenses)
const amountSchema = z.number()
  .max(VALIDATION_LIMITS.amount.max, `Amount cannot exceed ${VALIDATION_LIMITS.amount.max}`)
  .refine(value => /^-?\d+(\.\d{1,2})?$/.test(value.toFixed(2)), 'Amount can have at most 2 decimal places');

// Transaction type validation
const transactionTypeSchema = z.enum(['income', 'expense']);

// Date validation
const dateSchema = z.string()
  .refine(
    (val) => {
      const parsed = Date.parse(val);
      return !isNaN(parsed);
    },
    'Invalid date format'
  );

// Transaction reference validation (optional)
const transactionReferenceSchema = z.string()
  .max(VALIDATION_LIMITS.transactionReference.max, `Transaction reference must be less than ${VALIDATION_LIMITS.transactionReference.max} characters`)
  .trim()
  .optional()
  .nullable();

// UUID validation
const uuidSchema = z.string().uuid('Invalid UUID format');

// API request schemas
export const transactionCreateSchema = z.object({
  accountId: uuidSchema,
  date: dateSchema,
  description: descriptionSchema,
  amount: amountSchema,
  type: transactionTypeSchema,
  category: z.string().trim().optional().nullable(),
  transactionReference: transactionReferenceSchema,
  statementImportId: uuidSchema.optional().nullable(),
});

export const transactionUpdateSchema = z.object({
  accountId: uuidSchema.optional(),
  date: dateSchema.optional(),
  description: descriptionSchema.optional(),
  amount: amountSchema.optional(),
  type: transactionTypeSchema.optional(),
  category: z.string().trim().optional().nullable(),
  transactionReference: transactionReferenceSchema,
});

export const transactionBatchCreateSchema = z.object({
  transactions: z.array(transactionCreateSchema).min(1, 'At least one transaction is required'),
});

// API response schemas
export const transactionEntitySchema = z.object({
  id: z.string().uuid('Invalid transaction ID format'),
  userId: z.string().min(1, 'User ID is required'),
  accountId: z.string().uuid('Invalid account ID format'),
  date: dateSchema,
  description: descriptionSchema,
  amount: amountSchema,
  type: transactionTypeSchema,
  category: z.string().trim().optional().nullable(),
  transactionReference: transactionReferenceSchema,
  statementImportId: z.string().uuid('Invalid statement import ID format').optional().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const transactionListSchema = z.array(transactionEntitySchema);

// Type exports for convenience
export type TransactionCreate = z.infer<typeof transactionCreateSchema>;
export type TransactionUpdate = z.infer<typeof transactionUpdateSchema>;
export type TransactionBatchCreate = z.infer<typeof transactionBatchCreateSchema>;
export type TransactionEntity = z.infer<typeof transactionEntitySchema>;
export type TransactionError = {
  error: string;
  code: string;
  details?: unknown;
};

// Error codes that can be returned by the transactions API
export const TRANSACTION_ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  DUPLICATE_ENTRY: 'DUPLICATE_ENTRY',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  AUTH_EXPIRED: 'AUTH_EXPIRED',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
} as const;

