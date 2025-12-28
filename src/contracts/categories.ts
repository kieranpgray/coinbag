import { z } from 'zod';

/**
 * Category contracts - Zod-first schemas for type-safe API communication
 * These schemas define the contract between frontend and backend for category data.
 */

// Validation limits
const VALIDATION_LIMITS = {
  name: { min: 1, max: 50 },
} as const;

// Base category name validation
const categoryNameSchema = z.string()
  .min(VALIDATION_LIMITS.name.min, `Category name must be at least ${VALIDATION_LIMITS.name.min} character`)
  .max(VALIDATION_LIMITS.name.max, `Category name must be less than ${VALIDATION_LIMITS.name.max} characters`)
  .trim()
  .refine(
    (name) => name.length > 0 && !/^\s*$/.test(name),
    "Category name can't be empty."
  );

// API request schemas
export const categoryCreateSchema = z.object({
  name: categoryNameSchema,
});

export const categoryUpdateSchema = z.object({
  name: categoryNameSchema,
});

// API response schemas
export const categoryEntitySchema = z.object({
  id: z.string().uuid('Invalid category ID format'),
  // Clerk user ids are not UUIDs (typically "user_..."), so treat as opaque string.
  userId: z.string().min(1, 'User ID is required'),
  name: categoryNameSchema,
  // Handle various datetime formats from Supabase (ISO strings, timestamps, etc.)
  createdAt: z.string().datetime({ offset: true }).or(z.string().transform(s => new Date(s).toISOString())),
  updatedAt: z.string().datetime({ offset: true }).or(z.string().transform(s => new Date(s).toISOString())),
});

export const categoryListSchema = z.array(categoryEntitySchema);

// Type exports for convenience
export type CategoryCreate = z.infer<typeof categoryCreateSchema>;
export type CategoryUpdate = z.infer<typeof categoryUpdateSchema>;
export type CategoryEntity = z.infer<typeof categoryEntitySchema>;
export type CategoryError = {
  error: string;
  code: string;
  details?: unknown;
};

// Error codes that can be returned by the categories API
export const CATEGORY_ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  DUPLICATE_ENTRY: 'DUPLICATE_ENTRY',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  AUTH_EXPIRED: 'AUTH_EXPIRED',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
} as const;
