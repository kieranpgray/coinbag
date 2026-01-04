import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { formatDistance } from 'date-fns';
import { enUS, enAU } from 'date-fns/locale';
import {
  getLocaleConfig,
  DEFAULT_LOCALE,
} from './localeRegistry';

/**
 * Utility function to merge Tailwind CSS classes
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Get date-fns locale object for a given locale code
 */
function getDateFnsLocale(locale: string) {
  switch (locale) {
    case 'en-AU':
      return enAU;
    case 'en-US':
    default:
      return enUS;
  }
}

/**
 * Format a number as currency
 * 
 * @param value - Number to format
 * @param locale - Locale code (e.g., 'en-US', 'en-AU'). If not provided, uses 'en-US' as default.
 * @returns Formatted currency string (e.g., "$1,000" or "A$1,000")
 */
export function formatCurrency(value: number, locale: string = DEFAULT_LOCALE): string {
  const config = getLocaleConfig(locale) || getLocaleConfig(DEFAULT_LOCALE)!;
  
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: config.currency.code,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Format a plain number (not currency) with locale-specific separators
 * 
 * @param value - Number to format
 * @param locale - Locale code (e.g., 'en-US', 'en-AU'). If not provided, uses 'en-US' as default.
 * @param options - Additional Intl.NumberFormat options
 * @returns Formatted number string (e.g., "1,000.50")
 */
export function formatNumber(
  value: number,
  locale: string = DEFAULT_LOCALE,
  options?: Intl.NumberFormatOptions
): string {
  return new Intl.NumberFormat(locale, {
    ...options,
    minimumFractionDigits: options?.minimumFractionDigits ?? 0,
    maximumFractionDigits: options?.maximumFractionDigits ?? 2,
  }).format(value);
}

/**
 * Format a date as a readable string
 * 
 * @param date - Date to format (string or Date object)
 * @param locale - Locale code (e.g., 'en-US', 'en-AU'). If not provided, uses 'en-US' as default.
 * @param format - Format style ('short' | 'long' | 'medium'). Defaults to 'medium'.
 * @returns Formatted date string (e.g., "Jan 15, 2025" or "15 Jan 2025")
 */
export function formatDate(
  date: string | Date,
  locale: string = DEFAULT_LOCALE,
  format: 'short' | 'long' | 'medium' = 'medium'
): string {
  const d = typeof date === 'string' ? new Date(date) : date;

  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: format === 'short' ? 'numeric' : 'short',
    day: 'numeric',
  };
  
  if (format === 'long') {
    options.month = 'long';
  }
  
  return new Intl.DateTimeFormat(locale, options).format(d);
}

/**
 * Format a relative date (e.g., "2 days ago", "in 3 weeks")
 * 
 * @param date - Date to format (string or Date object)
 * @param locale - Locale code (e.g., 'en-US', 'en-AU'). If not provided, uses 'en-US' as default.
 * @returns Formatted relative date string
 */
export function formatRelativeDate(date: string | Date, locale: string = DEFAULT_LOCALE): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const dateFnsLocale = getDateFnsLocale(locale);
  
  return formatDistance(d, new Date(), {
    addSuffix: true,
    locale: dateFnsLocale,
  });
}

/**
 * Get currency code for a locale
 * 
 * @param locale - Locale code (e.g., 'en-US', 'en-AU')
 * @returns Currency code (e.g., 'USD', 'AUD')
 */
export function getCurrencyCode(locale: string): string {
  const config = getLocaleConfig(locale) || getLocaleConfig(DEFAULT_LOCALE)!;
  return config.currency.code;
}

/**
 * Get currency symbol for a locale
 * 
 * @param locale - Locale code (e.g., 'en-US', 'en-AU')
 * @returns Currency symbol (e.g., '$', 'A$')
 */
export function getCurrencySymbol(locale: string): string {
  const config = getLocaleConfig(locale) || getLocaleConfig(DEFAULT_LOCALE)!;
  return config.currency.symbol;
}

/**
 * Get date format string for a locale (for date picker input format)
 * 
 * @param locale - Locale code (e.g., 'en-US', 'en-AU')
 * @returns Date format string (e.g., 'MM/dd/yyyy', 'dd/MM/yyyy')
 */
export function getDateFormat(locale: string): string {
  const config = getLocaleConfig(locale) || getLocaleConfig(DEFAULT_LOCALE)!;
  return config.date.format;
}

/**
 * Get week start day for a locale
 * 
 * @param locale - Locale code (e.g., 'en-US', 'en-AU')
 * @returns Week start day (0 = Sunday, 1 = Monday)
 */
export function getWeekStartDay(locale: string): 0 | 1 {
  const config = getLocaleConfig(locale) || getLocaleConfig(DEFAULT_LOCALE)!;
  return config.date.weekStartDay;
}

/**
 * Format a number as percentage
 */
export function formatPercentage(value: number, decimals = 1): string {
  const formatted = value.toFixed(decimals);
  return `${value >= 0 ? '+' : ''}${formatted}%`;
}

/**
 * Calculate percentage change
 */
export function calculatePercentageChange(oldValue: number, newValue: number): number {
  if (oldValue === 0) return 0;
  return ((newValue - oldValue) / oldValue) * 100;
}

