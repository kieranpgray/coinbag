import { z } from 'zod';
import { SUPPORTED_EXCHANGES } from '@/constants/exchanges';
import { SUPPORTED_CRYPTO_SYMBOLS } from '@/constants/cryptoSymbols';

/**
 * Asset contracts - Zod-first schemas for type-safe API communication
 * These schemas define the contract between frontend and backend for asset data.
 */

// Validation limits
const VALIDATION_LIMITS = {
  name: { min: 1, max: 100 },
  institution: { max: 100 },
  notes: { max: 1000 },
  ticker: { max: 20 },
  address: { max: 200 },
  propertyType: { max: 100 },
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

// Asset type enum (Investments renamed to Other Investments; Other removed)
const assetTypeSchema = z.enum(['Real Estate', 'Other Investments', 'Vehicles', 'Crypto', 'Cash', 'Superannuation', 'Stock', 'RSU'], {
  errorMap: () => ({ message: 'Invalid asset type' }),
});

// Stock/RSU optional field schemas (used in create/update with conditional requirement via superRefine)
const tickerSchema = z.string()
  .max(VALIDATION_LIMITS.ticker.max, `Ticker must be at most ${VALIDATION_LIMITS.ticker.max} characters`)
  .trim()
  .optional()
  .or(z.literal(''));

const exchangeSchema = z.string()
  .trim()
  .refine(
    (val) => val === '' || SUPPORTED_EXCHANGES.includes(val as (typeof SUPPORTED_EXCHANGES)[number]),
    'Exchange must be from the supported list'
  )
  .optional()
  .or(z.literal(''))
  .transform((val) => (val === '' ? undefined : val));

const quantitySchema = z.number()
  .positive('Quantity must be positive')
  .finite('Quantity must be finite')
  .optional();

const purchasePriceSchema = z.number()
  .min(0, 'Purchase price must be non-negative')
  .finite('Purchase price must be finite')
  .optional();

const todaysPriceSchema = z.number()
  .min(0, "Today's price must be non-negative")
  .finite("Today's price must be finite")
  .optional();

const grantPriceSchema = z.number()
  .min(0, 'Grant price must be non-negative')
  .finite('Grant price must be finite')
  .optional();

// Address (Real Estate), max 200 chars
const addressSchema = z.string()
  .max(VALIDATION_LIMITS.address.max, `Address must be at most ${VALIDATION_LIMITS.address.max} characters`)
  .trim()
  .optional()
  .or(z.literal(''))
  .transform((val) => (val === '' ? undefined : val));

// Property type (Real Estate), max 100 chars
const propertyTypeSchema = z.string()
  .max(VALIDATION_LIMITS.propertyType.max, `Property type must be at most ${VALIDATION_LIMITS.propertyType.max} characters`)
  .trim()
  .optional()
  .or(z.literal(''))
  .transform((val) => (val === '' ? undefined : val));

// Optional date (YYYY-MM-DD) for purchase_date, grant_date, vesting_date
const optionalDateSchema = z.preprocess(
  (val) => {
    if (val === undefined || val === null || val === '') return undefined;
    const str = String(val);
    if (str.includes('T')) return str.split('T')[0];
    return str;
  },
  z.string()
    .refine((date) => /^\d{4}-\d{2}-\d{2}$/.test(date), 'Date must be in YYYY-MM-DD format')
    .optional()
);

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

// Base create shape: name optional at schema level (conditional requirement in superRefine)
const assetCreateBaseSchema = z.object({
  name: z.string()
    .max(VALIDATION_LIMITS.name.max, `Asset name must be less than ${VALIDATION_LIMITS.name.max} characters`)
    .trim()
    .optional()
    .or(z.literal('')),
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
  address: addressSchema,
  propertyType: propertyTypeSchema,
  // Stock/RSU optional fields
  ticker: tickerSchema,
  exchange: exchangeSchema,
  quantity: quantitySchema,
  purchasePrice: purchasePriceSchema,
  purchaseDate: optionalDateSchema,
  todaysPrice: todaysPriceSchema,
  grantDate: optionalDateSchema,
  vestingDate: optionalDateSchema,
  grantPrice: grantPriceSchema,
});

export const assetCreateSchema = assetCreateBaseSchema.superRefine((data, ctx) => {
  const nameVal = data.name === undefined || data.name === '' ? undefined : data.name?.trim();
  if (data.type === 'Stock' || data.type === 'RSU') {
    // Stock/RSU: ticker and quantity required; name optional (can be derived from ticker)
    const tickerVal = data.ticker === undefined || data.ticker === '' ? undefined : data.ticker?.trim();
    if (!tickerVal || tickerVal.length === 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Ticker is required for Stock and RSU', path: ['ticker'] });
    }
    if (data.quantity === undefined || data.quantity === null || data.quantity <= 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Quantity is required and must be positive', path: ['quantity'] });
    }
    // RSU: vesting date optional per spec
  } else if (data.type === 'Crypto') {
    // Crypto: ticker (coin symbol), quantity, and value required; name optional
    const tickerVal = data.ticker === undefined || data.ticker === '' ? undefined : data.ticker?.trim();
    if (!tickerVal || tickerVal.length === 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Coin symbol is required for Crypto', path: ['ticker'] });
    } else if (!SUPPORTED_CRYPTO_SYMBOLS.includes(tickerVal as (typeof SUPPORTED_CRYPTO_SYMBOLS)[number])) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Coin symbol must be from the supported list', path: ['ticker'] });
    }
    if (data.quantity === undefined || data.quantity === null || data.quantity <= 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Quantity is required and must be positive for Crypto', path: ['quantity'] });
    }
  } else {
    // Other types: name required
    if (!nameVal || nameVal.length === 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Asset name can't be empty.", path: ['name'] });
    }
  }
});

export const assetUpdateSchema = z.object({
  name: z.string()
    .max(VALIDATION_LIMITS.name.max)
    .trim()
    .optional()
    .or(z.literal('')),
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
  ticker: tickerSchema,
  exchange: exchangeSchema,
  quantity: quantitySchema,
  purchasePrice: purchasePriceSchema,
  purchaseDate: optionalDateSchema,
  todaysPrice: todaysPriceSchema,
  grantDate: optionalDateSchema,
  vestingDate: optionalDateSchema,
  grantPrice: grantPriceSchema,
  address: addressSchema,
  propertyType: propertyTypeSchema,
}).superRefine((data, ctx) => {
  // On update, only apply Stock/RSU rules when type is explicitly provided as Stock or RSU
  if (data.type === 'Stock') {
    const tickerVal = data.ticker === undefined || data.ticker === '' ? undefined : data.ticker?.trim();
    if (!tickerVal || tickerVal.length === 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Ticker is required for Stock', path: ['ticker'] });
    }
    if (data.quantity !== undefined && (data.quantity === null || data.quantity <= 0)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Quantity must be positive', path: ['quantity'] });
    }
  }
  if (data.type === 'RSU') {
    const tickerVal = data.ticker === undefined || data.ticker === '' ? undefined : data.ticker?.trim();
    if (!tickerVal || tickerVal.length === 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Ticker is required for RSU', path: ['ticker'] });
    }
    if (data.quantity !== undefined && (data.quantity === null || data.quantity <= 0)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Quantity must be positive', path: ['quantity'] });
    }
    // RSU vesting date optional per spec
  }
  if (data.type === 'Crypto') {
    const tickerVal = data.ticker === undefined || data.ticker === '' ? undefined : data.ticker?.trim();
    if (tickerVal !== undefined && tickerVal.length > 0 && !SUPPORTED_CRYPTO_SYMBOLS.includes(tickerVal as (typeof SUPPORTED_CRYPTO_SYMBOLS)[number])) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Coin symbol must be from the supported list', path: ['ticker'] });
    }
    if (data.quantity !== undefined && (data.quantity === null || data.quantity <= 0)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Quantity must be positive for Crypto', path: ['quantity'] });
    }
  }
  // For other types on update, name if provided must be non-empty
  if (data.name !== undefined && data.name !== '' && data.type !== 'Stock' && data.type !== 'RSU' && data.type !== 'Crypto') {
    const trimmed = data.name.trim();
    if (trimmed.length === 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Asset name can't be empty.", path: ['name'] });
    }
  }
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

// API response schemas (entity includes optional Stock/RSU columns from DB)
export const assetEntitySchema = z.object({
  id: z.string().uuid('Invalid asset ID format'),
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
  // Stock/RSU optional (nullable from DB)
  ticker: nullableStringSchema,
  exchange: nullableStringSchema,
  quantity: z.number().finite().nullable().optional().transform((v) => v ?? undefined),
  purchasePrice: z.number().finite().nullable().optional().transform((v) => v ?? undefined),
  purchaseDate: nullableStringSchema,
  todaysPrice: z.number().finite().nullable().optional().transform((v) => v ?? undefined),
  grantDate: nullableStringSchema,
  vestingDate: nullableStringSchema,
  grantPrice: z.number().finite().nullable().optional().transform((v) => v ?? undefined),
  address: nullableStringSchema,
  propertyType: nullableStringSchema,
  lastPriceFetchedAt: z.string().nullable().optional().transform((v) => v ?? undefined),
  priceSource: nullableStringSchema,
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


// Optional date string (YYYY-MM-DD) for valueAsAtDate
const optionalDateStringSchema = z.string()
  .nullable()
  .optional()
  .transform((v) => v === null ? undefined : v);

// Asset value history schemas
export const assetValueHistorySchema = z.object({
  id: z.string().uuid('Invalid asset value history ID format'),
  assetId: z.string().uuid('Invalid asset ID format'),
  previousValue: z.number().nullable(),
  newValue: assetValueSchema,
  changeAmount: z.number(),
  createdAt: datetimeSchema,
  valueAsAtDate: optionalDateStringSchema,
});

export const assetValueHistoryListSchema = z.array(assetValueHistorySchema);

// Type exports for asset value history
export type AssetValueHistory = z.infer<typeof assetValueHistorySchema>;
