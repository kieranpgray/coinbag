import { useAuth } from '@clerk/clerk-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';
import { createUserPreferencesRepository } from '@/data/userPreferences/repo';
import { defaultUserPreferences, type UserPreferences } from '@/contracts/userPreferences';

const repo = createUserPreferencesRepository();

/** Matches dominant app copy for failed saves (Settings, Assets, etc.). */
export const USER_PREFERENCES_SAVE_ERROR_TOAST = "Couldn't save your changes. Try again.";

class PreferencesNotReadyError extends Error {
  constructor() {
    super('PREFERENCES_NOT_READY');
    this.name = 'PreferencesNotReadyError';
  }
}

function mergePreferences(base: UserPreferences, patch: Partial<UserPreferences>): UserPreferences {
  return {
    ...base,
    ...patch,
    emailNotifications: {
      ...base.emailNotifications,
      ...(patch.emailNotifications ?? {}),
    },
  };
}

export function useUserPreferences() {
  const { getToken, userId, isLoaded, isSignedIn } = useAuth();
  const enabled = Boolean(isLoaded && isSignedIn && userId);

  const query = useQuery<UserPreferences>({
    queryKey: ['userPreferences', userId],
    enabled,
    queryFn: async () => {
      if (!userId) return defaultUserPreferences;

      const { data, error } = await repo.get(userId, getToken);
      if (error) {
        // Prefer a safe UX over hard failure: return defaults if backend isn't ready.
        console.warn('Failed to load user preferences:', error);
        return defaultUserPreferences;
      }

      return mergePreferences(defaultUserPreferences, data ?? {});
    },
    placeholderData: defaultUserPreferences,
    staleTime: 1000 * 60 * 5,
  });

  /** False while signed-in prefs are still fetching (excludes placeholder). True when signed out (query disabled). */
  const isPreferencesReady = !enabled || (!query.isPlaceholderData && !query.isFetching);

  return { ...query, isPreferencesReady };
}

export function useUpdateUserPreferences() {
  const queryClient = useQueryClient();
  const { getToken, userId } = useAuth();

  return useMutation({
    mutationFn: async (patch: Partial<UserPreferences>) => {
      if (!userId) {
        throw new Error('No authenticated user');
      }

      const qState = queryClient.getQueryState<UserPreferences>(['userPreferences', userId]);
      if (qState?.status !== 'success' || qState.data === undefined) {
        toast.error(USER_PREFERENCES_SAVE_ERROR_TOAST);
        throw new PreferencesNotReadyError();
      }

      const current = qState.data;
      const next = mergePreferences(current, patch);

      const { data, error } = await repo.set(userId, next, getToken);
      if (error) {
        throw new Error(error.error);
      }
      return data ?? next;
    },
    onSuccess: (data) => {
      if (!userId) return;
      queryClient.setQueryData(['userPreferences', userId], data);
    },
    onError: (error) => {
      if (error instanceof PreferencesNotReadyError) {
        return;
      }
      const detail = error instanceof Error ? error.message : String(error);
      logger.warn('USER_PREFERENCES:UPDATE', 'Failed to save user preferences', { detail });
      if (import.meta.env.DEV) {
        console.warn('Failed to save user preferences:', error);
      }
      toast.error(USER_PREFERENCES_SAVE_ERROR_TOAST);
    },
  });
}


