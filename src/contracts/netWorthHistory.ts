import { z } from 'zod';

/**
 * Net Worth History contracts - Zod-first schemas for type-safe API communication
 * These schemas define the contract between frontend and backend for net worth history data.
 */

// Date validation (ISO date string in YYYY-MM-DD format)
const dateSchema = z.string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
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
    'Date must be a valid date'
  );

// Numeric validation (matches database numeric(10,2) precision)
const numericSchema = z.number()
  .finite('Value must be a finite number')
  .refine(
    (val) => {
      // Ensure value doesn't have more than 2 decimal places
      const decimalPlaces = (val.toString().split('.')[1] || '').length;
      return decimalPlaces <= 2;
    },
    'Value cannot have more than 2 decimal places'
  )
  .refine(
    (val) => {
      // numeric(10,2) means max value of 99999999.99
      return Math.abs(val) <= 99999999.99;
    },
    'Value exceeds maximum allowed (99,999,999.99)'
  );

// Entity schema (database row)
export const netWorthHistoryEntitySchema = z.object({
  id: z.string().uuid('ID must be a valid UUID'),
  user_id: z.string().min(1, 'User ID is required'),
  date: dateSchema,
  net_worth: numericSchema,
  total_assets: numericSchema,
  total_liabilities: numericSchema,
  created_at: z.string().datetime('Created at must be a valid ISO datetime string'),
  updated_at: z.string().datetime('Updated at must be a valid ISO datetime string'),
});

// List schema (array of entities)
export const netWorthHistoryListSchema = z.array(netWorthHistoryEntitySchema);

// Create/Update schema
export const netWorthHistoryCreateSchema = z.object({
  date: dateSchema,
  net_worth: numericSchema,
  total_assets: numericSchema,
  total_liabilities: numericSchema,
});

// Error codes
export const NET_WORTH_HISTORY_ERROR_CODES = {
  NOT_FOUND: 'NET_WORTH_HISTORY_NOT_FOUND',
  INVALID_DATE: 'NET_WORTH_HISTORY_INVALID_DATE',
  DUPLICATE_DATE: 'NET_WORTH_HISTORY_DUPLICATE_DATE',
  INVALID_VALUE: 'NET_WORTH_HISTORY_INVALID_VALUE',
} as const;
