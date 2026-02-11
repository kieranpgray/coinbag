import { z } from 'zod';

/**
 * Asset contracts - Zod-first schemas for type-safe API communication
 * These schemas define the contract between frontend and backend for asset data.
 */

// Validation limits
const VALIDATION_LIMITS = {
  name: { min: 1, max: 100 },
  institution: { max: 100 },
  notes: { max: 1000 },
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

// Asset type enum
const assetTypeSchema = z.enum(['Real Estate', 'Investments', 'Vehicles', 'Crypto', 'Cash', 'Superannuation', 'Other'], {
  errorMap: () => ({ message: 'Invalid asset type' }),
});

// Base asset name validation
const assetNameSchema = z.string()
  .min(VALIDATION_LIMITS.name.min, `Asset name must be at least ${VALIDATION_LIMITS.name.min} character`)
  .max(VALIDATION_LIMITS.name.max, `Asset name must be less than ${VALIDATION_LIMITS.name.max} characters`)
  .trim()
  .refine(
    (name) => name.length > 0 && !/^\s*$/.test(name),
    "Asset name can't be empty."
  );

// Value validation (must be positive and within database precision limits)
// numeric(10,2) means max value of 99999999.99
const assetValueSchema = z.number()
  .min(0, 'Asset value must be positive')
  .max(99999999.99, 'Asset value exceeds maximum allowed (99,999,999.99)')
  .finite('Asset value must be a finite number')
  .refine(
    (val) => {
      // Ensure value doesn't have more than 2 decimal places
      const decimalPlaces = (val.toString().split('.')[1] || '').length;
      return decimalPlaces <= 2;
    },
    'Asset value cannot have more than 2 decimal places'
  );

// Date validation (ISO date string in YYYY-MM-DD format)
// Handles both YYYY-MM-DD format and ISO datetime strings (extracts date part)
const dateAddedSchema = z.preprocess(
  (val) => {
    if (val === undefined || val === null) {
      return new Date().toISOString().split('T')[0];
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
        // Ensure the date string matches the parsed date (prevents invalid dates like 2024-13-45)
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
);

// Optional change percentage validation
// Handles both null (from database) and undefined (from API requests)
const changePercentageSchema = z.number()
  .finite('Change percentage must be a finite number')
  .nullable()
  .optional()
  .transform(val => val === null ? undefined : val);

// API request schemas
export const assetCreateSchema = z.object({
  name: assetNameSchema,
  type: assetTypeSchema,
  value: assetValueSchema,
  change1D: changePercentageSchema,
  change1W: changePercentageSchema,
  dateAdded: dateAddedSchema,
  institution: institutionSchema,
  notes: z.string()
    .max(VALIDATION_LIMITS.notes.max, `Notes must be less than ${VALIDATION_LIMITS.notes.max} characters`)
    .optional()
    .or(z.literal('')),
});

export const assetUpdateSchema = z.object({
  name: assetNameSchema.optional(),
  type: assetTypeSchema.optional(),
  value: assetValueSchema.optional(),
  change1D: changePercentageSchema,
  change1W: changePercentageSchema,
  dateAdded: dateAddedSchema.optional(),
  institution: institutionSchema,
  notes: z.string()
    .max(VALIDATION_LIMITS.notes.max, `Notes must be less than ${VALIDATION_LIMITS.notes.max} characters`)
    .optional()
    .or(z.literal('')),
});

// Helper to handle nullable strings from database (transform null to undefined)
const nullableStringSchema = z.string()
  .nullable()
  .optional()
  .transform(val => val === null ? undefined : val);

// Helper to handle datetime strings from Supabase (accepts ISO datetime or timestamp)
const datetimeSchema = z.string()
  .refine(
    (val) => {
      // Accept ISO datetime strings (e.g., "2024-01-01T00:00:00.000Z")
      if (val.includes('T') && val.includes('Z')) return true;
      // Accept ISO datetime strings without Z (e.g., "2024-01-01T00:00:00")
      if (val.includes('T')) return true;
      // Accept timestamp strings
      const parsed = Date.parse(val);
      return !isNaN(parsed);
    },
    'Invalid datetime format'
  );

// API response schemas
export const assetEntitySchema = z.object({
  id: z.string().uuid('Invalid asset ID format'),
  // Clerk user ids are not UUIDs (typically "user_..."), so treat as opaque string.
  userId: z.string().min(1, 'User ID is required'),
  name: assetNameSchema,
  type: assetTypeSchema,
  value: assetValueSchema,
  change1D: changePercentageSchema,
  change1W: changePercentageSchema,
  dateAdded: dateAddedSchema,
  institution: nullableStringSchema,
  notes: nullableStringSchema,
  createdAt: datetimeSchema,
  updatedAt: datetimeSchema,
});

export const assetListSchema = z.array(assetEntitySchema);

// Type exports for convenience
export type AssetCreate = z.infer<typeof assetCreateSchema>;
export type AssetUpdate = z.infer<typeof assetUpdateSchema>;
export type AssetEntity = z.infer<typeof assetEntitySchema>;
export type AssetError = {
  error: string;
  code: string;
  details?: unknown;
};

// Error codes that can be returned by the assets API
export const ASSET_ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  DUPLICATE_ENTRY: 'DUPLICATE_ENTRY',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  AUTH_EXPIRED: 'AUTH_EXPIRED',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
} as const;


// Asset value history schemas
export const assetValueHistorySchema = z.object({
  id: z.string().uuid('Invalid asset value history ID format'),
  assetId: z.string().uuid('Invalid asset ID format'),
  previousValue: z.number().nullable(),
  newValue: assetValueSchema,
  changeAmount: z.number(),
  createdAt: datetimeSchema,
});

export const assetValueHistoryListSchema = z.array(assetValueHistorySchema);

// Type exports for asset value history
export type AssetValueHistory = z.infer<typeof assetValueHistorySchema>;
