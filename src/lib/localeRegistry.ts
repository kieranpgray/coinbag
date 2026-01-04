/**
 * Locale Registry System
 * 
 * Centralized configuration for supported locales.
 * This registry defines locale-specific metadata including:
 * - Currency codes and symbols
 * - Date formats
 * - Number formatting
 * - Week start days
 * - Country code mappings for IP detection
 * 
 * To add a new locale, simply add an entry to SUPPORTED_LOCALES.
 */

export interface LocaleConfig {
  code: string; // 'en-US', 'en-AU', etc.
  name: string; // Display name: 'English (United States)', 'English (Australia)'
  currency: {
    code: string; // 'USD', 'AUD'
    symbol: string; // '$', 'A$'
    position: 'before' | 'after'; // Currency symbol position
  };
  date: {
    format: string; // 'MM/dd/yyyy', 'dd/MM/yyyy' - for date picker input format
    displayFormat: string; // 'MMM dd, yyyy', 'dd MMM yyyy' - for display
    weekStartDay: 0 | 1; // 0 = Sunday, 1 = Monday
  };
  number: {
    decimalSeparator: string; // '.', ','
    thousandsSeparator: string; // ',', '.'
  };
  countryCodes: string[]; // ['US'], ['AU'] - ISO 3166-1 alpha-2 codes for IP detection mapping
}

/**
 * Supported locales registry
 * 
 * Add new locales here to extend support.
 * All utility functions will automatically work with new locales.
 */
export const SUPPORTED_LOCALES: Record<string, LocaleConfig> = {
  'en-US': {
    code: 'en-US',
    name: 'English (United States)',
    currency: {
      code: 'USD',
      symbol: '$',
      position: 'before',
    },
    date: {
      format: 'MM/dd/yyyy',
      displayFormat: 'MMM dd, yyyy',
      weekStartDay: 0, // Sunday
    },
    number: {
      decimalSeparator: '.',
      thousandsSeparator: ',',
    },
    countryCodes: ['US'],
  },
  'en-AU': {
    code: 'en-AU',
    name: 'English (Australia)',
    currency: {
      code: 'AUD',
      symbol: 'A$',
      position: 'before',
    },
    date: {
      format: 'dd/MM/yyyy',
      displayFormat: 'dd MMM yyyy',
      weekStartDay: 1, // Monday
    },
    number: {
      decimalSeparator: '.',
      thousandsSeparator: ',',
    },
    countryCodes: ['AU'],
  },
};

/**
 * Default locale
 */
export const DEFAULT_LOCALE = 'en-US';

/**
 * Get locale configuration for a given locale code
 * 
 * @param locale - Locale code (e.g., 'en-US')
 * @returns LocaleConfig or undefined if locale not supported
 */
export function getLocaleConfig(locale: string): LocaleConfig | undefined {
  return SUPPORTED_LOCALES[locale];
}

/**
 * Check if a locale is supported
 * 
 * @param locale - Locale code to check
 * @returns true if locale is supported
 */
export function isSupportedLocale(locale: string): boolean {
  return locale in SUPPORTED_LOCALES;
}

/**
 * Get locale code from country code
 * Maps ISO 3166-1 alpha-2 country codes to supported locales
 * 
 * @param countryCode - Country code (e.g., 'US', 'AU')
 * @returns Locale code or null if no mapping found
 */
export function getLocaleFromCountry(countryCode: string): string | null {
  const normalizedCountry = countryCode.toUpperCase();
  
  for (const [localeCode, config] of Object.entries(SUPPORTED_LOCALES)) {
    if (config.countryCodes.includes(normalizedCountry)) {
      return localeCode;
    }
  }
  
  return null;
}

/**
 * Get all supported locale codes
 * 
 * @returns Array of locale codes
 */
export function getSupportedLocaleCodes(): string[] {
  return Object.keys(SUPPORTED_LOCALES);
}

/**
 * Get all supported locales as array
 * 
 * @returns Array of LocaleConfig objects
 */
export function getSupportedLocales(): LocaleConfig[] {
  return Object.values(SUPPORTED_LOCALES);
}

