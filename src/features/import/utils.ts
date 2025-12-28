/**
 * Utility functions for import feature
 */

/**
 * Parse date string in various formats to YYYY-MM-DD
 */
export function parseDate(dateStr: string | number | Date): string | null {
  if (!dateStr) {
    return null;
  }

  // Handle Excel serial dates
  if (typeof dateStr === 'number') {
    // Excel serial date (days since 1900-01-01)
    const excelEpoch = new Date(1900, 0, 1);
    excelEpoch.setDate(excelEpoch.getDate() + dateStr - 2); // -2 because Excel counts 1900-01-01 as day 1
    return formatDate(excelEpoch);
  }

  // Handle Date objects
  if (dateStr instanceof Date) {
    return formatDate(dateStr);
  }

  // Handle string dates
  const str = String(dateStr).trim();

  // Try ISO format first (YYYY-MM-DD)
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    const date = new Date(str);
    if (!isNaN(date.getTime())) {
      return formatDate(date);
    }
  }

  // Try MM/DD/YYYY
  const mmddyyyy = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(str);
  if (mmddyyyy) {
    const [, month, day, year] = mmddyyyy;
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    if (!isNaN(date.getTime())) {
      return formatDate(date);
    }
  }

  // Try DD/MM/YYYY
  const ddmmyyyy = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(str);
  if (ddmmyyyy) {
    const [, day, month, year] = ddmmyyyy;
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    if (!isNaN(date.getTime())) {
      return formatDate(date);
    }
  }

  // Try general date parsing
  const date = new Date(str);
  if (!isNaN(date.getTime())) {
    return formatDate(date);
  }

  return null;
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

