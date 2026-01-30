import { useState, useRef, useEffect } from 'react';

/**
 * Custom hook for managing account linking state and preventing race conditions
 * during inline account creation in forms.
 *
 * This hook encapsulates the critical patterns discovered during expense form development:
 * - Dual state management (React state + refs)
 * - Ref fallback for account ID persistence
 * - Synchronous form submission prevention
 * - Default values synchronization
 *
 * @param defaultAccountId - Initial account ID from form default values
 * @returns Object containing state, refs, and handlers
 */
export function useAccountLinking(defaultAccountId?: string) {
  // React state for UI updates (buttons, visual feedback)
  const [isAccountBeingCreated, setIsAccountBeingCreated] = useState(false);

  // Refs for synchronous checks (preventing form submission during account creation)
  const linkedAccountIdRef = useRef<string | undefined>(defaultAccountId);
  const isAccountBeingCreatedRef = useRef<boolean>(false);

  // Sync ref with defaultValues when they change (important for editing existing records)
  useEffect(() => {
    if (defaultAccountId) {
      linkedAccountIdRef.current = defaultAccountId;
    }
  }, [defaultAccountId]);

  /**
   * Handle account selection changes.
   * Updates both form state and ref synchronously to ensure account linking works reliably.
   */
  const handleAccountChange = (accountId: string) => {
    linkedAccountIdRef.current = accountId;
  };

  /**
   * Handle account creation state changes.
   * Updates both React state (for UI) and ref (for synchronous checks).
   */
  const handleAccountCreationStateChange = (isCreating: boolean) => {
    setIsAccountBeingCreated(isCreating);
    isAccountBeingCreatedRef.current = isCreating;
  };

  /**
   * Get the final account ID using ref fallback.
   * This ensures account linking works even if React state hasn't updated yet.
   */
  const getFinalAccountId = (formAccountId?: string) => {
    return formAccountId || linkedAccountIdRef.current;
  };

  /**
   * Check if form submission should be prevented.
   * Uses ref for synchronous check to avoid React state timing issues.
   */
  const shouldPreventSubmission = () => {
    return isAccountBeingCreatedRef.current;
  };

  return {
    // State for UI updates
    isAccountBeingCreated,

    // Refs for synchronous operations
    linkedAccountIdRef,
    isAccountBeingCreatedRef,

    // Handlers
    handleAccountChange,
    handleAccountCreationStateChange,

    // Utility functions
    getFinalAccountId,
    shouldPreventSubmission,
  };
}
