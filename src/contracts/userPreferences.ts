import { z } from 'zod';

/**
 * App-owned user preferences (NOT identity).
 * Identity (name/email/phone) should always come from Clerk.
 */
export const emailNotificationsSchema = z.object({
  portfolioSummary: z.boolean(),
  spendingAlerts: z.boolean(),
  stockPriceAlerts: z.boolean(),
  featureAnnouncements: z.boolean(),
  monthlyReports: z.boolean(),
  marketingPromotions: z.boolean(),
});

export const themePreferenceSchema = z.enum(['system', 'light', 'dark']);

export const userPreferencesSchema = z.object({
  privacyMode: z.boolean(),
  themePreference: themePreferenceSchema,
  taxRate: z.number(),
  taxSettingsConfigured: z.boolean(),
  emailNotifications: emailNotificationsSchema,
  locale: z.string().default('en-US'), // Locale preference (en-US, en-AU, etc.)
  hideSetupChecklist: z.boolean().default(false),
});

export type UserPreferences = z.infer<typeof userPreferencesSchema>;
export type ThemePreference = z.infer<typeof themePreferenceSchema>;

export const defaultUserPreferences: UserPreferences = {
  privacyMode: false,
  themePreference: 'system',
  taxRate: 20,
  taxSettingsConfigured: false,
  locale: 'en-US',
  hideSetupChecklist: false,
  emailNotifications: {
    portfolioSummary: true,
    spendingAlerts: true,
    stockPriceAlerts: true,
    featureAnnouncements: false,
    monthlyReports: false,
    marketingPromotions: false,
  },
};


