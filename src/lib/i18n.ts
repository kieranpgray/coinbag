/**
 * i18next Configuration
 * 
 * Configures i18next for translation management.
 * Syncs with LocaleContext for locale changes.
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { DEFAULT_LOCALE } from './localeRegistry';

// Translation resources
// Structure: src/locales/{locale}/{namespace}.json

import enUSCommon from '../locales/en-US/common.json';
import enUSForms from '../locales/en-US/forms.json';
import enUSDashboard from '../locales/en-US/dashboard.json';
import enUSSettings from '../locales/en-US/settings.json';
import enUSNavigation from '../locales/en-US/navigation.json';
import enUSErrors from '../locales/en-US/errors.json';
import enUSValidation from '../locales/en-US/validation.json';
import enUSNotifications from '../locales/en-US/notifications.json';
import enUSImport from '../locales/en-US/import.json';
import enUSAccounts from '../locales/en-US/accounts.json';
import enUSTransactions from '../locales/en-US/transactions.json';
import enUSAria from '../locales/en-US/aria.json';

import enAUCommon from '../locales/en-AU/common.json';
import enAUForms from '../locales/en-AU/forms.json';
import enAUDashboard from '../locales/en-AU/dashboard.json';
import enAUSettings from '../locales/en-AU/settings.json';
import enAUNavigation from '../locales/en-AU/navigation.json';
import enAUErrors from '../locales/en-AU/errors.json';
import enAUValidation from '../locales/en-AU/validation.json';
import enAUNotifications from '../locales/en-AU/notifications.json';
import enAUImport from '../locales/en-AU/import.json';
import enAUAccounts from '../locales/en-AU/accounts.json';
import enAUTransactions from '../locales/en-AU/transactions.json';
import enAUAria from '../locales/en-AU/aria.json';

const resources = {
  'en-US': {
    common: enUSCommon,
    forms: enUSForms,
    dashboard: enUSDashboard,
    settings: enUSSettings,
    navigation: enUSNavigation,
    errors: enUSErrors,
    validation: enUSValidation,
    notifications: enUSNotifications,
    import: enUSImport,
    accounts: enUSAccounts,
    transactions: enUSTransactions,
    aria: enUSAria,
  },
  'en-AU': {
    common: enAUCommon,
    forms: enAUForms,
    dashboard: enAUDashboard,
    settings: enAUSettings,
    navigation: enAUNavigation,
    errors: enAUErrors,
    validation: enAUValidation,
    notifications: enAUNotifications,
    import: enAUImport,
    accounts: enAUAccounts,
    transactions: enAUTransactions,
    aria: enAUAria,
  },
};

// Custom language normalization function
function normalizeLanguageCode(lng: string): string {
  // Normalize 'en' to 'en-US' (default English locale)
  if (lng === 'en' || lng.startsWith('en-')) {
    if (lng === 'en') {
      return 'en-US';
    }
    // Keep 'en-AU', normalize other 'en-XX' to 'en-US'
    if (lng === 'en-AU') {
      return 'en-AU';
    }
    return 'en-US';
  }
  // For unsupported languages, return default
  return DEFAULT_LOCALE;
}

i18n
  // Detect user language
  .use(LanguageDetector)
  // Pass the i18n instance to react-i18next
  .use(initReactI18next)
  // Initialize i18next
  .init({
    resources,
    fallbackLng: DEFAULT_LOCALE,
    defaultNS: 'common',
    supportedLngs: ['en-US', 'en-AU'],
    
    // Language detection options
    detection: {
      // Order of detection methods
      order: ['localStorage', 'navigator'],
      // Keys to lookup language from
      lookupLocalStorage: 'i18nextLng',
      // Cache user language
      caches: ['localStorage'],
      // Don't clean codes - we handle normalization ourselves via convertDetectedLanguage
      // Setting cleanCode to false prevents i18next from stripping region codes
      cleanCode: false,
      // Convert detected language to normalized form before i18next processes it
      // This prevents warnings about unsupported language codes
      convertDetectedLanguage: (lng: string) => {
        return normalizeLanguageCode(lng);
      },
    },
    
    // Handle language code normalization
    // Load strategy: 'currentOnly' ensures we only load the current language
    // This prevents unnecessary fallback resolution attempts
    load: 'currentOnly',

    // Interpolation options
    interpolation: {
      escapeValue: false, // React already escapes values
    },

    // Return options
    returnObjects: true, // Allow returning nested objects for complex translations
    returnNull: false, // Return key if translation not found instead of null

    // React options
    react: {
      useSuspense: false, // Disable suspense for better error handling
    },

    // Namespace options
    ns: ['common', 'forms', 'dashboard', 'settings', 'navigation', 'errors', 'validation', 'notifications', 'import', 'accounts', 'transactions', 'aria'],

    // Separator options (explicit for clarity and reliability)
    nsSeparator: ':', // Namespace separator (e.g., 'settings:locale.label')
    keySeparator: '.', // Key separator for nested keys (e.g., 'locale.label')

    // Missing key handling - log warnings in dev mode via debug mode
    // Debug mode will log missing keys automatically
    saveMissing: import.meta.env.DEV, // Save missing keys in dev mode

    // Debug mode (disable in production)
    debug: import.meta.env.DEV,
  } as Record<string, unknown>) // Type assertion needed due to complex i18next option types
  .then(() => {
    // Normalize the initially detected language immediately after initialization
    // This ensures the language code is always in the correct format
    const currentLang = i18n.language;
    const normalizedLang = normalizeLanguageCode(currentLang || DEFAULT_LOCALE);
    
    // Only change language if it's different from current
    // Note: This will use the intercepted changeLanguage which normalizes the code
    if (currentLang !== normalizedLang) {
      i18n.changeLanguage(normalizedLang).catch(() => {
        // Silent fail for normalization - fallback is already set
      });
    }
  });

/**
 * Change i18next language to match LocaleContext
 * Call this when locale changes in LocaleContext
 * Normalizes language codes (e.g., 'en' -> 'en-US')
 * 
 * @param locale - Locale code (e.g., 'en-US', 'en-AU', or 'en')
 */
export function changeI18nLanguage(locale: string): void {
  const normalizedLocale = normalizeLanguageCode(locale);
  i18n.changeLanguage(normalizedLocale).catch((error) => {
    console.error('Failed to change i18next language:', error);
  });
}

// Intercept language changes to normalize codes
// This handles cases where i18next's LanguageDetector detects 'en' instead of 'en-US'
const originalChangeLanguage = i18n.changeLanguage.bind(i18n);
(i18n as any).changeLanguage = function(lng?: string | string[], callback?: (error: Error | null, t: (key: string) => string) => void) {
  if (typeof lng === 'string') {
    // Normalize before i18next processes it to prevent warnings
    const normalized = normalizeLanguageCode(lng);
    if (normalized !== lng) {
      return originalChangeLanguage(normalized, callback);
    }
    return originalChangeLanguage(lng, callback);
  } else if (Array.isArray(lng) && lng.length > 0 && typeof lng[0] === 'string') {
    // Normalize array of language codes - take first one as i18next expects single string
    const normalized = normalizeLanguageCode(lng[0]);
    return originalChangeLanguage(normalized, callback);
  }
  // Fallback to original behavior for undefined or invalid inputs
  return originalChangeLanguage(lng as string | undefined, callback);
};

export default i18n;

