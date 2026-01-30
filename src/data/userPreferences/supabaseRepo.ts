import { createAuthenticatedSupabaseClient } from '@/lib/supabaseClient';
import type { UserPreferencesRepository } from './repo';
import { userPreferencesSchema, defaultUserPreferences, type UserPreferences } from '@/contracts/userPreferences';

/**
 * Supabase-backed preferences repository.
 *
 * Table: user_preferences
 * RLS: user_id matches Clerk JWT sub (auth.jwt() ->> 'sub')
 */
export class SupabaseUserPreferencesRepository implements UserPreferencesRepository {
  private readonly selectColumns =
    'privacy_mode, dark_mode, tax_rate, tax_settings_configured, email_notifications, locale, hide_setup_checklist';

  /**
   * Map database row (snake_case) to UserPreferences (camelCase)
   */
  private mapDbRowToPreferences(row: any): UserPreferences {
    return {
      privacyMode: row.privacy_mode ?? false,
      darkMode: row.dark_mode ?? false,
      taxRate: row.tax_rate ?? 20,
      taxSettingsConfigured: row.tax_settings_configured ?? false,
      emailNotifications: row.email_notifications ?? defaultUserPreferences.emailNotifications,
      locale: row.locale ?? 'en-US',
      hideSetupChecklist: row.hide_setup_checklist ?? false,
    };
  }

  async get(
    _userId: string,
    getToken: () => Promise<string | null>
  ): Promise<{ data?: UserPreferences; error?: { error: string; code: string } }> {
    try {
      const supabase = await createAuthenticatedSupabaseClient(getToken);

      // RLS scopes to the current user; there should be at most one row.
      // Progressive fallback for schema compatibility: try all columns, then without newer columns
      let { data, error } = await supabase
        .from('user_preferences')
        .select(this.selectColumns)
        .maybeSingle();

      // First fallback: try without hide_setup_checklist (if migration not run)
      if (error && (error.message?.includes('hide_setup_checklist') || error.message?.includes('schema cache'))) {
        const fallbackColumns = 'privacy_mode, dark_mode, tax_rate, tax_settings_configured, email_notifications, locale';
        const fallbackResult = await supabase
          .from('user_preferences')
          .select(fallbackColumns)
          .maybeSingle();

        if (fallbackResult.error) {
          // Second fallback: try without both hide_setup_checklist AND locale (if locale migration not run)
          if (fallbackResult.error.message?.includes('locale') || fallbackResult.error.message?.includes('schema cache')) {
            const baseColumns = 'privacy_mode, dark_mode, tax_rate, tax_settings_configured, email_notifications';
            const baseResult = await supabase
              .from('user_preferences')
              .select(baseColumns)
              .maybeSingle();

            if (baseResult.error) {
              return { error: this.normalizeSupabaseError(baseResult.error) };
            }

            // Map and add defaults for missing columns
            data = baseResult.data ? {
              ...baseResult.data,
              locale: 'en-US',
              hide_setup_checklist: false
            } as any : null;
            error = null;
          } else {
            return { error: this.normalizeSupabaseError(fallbackResult.error) };
          }
        } else {
          // Map and add default for hide_setup_checklist
          data = fallbackResult.data ? {
            ...fallbackResult.data,
            hide_setup_checklist: false
          } as any : null;
          error = null;
        }
      }

      if (error) {
        return { error: this.normalizeSupabaseError(error) };
      }

      if (!data) {
        return { data: undefined };
      }

      // Map snake_case to camelCase before validation
      const mappedData = this.mapDbRowToPreferences(data);
      const validation = userPreferencesSchema.safeParse(mappedData);
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
      const dbInput: Record<string, unknown> = {
        privacy_mode: validation.data.privacyMode,
        dark_mode: validation.data.darkMode,
        tax_rate: validation.data.taxRate,
        tax_settings_configured: validation.data.taxSettingsConfigured,
        email_notifications: validation.data.emailNotifications,
        locale: validation.data.locale,
      };

      // Progressive fallback for schema compatibility: try with newer columns, fall back to older schemas
      const dbInputWithChecklist = {
        ...dbInput,
        hide_setup_checklist: validation.data.hideSetupChecklist,
      };

      let { data, error } = await supabase
        .from('user_preferences')
        .upsert(dbInputWithChecklist, { onConflict: 'user_id' })
        .select(this.selectColumns)
        .single();

      // First fallback: try without hide_setup_checklist (if migration not run)
      if (error && (error.message?.includes('hide_setup_checklist') || error.message?.includes('schema cache'))) {
        const fallbackResult = await supabase
          .from('user_preferences')
          .upsert(dbInput, { onConflict: 'user_id' })
          .select('privacy_mode, dark_mode, tax_rate, tax_settings_configured, email_notifications, locale')
          .single();

        if (fallbackResult.error) {
          // Second fallback: try without both hide_setup_checklist AND locale (if locale migration not run)
          if (fallbackResult.error.message?.includes('locale') || fallbackResult.error.message?.includes('schema cache')) {
            const baseInput = {
              privacy_mode: validation.data.privacyMode,
              dark_mode: validation.data.darkMode,
              tax_rate: validation.data.taxRate,
              tax_settings_configured: validation.data.taxSettingsConfigured,
              email_notifications: validation.data.emailNotifications,
            };

            const baseResult = await supabase
              .from('user_preferences')
              .upsert(baseInput, { onConflict: 'user_id' })
              .select('privacy_mode, dark_mode, tax_rate, tax_settings_configured, email_notifications')
              .single();

            if (baseResult.error) {
              return { error: this.normalizeSupabaseError(baseResult.error) };
            }

            // Map and add defaults for missing columns
            data = baseResult.data ? {
              ...baseResult.data,
              locale: validation.data.locale,
              hide_setup_checklist: validation.data.hideSetupChecklist
            } as any : null;
            error = null;
          } else {
            return { error: this.normalizeSupabaseError(fallbackResult.error) };
          }
        } else {
          // Map and add default for hide_setup_checklist in response
          data = fallbackResult.data ? {
            ...fallbackResult.data,
            hide_setup_checklist: false
          } as any : null;
          error = null;
        }
      }

      if (error) {
        return { error: this.normalizeSupabaseError(error) };
      }

      // Map snake_case to camelCase before validation
      const mappedData = this.mapDbRowToPreferences(data);
      const parsed = userPreferencesSchema.safeParse(mappedData);
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


