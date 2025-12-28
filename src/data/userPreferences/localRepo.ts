import type { UserPreferencesRepository } from './repo';
import { defaultUserPreferences, userPreferencesSchema, type UserPreferences } from '@/contracts/userPreferences';

function storageKey(userId: string) {
  return `user_preferences:${userId}`;
}

/**
 * LocalStorage-backed preferences repository.
 *
 * Used for:
 * - development when Supabase isn't configured
 * - tests
 * - safe fallback if backend is unavailable
 */
export class LocalUserPreferencesRepository implements UserPreferencesRepository {
  async get(userId: string): Promise<{ data?: UserPreferences; error?: { error: string; code: string } }> {
    try {
      if (!userId) {
        return { error: { error: 'User ID is required', code: 'VALIDATION_ERROR' } };
      }

      const raw = localStorage.getItem(storageKey(userId));
      if (!raw) {
        return { data: defaultUserPreferences };
      }

      const parsed = JSON.parse(raw) as unknown;
      const validation = userPreferencesSchema.safeParse(parsed);
      if (!validation.success) {
        // If storage is corrupted, fall back to defaults rather than blocking the user.
        return { data: defaultUserPreferences };
      }

      return { data: validation.data };
    } catch (error) {
      return {
        error: {
          error: error instanceof Error ? error.message : 'Failed to load preferences',
          code: 'UNKNOWN',
        },
      };
    }
  }

  async set(
    userId: string,
    prefs: UserPreferences
  ): Promise<{ data?: UserPreferences; error?: { error: string; code: string } }> {
    try {
      if (!userId) {
        return { error: { error: 'User ID is required', code: 'VALIDATION_ERROR' } };
      }

      const validation = userPreferencesSchema.safeParse(prefs);
      if (!validation.success) {
        return { error: { error: 'Invalid preferences payload', code: 'VALIDATION_ERROR' } };
      }

      localStorage.setItem(storageKey(userId), JSON.stringify(validation.data));
      return { data: validation.data };
    } catch (error) {
      return {
        error: {
          error: error instanceof Error ? error.message : 'Failed to save preferences',
          code: 'UNKNOWN',
        },
      };
    }
  }
}


