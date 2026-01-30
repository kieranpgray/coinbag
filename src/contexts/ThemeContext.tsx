/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useUserPreferences, useUpdateUserPreferences } from '@/hooks/useUserPreferences';

/**
 * Detects the user's system preference for dark mode
 * @returns true if system prefers dark mode, false otherwise
 */
function getSystemDarkModePreference(): boolean {
  if (typeof window === 'undefined') return false;

  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  } catch {
    // Fallback for browsers that don't support matchMedia
    return false;
  }
}

/**
 * Theme context type providing dark mode and privacy mode controls
 */
interface ThemeContextType {
  darkMode: boolean;
  toggleDarkMode: () => void;
  privacyMode: boolean;
  togglePrivacyMode: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

/**
 * Theme provider component that manages dark mode and privacy mode state
 * Syncs with user preferences and applies theme classes to document root
 * 
 * @param children - Child components to wrap
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const { data: prefs } = useUserPreferences();
  const updatePrefs = useUpdateUserPreferences();

  // Initialize with system preference as default
  const [darkMode, setDarkMode] = useState(getSystemDarkModePreference);
  const [privacyMode, setPrivacyMode] = useState(false);

  // Initialize from user preferences
  useEffect(() => {
    if (prefs) {
      setDarkMode(prefs.darkMode);
      setPrivacyMode(prefs.privacyMode);

      // Apply dark mode to document
      if (prefs.darkMode) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  }, [prefs]);

  // Listen for system preference changes when no user preference is set
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleChange = (e: MediaQueryListEvent) => {
      // Only update if user hasn't explicitly set a preference
      // We check if prefs exists and if darkMode matches system preference
      if (!prefs) {
        setDarkMode(e.matches);
        if (e.matches) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      }
    };

    // Add listener for future changes
    mediaQuery.addEventListener('change', handleChange);

    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, [prefs]);

  // Apply dark mode class to document when it changes
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const toggleDarkMode = () => {
    const newValue = !darkMode;
    setDarkMode(newValue);
    updatePrefs.mutate({ darkMode: newValue });
  };

  const togglePrivacyMode = () => {
    const newValue = !privacyMode;
    setPrivacyMode(newValue);
    updatePrefs.mutate({ privacyMode: newValue });
  };

  return (
    <ThemeContext.Provider value={{ darkMode, toggleDarkMode, privacyMode, togglePrivacyMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

/**
 * Hook to access theme context
 * 
 * @returns Theme context with dark mode and privacy mode controls
 * @throws Error if used outside ThemeProvider
 * 
 * @example
 * ```tsx
 * const { darkMode, toggleDarkMode, privacyMode, togglePrivacyMode } = useTheme();
 * ```
 */
export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

