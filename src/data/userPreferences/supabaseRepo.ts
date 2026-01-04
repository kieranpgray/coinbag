import { createAuthenticatedSupabaseClient } from '@/lib/supabaseClient';
import type { UserPreferencesRepository } from './repo';
import { userPreferencesSchema, type UserPreferences } from '@/contracts/userPreferences';

/**
 * Supabase-backed preferences repository.
 *
 * Table: user_preferences
 * RLS: user_id matches Clerk JWT sub (auth.jwt() ->> 'sub')
 */
export class SupabaseUserPreferencesRepository implements UserPreferencesRepository {
  private readonly selectColumns =
    'privacyMode:privacy_mode, darkMode:dark_mode, taxRate:tax_rate, taxSettingsConfigured:tax_settings_configured, emailNotifications:email_notifications, locale';

  async get(
    _userId: string,
    getToken: () => Promise<string | null>
  ): Promise<{ data?: UserPreferences; error?: { error: string; code: string } }> {
    try {
      const supabase = await createAuthenticatedSupabaseClient(getToken);

      // RLS scopes to the current user; there should be at most one row.
      const { data, error } = await supabase
        .from('user_preferences')
        .select(this.selectColumns)
        .maybeSingle();

      if (error) {
        return { error: this.normalizeSupabaseError(error) };
      }

      if (!data) {
        return { data: undefined };
      }

      const validation = userPreferencesSchema.safeParse(data);
      if (!validation.success) {
        return { error: { error: 'Invalid preferences data received from server', code: 'VALIDATION_ERROR' } };
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
    _userId: string,
    prefs: UserPreferences,
    getToken: () => Promise<string | null>
  ): Promise<{ data?: UserPreferences; error?: { error: string; code: string } }> {
    try {
      const validation = userPreferencesSchema.safeParse(prefs);
      if (!validation.success) {
        return { error: { error: 'Invalid preferences payload', code: 'VALIDATION_ERROR' } };
      }

      const supabase = await createAuthenticatedSupabaseClient(getToken);

      // user_id is derived via DEFAULT (auth.jwt() ->> 'sub') on insert.
      const dbInput = {
        privacy_mode: validation.data.privacyMode,
        dark_mode: validation.data.darkMode,
        tax_rate: validation.data.taxRate,
        tax_settings_configured: validation.data.taxSettingsConfigured,
        email_notifications: validation.data.emailNotifications,
        locale: validation.data.locale,
      };

      const { data, error } = await supabase
        .from('user_preferences')
        .upsert(dbInput, { onConflict: 'user_id' })
        .select(this.selectColumns)
        .single();

      if (error) {
        return { error: this.normalizeSupabaseError(error) };
      }

      const parsed = userPreferencesSchema.safeParse(data);
      if (!parsed.success) {
        return { error: { error: 'Invalid preferences data received from server', code: 'VALIDATION_ERROR' } };
      }

      return { data: parsed.data };
    } catch (error) {
      return {
        error: {
          error: error instanceof Error ? error.message : 'Failed to save preferences',
          code: 'UNKNOWN',
        },
      };
    }
  }

  private normalizeSupabaseError(error: unknown): { error: string; code: string } {
    const isPostgrestError = (
      err: unknown
    ): err is { code: string; message: string; details?: string; hint?: string } =>
      typeof err === 'object' && err !== null && 'code' in err && 'message' in err;

    if (!isPostgrestError(error)) {
      return { error: 'An unexpected error occurred', code: 'UNKNOWN' };
    }

    // Common auth/RLS failures
    if (error.code === '42501' || error.message.includes('policy') || error.message.includes('permission')) {
      return { error: 'You do not have permission to access preferences', code: 'PERMISSION_DENIED' };
    }

    if (error.code === 'PGRST301' || error.message.includes('JWT')) {
      return { error: 'Authentication required. Please sign in again', code: 'AUTH_ERROR' };
    }

    return { error: error.hint || error.message || 'Supabase error', code: error.code || 'UNKNOWN' };
  }
}


