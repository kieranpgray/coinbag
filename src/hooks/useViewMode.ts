import { useState, useEffect } from 'react';

type ViewMode = 'list' | 'cards';

const VIEW_MODE_STORAGE_KEY = 'supafolio-view-preference';

/**
 * Safely access localStorage with error handling
 */
function safeLocalStorageGetItem(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch (error) {
    // localStorage might not be available in some environments (e.g., SSR, private browsing)
    console.warn('localStorage access failed:', error);
    return null;
  }
}

/**
 * Safely set localStorage with error handling
 */
function safeLocalStorageSetItem(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch (error) {
    // localStorage might not be available in some environments
    console.warn('localStorage write failed:', error);
  }
}

/**
 * Custom hook to manage view mode (list/cards) with localStorage persistence
 *
 * @param defaultMode - Default view mode if none is stored ('cards' by default)
 * @param storageKey - Optional key (e.g. per-page preference); defaults to shared app preference
 * @returns [viewMode, setViewMode] tuple
 */
export function useViewMode(
  defaultMode: ViewMode = 'cards',
  storageKey: string = VIEW_MODE_STORAGE_KEY
): [ViewMode, (mode: ViewMode) => void] {
  const [viewMode, setViewModeState] = useState<ViewMode>(defaultMode);

  // Load from localStorage on mount
  useEffect(() => {
    const stored = safeLocalStorageGetItem(storageKey);
    if (stored === 'list' || stored === 'cards') {
      setViewModeState(stored);
    } else {
      // If no valid stored preference, use the default and store it
      safeLocalStorageSetItem(storageKey, defaultMode);
    }
  }, [defaultMode, storageKey]);

  // Setter that updates state and persists to localStorage
  const setViewMode = (mode: ViewMode) => {
    setViewModeState(mode);
    safeLocalStorageSetItem(storageKey, mode);
  };

  return [viewMode, setViewMode];
}
