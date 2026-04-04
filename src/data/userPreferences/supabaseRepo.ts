import { createAuthenticatedSupabaseClient } from '@/lib/supabaseClient';
import { getDefaultWorkspaceIdForUser } from '@/lib/repositoryHelpers';
import type { UserPreferencesRepository } from './repo';
import { userPreferencesSchema, defaultUserPreferences, type UserPreferences } from '@/contracts/userPreferences';
import { logger, getCorrelationId } from '@/lib/logger';

/**
 * Supabase-backed preferences repository.
 *
 * Table: user_preferences
 * RLS: user_id matches Clerk JWT sub (auth.jwt() ->> 'sub')
 */
export class SupabaseUserPreferencesRepository implements UserPreferencesRepository {
  private readonly selectColumns =
    'privacy_mode, theme_preference, dark_mode, email_notifications, locale, hide_setup_checklist, pay_cycle, transfer_view_mode';

  /**
   * Map database row (snake_case) to UserPreferences (camelCase)
   * Handles backward compatibility: if theme_preference is missing, derive from dark_mode
   */
  private mapDbRowToPreferences(row: any): UserPreferences {
    // Handle theme_preference with fallback to dark_mode for backward compatibility
    let themePreference: 'system' | 'light' | 'dark' = 'system';
    if (row.theme_preference) {
      themePreference = row.theme_preference;
    } else if (row.dark_mode !== undefined) {
      // Legacy: convert boolean to theme preference
      themePreference = row.dark_mode ? 'dark' : 'light';
    }

    // Parse pay_cycle JSONB if present
    let payCycle = undefined;
    if (row.pay_cycle) {
      try {
        // Validate JSONB structure matches PayCycleConfig schema
        const parsed = typeof row.pay_cycle === 'string' ? JSON.parse(row.pay_cycle) : row.pay_cycle;
        payCycle = parsed;
      } catch (error) {
        // If parsing fails, leave as undefined (corrupted data)
        console.warn('Failed to parse pay_cycle JSONB:', error);
      }
    }

    return {
      privacyMode: row.privacy_mode ?? false,
      themePreference,
      emailNotifications: row.email_notifications ?? defaultUserPreferences.emailNotifications,
      locale: row.locale ?? 'en-US',
      hideSetupChecklist: row.hide_setup_checklist ?? false,
      payCycle: payCycle,
      transferViewMode: (row.transfer_view_mode as 'weekly' | 'fortnightly' | 'monthly' | undefined) ?? undefined,
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

      // First fallback: try without pay_cycle/transfer_view_mode (if migration not run)
      // Check for 400 status or specific error codes/messages
      const isSchemaError = error && (
        (error as any).status === 400 ||
        error.code === '42703' ||
        error.code === 'PGRST100' ||
        error.message?.includes('pay_cycle') ||
        error.message?.includes('transfer_view_mode') ||
        error.message?.includes('schema cache') ||
        error.message?.includes('Could not find')
      );
      
      if (isSchemaError) {
        const fallbackColumns = 'privacy_mode, theme_preference, dark_mode, email_notifications, locale, hide_setup_checklist';
        const fallbackResult = await supabase
          .from('user_preferences')
          .select(fallbackColumns)
          .maybeSingle();

        if (fallbackResult.error) {
          // Second fallback: try without both hide_setup_checklist AND locale (if locale migration not run)
          const isLocaleError = fallbackResult.error && (
            (fallbackResult.error as any).status === 400 ||
            fallbackResult.error.code === '42703' ||
            fallbackResult.error.code === 'PGRST100' ||
            fallbackResult.error.message?.includes('locale') ||
            fallbackResult.error.message?.includes('schema cache') ||
            fallbackResult.error.message?.includes('Could not find')
          );
          
          if (isLocaleError) {
            const baseColumns = 'privacy_mode, theme_preference, dark_mode, email_notifications';
            const baseResult = await supabase
              .from('user_preferences')
              .select(baseColumns)
              .maybeSingle();

            if (baseResult.error) {
              const isThemePreferenceError = baseResult.error && (
                (baseResult.error as any).status === 400 ||
                (baseResult.error as any).code === '42703' ||
                (baseResult.error as any).code === 'PGRST100' ||
                (baseResult.error as any).message?.includes('theme_preference') ||
                (baseResult.error as any).message?.includes('schema cache') ||
                (baseResult.error as any).message?.includes('Could not find')
              );
              if (isThemePreferenceError) {
                const legacyColumns = 'privacy_mode, dark_mode, email_notifications';
                const legacyResult = await supabase
                  .from('user_preferences')
                  .select(legacyColumns)
                  .maybeSingle();
                if (!legacyResult.error && legacyResult.data) {
                  data = {
                    ...legacyResult.data,
                    locale: 'en-US',
                    hide_setup_checklist: false,
                    pay_cycle: null,
                    transfer_view_mode: null,
                  } as any;
                  error = null;
                } else {
                  return { error: this.normalizeSupabaseError(legacyResult.error ?? baseResult.error) };
                }
              } else {
                return { error: this.normalizeSupabaseError(baseResult.error) };
              }
            } else {
              // Map and add defaults for missing columns
              data = baseResult.data ? {
                ...baseResult.data,
                locale: 'en-US',
                hide_setup_checklist: false,
                pay_cycle: null,
                transfer_view_mode: null,
              } as any : null;
              error = null;
            }
          } else {
            return { error: this.normalizeSupabaseError(fallbackResult.error) };
          }
        } else {
          // Map and add defaults for missing columns
          data = fallbackResult.data ? {
            ...fallbackResult.data,
            hide_setup_checklist: false,
            pay_cycle: null,
            transfer_view_mode: null,
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

      const workspaceResult = await getDefaultWorkspaceIdForUser(getToken);
      const workspaceId = 'workspaceId' in workspaceResult ? workspaceResult.workspaceId : undefined;

      const supabase = await createAuthenticatedSupabaseClient(getToken);

      // user_id is derived via DEFAULT (auth.jwt() ->> 'sub') on insert.
      const dbInput: Record<string, unknown> = {
        privacy_mode: validation.data.privacyMode,
        theme_preference: validation.data.themePreference,
        email_notifications: validation.data.emailNotifications,
        locale: validation.data.locale,
        ...(workspaceId && { workspace_id: workspaceId }),
      };

      // Progressive fallback for schema compatibility: try with newer columns, fall back to older schemas
      const dbInputWithChecklist = {
        ...dbInput,
        hide_setup_checklist: validation.data.hideSetupChecklist,
      };

      // Add pay cycle and transfer view mode (newest columns)
      const dbInputWithTransfers = {
        ...dbInputWithChecklist,
        pay_cycle: validation.data.payCycle ? JSON.stringify(validation.data.payCycle) : null,
        transfer_view_mode: validation.data.transferViewMode ?? null,
      };

      let { data, error } = await supabase
        .from('user_preferences')
        .upsert(dbInputWithTransfers, { onConflict: 'user_id' })
        .select(this.selectColumns)
        .single();

      // First fallback: try without pay_cycle/transfer_view_mode (if migration not run)
      // Also handle PGRST204 (column not found in schema cache)
      const isSchemaError = error && (
        (error as any).status === 400 ||
        error.code === '42703' ||
        error.code === 'PGRST100' ||
        error.code === 'PGRST204' ||
        error.message?.includes('pay_cycle') ||
        error.message?.includes('transfer_view_mode') ||
        error.message?.includes('locale') ||
        error.message?.includes('schema cache') ||
        error.message?.includes('Could not find')
      );

      const isLocaleMissingError = error && (
        (error as any).code === 'PGRST204' ||
        (typeof (error as any).message === 'string' && (error as any).message.includes('locale'))
      );

      if (isSchemaError) {
        // If the missing column is locale, retry without locale but keep pay_cycle/transfer_view_mode
        // so that "Save Pay Cycle" still persists when locale migration hasn't been run.
        if (isLocaleMissingError) {
          const withLocale = dbInputWithTransfers as Record<string, unknown>;
          const { locale: _locale, ...dbInputWithoutLocale } = withLocale;
          const selectWithoutLocale =
            'privacy_mode, theme_preference, dark_mode, email_notifications, hide_setup_checklist, pay_cycle, transfer_view_mode';
          const localeFallback = await supabase
            .from('user_preferences')
            .upsert(dbInputWithoutLocale, { onConflict: 'user_id' })
            .select(selectWithoutLocale)
            .single();
          if (!localeFallback.error && localeFallback.data) {
            data = { ...localeFallback.data, locale: validation.data.locale } as any;
            error = null;
          }
        }

        if (error) {
          let fallbackResult = await supabase
            .from('user_preferences')
            .upsert(dbInputWithChecklist, { onConflict: 'user_id' })
            .select('privacy_mode, theme_preference, dark_mode, email_notifications, locale, hide_setup_checklist')
            .single();

        if (fallbackResult.error) {
          const isHideChecklistError = fallbackResult.error && (
            (fallbackResult.error as any).status === 400 ||
            fallbackResult.error.code === '42703' ||
            fallbackResult.error.code === 'PGRST100' ||
            fallbackResult.error.code === 'PGRST204' ||
            fallbackResult.error.message?.includes('hide_setup_checklist') ||
            fallbackResult.error.message?.includes('locale') ||
            fallbackResult.error.message?.includes('schema cache') ||
            fallbackResult.error.message?.includes('Could not find')
          );
          
          if (isHideChecklistError) {
            let fallbackResult2 = await supabase
              .from('user_preferences')
              .upsert(dbInput, { onConflict: 'user_id' })
              .select('privacy_mode, theme_preference, dark_mode, email_notifications, locale')
              .single();
            
            if (fallbackResult2.error && ((fallbackResult2.error as any).status === 400 || fallbackResult2.error.code === '42703' || fallbackResult2.error.code === 'PGRST100' || fallbackResult2.error.code === 'PGRST204')) {
              const { locale: __, ...dbInputWithoutLocale } = dbInput;
              fallbackResult2 = await supabase
                .from('user_preferences')
                .upsert(dbInputWithoutLocale, { onConflict: 'user_id' })
                .select('privacy_mode, theme_preference, dark_mode, email_notifications')
                .single();
            }

            if (fallbackResult2.error) {
              const isLocaleError = fallbackResult2.error && (
                (fallbackResult2.error as any).status === 400 ||
                fallbackResult2.error.code === '42703' ||
                fallbackResult2.error.code === 'PGRST100' ||
                fallbackResult2.error.code === 'PGRST204' ||
                fallbackResult2.error.message?.includes('locale') ||
                fallbackResult2.error.message?.includes('schema cache') ||
                fallbackResult2.error.message?.includes('Could not find')
              );
              
              if (isLocaleError) {
                const baseInput = {
                  privacy_mode: validation.data.privacyMode,
                  theme_preference: validation.data.themePreference,
                  email_notifications: validation.data.emailNotifications,
                };

                const baseResult = await supabase
                  .from('user_preferences')
                  .upsert(baseInput, { onConflict: 'user_id' })
                  .select('privacy_mode, theme_preference, dark_mode, email_notifications')
                  .single();

                if (baseResult.error) {
                  const isThemePreferenceError = baseResult.error && (
                    (baseResult.error as any).status === 400 ||
                    (baseResult.error as any).code === '42703' ||
                    (baseResult.error as any).code === 'PGRST100' ||
                    (baseResult.error as any).code === 'PGRST204' ||
                    (baseResult.error as any).message?.includes('theme_preference') ||
                    (baseResult.error as any).message?.includes('schema cache') ||
                    (baseResult.error as any).message?.includes('Could not find')
                  );
                  if (isThemePreferenceError) {
                    const legacyInput = {
                      privacy_mode: validation.data.privacyMode,
                      dark_mode: validation.data.themePreference === 'dark',
                      email_notifications: validation.data.emailNotifications,
                    };
                    const legacyResult = await supabase
                      .from('user_preferences')
                      .upsert(legacyInput, { onConflict: 'user_id' })
                      .select('privacy_mode, dark_mode, email_notifications')
                      .single();
                    if (!legacyResult.error && legacyResult.data) {
                      data = {
                        ...legacyResult.data,
                        locale: validation.data.locale,
                        hide_setup_checklist: validation.data.hideSetupChecklist,
                        pay_cycle: null,
                        transfer_view_mode: null,
                      } as any;
                      error = null;
                    } else {
                      return { error: this.normalizeSupabaseError(legacyResult.error ?? baseResult.error) };
                    }
                  } else {
                    return { error: this.normalizeSupabaseError(baseResult.error) };
                  }
                } else {
                  // Map and add defaults for missing columns
                  data = baseResult.data ? {
                    ...baseResult.data,
                    locale: validation.data.locale,
                    hide_setup_checklist: validation.data.hideSetupChecklist,
                    pay_cycle: null,
                    transfer_view_mode: null,
                  } as any : null;
                  error = null;
                }
              } else {
                return { error: this.normalizeSupabaseError(fallbackResult2.error) };
              }
            } else {
              // Map and add defaults for missing columns
              data = fallbackResult2.data ? {
                ...fallbackResult2.data,
                hide_setup_checklist: false,
                pay_cycle: null,
                transfer_view_mode: null,
              } as any : null;
              error = null;
            }
          } else {
            return { error: this.normalizeSupabaseError(fallbackResult.error) };
          }
        } else {
          // Map and add defaults for missing columns in response
          data = fallbackResult.data ? {
            ...fallbackResult.data,
            pay_cycle: null,
            transfer_view_mode: null,
          } as any : null;
          error = null;
        }
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

    if (error.code === 'PGRST301' || error.message.includes('JWT') || error.message.includes('401')) {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const keyFormat = import.meta.env.VITE_SUPABASE_ANON_KEY?.startsWith('sb_publishable_') ? 'new (sb_publishable_)' : 
                       import.meta.env.VITE_SUPABASE_ANON_KEY?.startsWith('eyJ') ? 'legacy (JWT)' : 'unknown';
      
      logger.error(
        'AUTH:401',
        'Authentication error in user preferences repository',
        {
          errorCode: error.code,
          errorMessage: error.message,
          supabaseUrl,
          keyFormat,
        },
        getCorrelationId() || undefined
      );
      
      return { error: 'Authentication required. Please sign in again', code: 'AUTH_ERROR' };
    }

    return { error: error.hint || error.message || 'Supabase error', code: error.code || 'UNKNOWN' };
  }
}


