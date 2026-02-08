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
  darkMode: boolean; // Computed effective dark mode (based on themePreference and system)
  themePreference: 'system' | 'light' | 'dark'; // User's stored preference
  toggleDarkMode: () => void; // Cycles through: system → light → dark → system
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
  const [themePreference, setThemePreference] = useState<'system' | 'light' | 'dark'>('system');
  const [privacyMode, setPrivacyMode] = useState(false);
  const [systemPrefersDark, setSystemPrefersDark] = useState(getSystemDarkModePreference);

  // Initialize from user preferences
  useEffect(() => {
    if (prefs) {
      setThemePreference(prefs.themePreference);
      setPrivacyMode(prefs.privacyMode);
    }
  }, [prefs]);

  // Listen for system preference changes when themePreference is 'system'
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    // Update initial state
    setSystemPrefersDark(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      // Only update system preference state when in 'system' mode
      // This will trigger the computed darkMode to update
      if (themePreference === 'system') {
        setSystemPrefersDark(e.matches);
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [themePreference]);

  // Compute effective darkMode from themePreference and system preference
  const effectiveDarkMode = themePreference === 'system' 
    ? systemPrefersDark 
    : themePreference === 'dark';

  // Apply effective dark mode to document
  useEffect(() => {
    if (effectiveDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [effectiveDarkMode]);

  const toggleDarkMode = () => {
    // Cycle through: system → light → dark → system
    const nextPreference: 'system' | 'light' | 'dark' = 
      themePreference === 'system' ? 'light' :
      themePreference === 'light' ? 'dark' :
      'system';
    
    setThemePreference(nextPreference);
    updatePrefs.mutate({ themePreference: nextPreference });
  };

  const togglePrivacyMode = () => {
    const newValue = !privacyMode;
    setPrivacyMode(newValue);
    updatePrefs.mutate({ privacyMode: newValue });
  };

  return (
    <ThemeContext.Provider value={{ 
      darkMode: effectiveDarkMode, 
      themePreference,
      toggleDarkMode, 
      privacyMode, 
      togglePrivacyMode 
    }}>
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

