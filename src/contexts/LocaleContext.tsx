/**
 * Locale Context Provider
 * 
 * Manages locale state and syncs with user preferences.
 * Provides locale-aware utilities and hooks for components.
 * 
 * Priority order for locale selection:
 * 1. User's manually selected preference (from user_preferences table) - always takes precedence
 * 2. Auto-detected from IP (only if no manual preference exists, first visit only, cached)
 * 3. Browser locale fallback (if IP detection fails, check navigator.language)
 * 4. Default to 'en-US'
 */

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { useUserPreferences, useUpdateUserPreferences } from '@/hooks/useUserPreferences';
import { detectLocaleFromIP } from '@/lib/ipDetection';
import { changeI18nLanguage } from '@/lib/i18n';
import {
  getLocaleConfig,
  isSupportedLocale,
  DEFAULT_LOCALE,
  type LocaleConfig,
} from '@/lib/localeRegistry';

interface LocaleContextType {
  locale: string;
  localeConfig: LocaleConfig;
  setLocale: (locale: string) => Promise<void>;
  // Utility functions
  getCurrencyCode: () => string;
  getCurrencySymbol: () => string;
  getDateFormat: () => string;
  getWeekStartDay: () => 0 | 1;
  formatNumber: (value: number, options?: Intl.NumberFormatOptions) => string;
}

const LocaleContext = createContext<LocaleContextType | undefined>(undefined);

const IP_DETECTION_CACHE_KEY = 'ip_locale_detected';
const IP_DETECTION_TIMESTAMP_KEY = 'ip_locale_detection_timestamp';

/**
 * Check if IP detection has already been attempted
 */
function hasIPDetectionBeenAttempted(): boolean {
  try {
    return localStorage.getItem(IP_DETECTION_CACHE_KEY) !== null;
  } catch {
    return false;
  }
}

/**
 * Mark IP detection as attempted
 */
function markIPDetectionAttempted(): void {
  try {
    localStorage.setItem(IP_DETECTION_CACHE_KEY, 'true');
    localStorage.setItem(IP_DETECTION_TIMESTAMP_KEY, Date.now().toString());
  } catch {
    // Ignore localStorage errors
  }
}

/**
 * Get browser locale and map to supported locale
 */
function getBrowserLocale(): string {
  if (typeof navigator === 'undefined') {
    return DEFAULT_LOCALE;
  }

  const browserLang = navigator.language || navigator.languages?.[0] || DEFAULT_LOCALE;
  
  // Check if browser locale is directly supported
  if (isSupportedLocale(browserLang)) {
    return browserLang;
  }

  // Try to match language part (e.g., 'en' from 'en-GB')
  const langPart = browserLang.split('-')[0];
  if (langPart) {
    for (const locale of Object.keys({ 'en-US': true, 'en-AU': true })) {
      if (locale.startsWith(langPart)) {
        return locale;
      }
    }
  }

  return DEFAULT_LOCALE;
}

interface LocaleProviderProps {
  children: ReactNode;
}

export function LocaleProvider({ children }: LocaleProviderProps) {
  const { data: prefs, isLoading: prefsLoading } = useUserPreferences();
  const updatePrefs = useUpdateUserPreferences();
  const [locale, setLocaleState] = useState<string>(DEFAULT_LOCALE);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize locale on mount
  useEffect(() => {
    if (prefsLoading || isInitialized) {
      return;
    }

    const initializeLocale = async () => {
      // Priority 1: User's manual preference
      if (prefs?.locale && isSupportedLocale(prefs.locale)) {
        setLocaleState(prefs.locale);
        changeI18nLanguage(prefs.locale);
        setIsInitialized(true);
        return;
      }

      // Priority 2: IP detection (only if not attempted before)
      if (!hasIPDetectionBeenAttempted()) {
        markIPDetectionAttempted();
        try {
          const detectedLocale = await detectLocaleFromIP();
          if (detectedLocale && isSupportedLocale(detectedLocale)) {
            setLocaleState(detectedLocale);
            changeI18nLanguage(detectedLocale);
            setIsInitialized(true);
            return;
          }
        } catch (error) {
          console.warn('IP detection failed:', error);
        }
      }

      // Priority 3: Browser locale fallback
      const browserLocale = getBrowserLocale();
      setLocaleState(browserLocale);
      changeI18nLanguage(browserLocale);
      setIsInitialized(true);
    };

    initializeLocale();
  }, [prefs, prefsLoading, isInitialized]);

  // Sync locale with user preferences when it changes
  const setLocale = useCallback(
    async (newLocale: string) => {
      if (!isSupportedLocale(newLocale)) {
        console.warn(`Unsupported locale: ${newLocale}. Falling back to ${DEFAULT_LOCALE}`);
        newLocale = DEFAULT_LOCALE;
      }

      setLocaleState(newLocale);
      changeI18nLanguage(newLocale);

      // Save to user preferences
      try {
        await updatePrefs.mutateAsync({ locale: newLocale });
      } catch (error) {
        console.error('Failed to save locale preference:', error);
        // Continue anyway - locale is set in state
      }
    },
    [updatePrefs]
  );

  // Get locale config
  const localeConfig = getLocaleConfig(locale) || getLocaleConfig(DEFAULT_LOCALE)!;

  // Utility functions
  const getCurrencyCode = useCallback(() => {
    return localeConfig.currency.code;
  }, [localeConfig]);

  const getCurrencySymbol = useCallback(() => {
    return localeConfig.currency.symbol;
  }, [localeConfig]);

  const getDateFormat = useCallback(() => {
    return localeConfig.date.format;
  }, [localeConfig]);

  const getWeekStartDay = useCallback(() => {
    return localeConfig.date.weekStartDay;
  }, [localeConfig]);

  const formatNumber = useCallback(
    (value: number, options?: Intl.NumberFormatOptions) => {
      return new Intl.NumberFormat(locale, {
        ...options,
        minimumFractionDigits: options?.minimumFractionDigits ?? 0,
        maximumFractionDigits: options?.maximumFractionDigits ?? 2,
      }).format(value);
    },
    [locale]
  );

  const value: LocaleContextType = {
    locale,
    localeConfig,
    setLocale,
    getCurrencyCode,
    getCurrencySymbol,
    getDateFormat,
    getWeekStartDay,
    formatNumber,
  };

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

/**
 * Hook to access locale context
 * 
 * @returns Locale context with locale state and utility functions
 * @throws Error if used outside LocaleProvider
 * 
 * @example
 * ```tsx
 * const { locale, setLocale, getCurrencySymbol } = useLocale();
 * ```
 */
export function useLocale(): LocaleContextType {
  const context = useContext(LocaleContext);
  if (context === undefined) {
    throw new Error('useLocale must be used within a LocaleProvider');
  }
  return context;
}

