import { useAuth } from '@clerk/clerk-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createUserPreferencesRepository } from '@/data/userPreferences/repo';
import { defaultUserPreferences, type UserPreferences } from '@/contracts/userPreferences';

const repo = createUserPreferencesRepository();

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

  return useQuery<UserPreferences>({
    queryKey: ['userPreferences', userId],
    enabled: Boolean(isLoaded && isSignedIn && userId),
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
    initialData: defaultUserPreferences,
    staleTime: 1000 * 60 * 5,
  });
}

export function useUpdateUserPreferences() {
  const queryClient = useQueryClient();
  const { getToken, userId } = useAuth();

  return useMutation({
    mutationFn: async (patch: Partial<UserPreferences>) => {
      if (!userId) {
        throw new Error('No authenticated user');
      }

      const current =
        (queryClient.getQueryData<UserPreferences>(['userPreferences', userId]) as UserPreferences | undefined) ??
        defaultUserPreferences;
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
  });
}


