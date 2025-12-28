import type { UserPreferences } from '@/contracts/userPreferences';

export interface UserPreferencesRepository {
  get(
    userId: string,
    getToken: () => Promise<string | null>
  ): Promise<{ data?: UserPreferences; error?: { error: string; code: string } }>;

  /**
   * Persist the full preferences object for the given user.
   * Implementations should use upsert semantics.
   */
  set(
    userId: string,
    prefs: UserPreferences,
    getToken: () => Promise<string | null>
  ): Promise<{ data?: UserPreferences; error?: { error: string; code: string } }>;
}

// Import implementations (below factory for better DX in stack traces)
import { LocalUserPreferencesRepository } from './localRepo';
import { SupabaseUserPreferencesRepository } from './supabaseRepo';

export function createUserPreferencesRepository(): UserPreferencesRepository {
  const DATA_SOURCE = import.meta.env.VITE_DATA_SOURCE || 'mock';
  const supabaseConfigured = Boolean(
    import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY
  );

  if (DATA_SOURCE === 'supabase' && supabaseConfigured) {
    return new SupabaseUserPreferencesRepository();
  }

  // Default to local storage for dev/test and as a safety fallback when Supabase isn't configured.
  return new LocalUserPreferencesRepository();
}


