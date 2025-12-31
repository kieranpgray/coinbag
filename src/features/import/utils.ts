/**
 * Utility functions for import feature
 */

import type { SubscriptionFrequency, Asset, Liability, Income } from '@/types/domain';

// Valid enum values extracted from contracts for normalization
// These should match the contract schemas exactly
const VALID_FREQUENCIES: SubscriptionFrequency[] = ['weekly', 'fortnightly', 'monthly', 'quarterly', 'yearly'];
const VALID_ASSET_TYPES: Asset['type'][] = ['Real Estate', 'Investments', 'Vehicles', 'Crypto', 'Cash', 'Superannuation', 'Other'];
const VALID_LIABILITY_TYPES: Liability['type'][] = ['Loans', 'Credit Cards', 'Other'];
const VALID_INCOME_SOURCES: Income['source'][] = ['Salary', 'Freelance', 'Business', 'Investments', 'Rental', 'Other'];

/**
 * Parse date string in various formats to YYYY-MM-DD
 * Handles Excel date formats, common variations, and provides better error handling
 */
export function parseDate(dateStr: string | number | Date): string | null {
  if (!dateStr) {
    return null;
  }

  // Handle Excel serial dates
  if (typeof dateStr === 'number') {
    // Excel serial date (days since 1900-01-01)
    // Excel incorrectly treats 1900 as a leap year, so we need to account for that
    const excelEpoch = new Date(1900, 0, 1);
    excelEpoch.setDate(excelEpoch.getDate() + dateStr - 2); // -2 because Excel counts 1900-01-01 as day 1
    return formatDate(excelEpoch);
  }

  // Handle Date objects
  if (dateStr instanceof Date) {
    if (isNaN(dateStr.getTime())) {
      return null;
    }
    return formatDate(dateStr);
  }

  // Handle string dates
  let str = String(dateStr).trim();
  
  if (!str || str.length === 0) {
    return null;
  }

  // Normalize dash-like characters (em dash —, en dash –, hyphen-minus -) to regular hyphen
  // This handles cases like "2025-12–15" (with em dash) or "2025-12–15" (with en dash)
  str = str.replace(/[–—−‐‑‒―]/g, '-');

  // Try ISO format first (YYYY-MM-DD or YYYY-DD-MM) - most common and unambiguous
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    const parts = str.split('-');
    const year = parseInt(parts[0] || '0', 10);
    const firstPart = parseInt(parts[1] || '0', 10);
    const secondPart = parseInt(parts[2] || '0', 10);
    
    // Check if it's yyyy-mm-dd or yyyy-dd-mm format
    // If first part > 12, it's likely yyyy-dd-mm (year-day-month)
    if (firstPart > 12 && secondPart <= 12) {
      // yyyy-dd-mm format: 2025-15-12 means December 15, 2025
      const day = firstPart;
      const month = secondPart;
      if (day <= 31 && month <= 12) {
        const date = new Date(year, month - 1, day);
        if (!isNaN(date.getTime()) && date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day) {
          return formatDate(date);
        }
      }
    } else {
      // yyyy-mm-dd format (standard ISO)
      const month = firstPart;
      const day = secondPart;
      const date = new Date(str + 'T00:00:00'); // Add time to avoid timezone issues
      if (!isNaN(date.getTime())) {
        // Validate the date parts match (prevents invalid dates like 2024-13-45)
        if (date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day) {
          return formatDate(date);
        }
      }
    }
  }

  // Try YYYY/MM/DD format
  const yyyymmdd = /^(\d{4})\/(\d{1,2})\/(\d{1,2})$/.exec(str);
  if (yyyymmdd && yyyymmdd[1] && yyyymmdd[2] && yyyymmdd[3]) {
    const year = parseInt(yyyymmdd[1], 10);
    const month = parseInt(yyyymmdd[2], 10);
    const day = parseInt(yyyymmdd[3], 10);
    const date = new Date(year, month - 1, day);
    if (!isNaN(date.getTime()) && date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day) {
      return formatDate(date);
    }
  }

  // Try MM/DD/YYYY (US format)
  const mmddyyyy = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(str);
  if (mmddyyyy && mmddyyyy[1] && mmddyyyy[2] && mmddyyyy[3]) {
    const month = parseInt(mmddyyyy[1], 10);
    const day = parseInt(mmddyyyy[2], 10);
    const year = parseInt(mmddyyyy[3], 10);
    // Heuristic: if month > 12, it's likely DD/MM/YYYY format
    if (month <= 12) {
      const date = new Date(year, month - 1, day);
      if (!isNaN(date.getTime()) && date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day) {
        return formatDate(date);
      }
    }
  }

  // Try DD/MM/YYYY (European format)
  const ddmmyyyy = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(str);
  if (ddmmyyyy && ddmmyyyy[1] && ddmmyyyy[2] && ddmmyyyy[3]) {
    const day = parseInt(ddmmyyyy[1], 10);
    const month = parseInt(ddmmyyyy[2], 10);
    const year = parseInt(ddmmyyyy[3], 10);
    // Heuristic: if first part > 12, it's likely DD/MM/YYYY
    if (day <= 31 && month <= 12) {
      const date = new Date(year, month - 1, day);
      if (!isNaN(date.getTime()) && date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day) {
        return formatDate(date);
      }
    }
  }

  // Try DD-MM-YYYY format
  const ddmmyyyyDash = /^(\d{1,2})-(\d{1,2})-(\d{4})$/.exec(str);
  if (ddmmyyyyDash && ddmmyyyyDash[1] && ddmmyyyyDash[2] && ddmmyyyyDash[3]) {
    const day = parseInt(ddmmyyyyDash[1], 10);
    const month = parseInt(ddmmyyyyDash[2], 10);
    const year = parseInt(ddmmyyyyDash[3], 10);
    if (day <= 31 && month <= 12) {
      const date = new Date(year, month - 1, day);
      if (!isNaN(date.getTime()) && date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day) {
        return formatDate(date);
      }
    }
  }

  // Try MM-DD-YYYY format
  const mmddyyyyDash = /^(\d{1,2})-(\d{1,2})-(\d{4})$/.exec(str);
  if (mmddyyyyDash && mmddyyyyDash[1] && mmddyyyyDash[2] && mmddyyyyDash[3]) {
    const month = parseInt(mmddyyyyDash[1], 10);
    const day = parseInt(mmddyyyyDash[2], 10);
    const year = parseInt(mmddyyyyDash[3], 10);
    if (month <= 12) {
      const date = new Date(year, month - 1, day);
      if (!isNaN(date.getTime()) && date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day) {
        return formatDate(date);
      }
    }
  }

  // Try Excel date formats like "15-Dec-2025" or "Dec 15, 2025"
  // First try "DD-MMM-YYYY" or "DD MMM YYYY"
  const ddmmyyyyText = /^(\d{1,2})[\s-]([A-Za-z]{3,})[\s-](\d{4})$/.exec(str);
  if (ddmmyyyyText && ddmmyyyyText[1] && ddmmyyyyText[2] && ddmmyyyyText[3]) {
    const day = parseInt(ddmmyyyyText[1], 10);
    const monthName = ddmmyyyyText[2].toLowerCase();
    const year = parseInt(ddmmyyyyText[3], 10);
    const month = parseMonthName(monthName);
    if (month !== null && day <= 31) {
      const date = new Date(year, month, day);
      if (!isNaN(date.getTime()) && date.getFullYear() === year && date.getMonth() === month && date.getDate() === day) {
        return formatDate(date);
      }
    }
  }

  // Try "MMM DD, YYYY" format (e.g., "Dec 15, 2025")
  const mmmddyyyy = /^([A-Za-z]{3,})\s+(\d{1,2}),?\s+(\d{4})$/.exec(str);
  if (mmmddyyyy && mmmddyyyy[1] && mmmddyyyy[2] && mmmddyyyy[3]) {
    const monthName = mmmddyyyy[1].toLowerCase();
    const day = parseInt(mmmddyyyy[2], 10);
    const year = parseInt(mmmddyyyy[3], 10);
    const month = parseMonthName(monthName);
    if (month !== null && day <= 31) {
      const date = new Date(year, month, day);
      if (!isNaN(date.getTime()) && date.getFullYear() === year && date.getMonth() === month && date.getDate() === day) {
        return formatDate(date);
      }
    }
  }

  // Try general date parsing as last resort
  const date = new Date(str);
  if (!isNaN(date.getTime())) {
    // Validate it's a reasonable date (not epoch, not far future)
    const year = date.getFullYear();
    if (year >= 1900 && year <= 2100) {
      return formatDate(date);
    }
  }

  return null;
}

/**
 * Parse month name to month index (0-11)
 */
function parseMonthName(monthName: string): number | null {
  const months: Record<string, number> = {
    'january': 0, 'jan': 0,
    'february': 1, 'feb': 1,
    'march': 2, 'mar': 2,
    'april': 3, 'apr': 3,
    'may': 4,
    'june': 5, 'jun': 5,
    'july': 6, 'jul': 6,
    'august': 7, 'aug': 7,
    'september': 8, 'sep': 8, 'sept': 8,
    'october': 9, 'oct': 9,
    'november': 10, 'nov': 10,
    'december': 11, 'dec': 11,
  };
  
  return months[monthName.toLowerCase()] ?? null;
}

/**
 * Format date to YYYY-MM-DD
 */
function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Normalize string value (trim, handle empty strings, detect Excel errors)
 */
export function normalizeString(value: unknown): string | undefined {
  if (value === null || value === undefined) {
    return undefined;
  }

  const str = String(value).trim();
  
  // Check for Excel error values - return as-is so validation can catch it
  if (isExcelError(str)) {
    return str; // Return error string so validation can report it
  }

  return str.length > 0 ? str : undefined;
}

/**
 * Check if a value is an Excel error value
 */
function isExcelError(value: unknown): boolean {
  if (typeof value !== 'string') {
    return false;
  }
  const str = value.trim();
  return /^#[A-Z]+!?$/.test(str) || str.startsWith('#');
}

/**
 * Normalize number value
 * Handles Excel error values (#VALUE!, #REF!, etc.) and invalid numbers
 */
export function normalizeNumber(value: unknown): number | undefined {
  if (value === null || value === undefined || value === '') {
    return undefined;
  }

  // Check for Excel error values
  if (isExcelError(value)) {
    return undefined; // Return undefined for error values, validation will catch it
  }

  const num = typeof value === 'number' ? value : parseFloat(String(value));
  return isNaN(num) ? undefined : num;
}

/**
 * Normalize boolean value
 */
export function normalizeBoolean(value: unknown): boolean | undefined {
  if (value === null || value === undefined || value === '') {
    return undefined;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  const str = String(value).toLowerCase().trim();
  if (str === 'true' || str === '1' || str === 'yes') {
    return true;
  }
  if (str === 'false' || str === '0' || str === 'no') {
    return false;
  }

  return undefined;
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) {
    return '0 Bytes';
  }

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * Estimate import time based on row count
 */
export function estimateImportTime(rowCount: number): number {
  // Rough estimate: ~100ms per row
  return Math.max(5, Math.ceil(rowCount * 0.1));
}

/**
 * Normalize frequency value to valid enum
 * Handles case variations, abbreviations, typos, and shorter variants
 */
export function normalizeFrequency(value: string | undefined): SubscriptionFrequency | null {
  if (!value) return null;
  
  const normalized = value.toLowerCase().trim();
  
  // Direct matches (case-insensitive)
  if (VALID_FREQUENCIES.includes(normalized as SubscriptionFrequency)) {
    return normalized as SubscriptionFrequency;
  }
  
  // Shorter variants and abbreviations
  const variants: Record<string, SubscriptionFrequency> = {
    'week': 'weekly',
    'wk': 'weekly',
    'w': 'weekly',
    'fortnight': 'fortnightly',
    'bi-weekly': 'fortnightly',
    'biweekly': 'fortnightly',
    'bi-wk': 'fortnightly',
    'biwk': 'fortnightly',
    'bi weekly': 'fortnightly',
    'month': 'monthly',
    'mo': 'monthly',
    'm': 'monthly',
    'quarterly': 'quarterly',
    'quarter': 'quarterly',
    'q': 'quarterly',
    'qtr': 'quarterly',
    'qtrly': 'quarterly',
    'year': 'yearly',
    'yr': 'yearly',
    'y': 'yearly',
    'annual': 'yearly',
    'annually': 'yearly',
  };
  
  // Common typos
  const typos: Record<string, SubscriptionFrequency> = {
    'montly': 'monthly',
    'montlh': 'monthly',
    'monthl': 'monthly',
    'yearl': 'yearly',
    'yearlly': 'yearly',
    'weekl': 'weekly',
    'weeklly': 'weekly',
  };
  
  return variants[normalized] || typos[normalized] || null;
}

/**
 * Normalize asset type value to valid enum
 * Handles case-insensitive matching and common variations
 */
export function normalizeAssetType(value: string | undefined): Asset['type'] | null {
  if (!value) return null;
  
  const normalized = value.trim();
  const lower = normalized.toLowerCase();
  
  // Exact case-sensitive match first (most common)
  if (VALID_ASSET_TYPES.includes(normalized as Asset['type'])) {
    return normalized as Asset['type'];
  }
  
  // Case-insensitive matching with variations
  const typeMap: Record<string, Asset['type']> = {
    'real estate': 'Real Estate',
    'realestate': 'Real Estate',
    're': 'Real Estate',
    'property': 'Real Estate',
    'properties': 'Real Estate',
    'investments': 'Investments',
    'investment': 'Investments',
    'inv': 'Investments',
    'invest': 'Investments',
    'vehicles': 'Vehicles',
    'vehicle': 'Vehicles',
    'car': 'Vehicles',
    'cars': 'Vehicles',
    'auto': 'Vehicles',
    'automobile': 'Vehicles',
    'crypto': 'Crypto',
    'cryptocurrency': 'Crypto',
    'cryptocurrencies': 'Crypto',
    'cryptos': 'Crypto',
    'cash': 'Cash',
    'superannuation': 'Superannuation',
    'super': 'Superannuation',
    'superann': 'Superannuation',
    'superannuation fund': 'Superannuation',
    'super fund': 'Superannuation',
    'other': 'Other',
    'others': 'Other',
    'misc': 'Other',
    'miscellaneous': 'Other',
  };
  
  return typeMap[lower] || null;
}

/**
 * Normalize liability type value to valid enum
 * Handles case-insensitive matching and common variations
 */
export function normalizeLiabilityType(value: string | undefined): Liability['type'] | null {
  if (!value) return null;
  
  const normalized = value.trim();
  const lower = normalized.toLowerCase();
  
  // Exact case-sensitive match first (most common)
  if (VALID_LIABILITY_TYPES.includes(normalized as Liability['type'])) {
    return normalized as Liability['type'];
  }
  
  // Case-insensitive matching with variations
  const typeMap: Record<string, Liability['type']> = {
    'loans': 'Loans',
    'loan': 'Loans',
    'credit cards': 'Credit Cards',
    'credit card': 'Credit Cards',
    'creditcard': 'Credit Cards',
    'creditcards': 'Credit Cards',
    'cc': 'Credit Cards',
    'card': 'Credit Cards',
    'cards': 'Credit Cards',
    'other': 'Other',
    'others': 'Other',
    'misc': 'Other',
    'miscellaneous': 'Other',
  };
  
  return typeMap[lower] || null;
}

/**
 * Normalize income source value to valid enum
 * Handles case-insensitive matching and common variations
 */
export function normalizeIncomeSource(value: string | undefined): Income['source'] | null {
  if (!value) return null;
  
  const normalized = value.trim();
  const lower = normalized.toLowerCase();
  
  // Exact case-sensitive match first (most common)
  if (VALID_INCOME_SOURCES.includes(normalized as Income['source'])) {
    return normalized as Income['source'];
  }
  
  // Case-insensitive matching with variations
  const sourceMap: Record<string, Income['source']> = {
    'salary': 'Salary',
    'salaries': 'Salary',
    'wage': 'Salary',
    'wages': 'Salary',
    'pay': 'Salary',
    'freelance': 'Freelance',
    'freelancing': 'Freelance',
    'contractor': 'Freelance',
    'contracting': 'Freelance',
    'business': 'Business',
    'business income': 'Business',
    'self-employed': 'Business',
    'self employed': 'Business',
    'investments': 'Investments',
    'investment': 'Investments',
    'investment income': 'Investments',
    'dividends': 'Investments',
    'rental': 'Rental',
    'rent': 'Rental',
    'rental income': 'Rental',
    'rental property': 'Rental',
    'other': 'Other',
    'others': 'Other',
    'misc': 'Other',
    'miscellaneous': 'Other',
  };
  
  return sourceMap[lower] || null;
}

