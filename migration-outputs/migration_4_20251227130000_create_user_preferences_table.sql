-- Migration: Create user_preferences table for app-owned user settings
-- Description: Stores non-identity preferences (theme, privacy, notifications) per Clerk user
-- Identity (name/email/phone) must come from Clerk, not this table.
-- Safe to run multiple times (IF NOT EXISTS / DROP POLICY IF EXISTS).

-- Step 0: Ensure required extensions (commonly enabled in Supabase)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Step 1: Create user_preferences table
CREATE TABLE IF NOT EXISTS user_preferences (
  -- Clerk user id (JWT sub claim) is not a UUID; store as text.
  -- Defaulting to auth.jwt()->>'sub' lets the client omit user_id on insert.
  user_id text PRIMARY KEY DEFAULT (auth.jwt() ->> 'sub'),
  privacy_mode boolean NOT NULL DEFAULT false,
  dark_mode boolean NOT NULL DEFAULT false,
  tax_rate numeric NOT NULL DEFAULT 20,
  email_notifications jsonb NOT NULL DEFAULT '{
    "portfolioSummary": true,
    "spendingAlerts": true,
    "stockPriceAlerts": true,
    "featureAnnouncements": false,
    "monthlyReports": false,
    "marketingPromotions": false
  }'::jsonb,
  mfa_enabled boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

COMMENT ON TABLE user_preferences IS 'App-owned user preferences (non-identity) scoped per Clerk user';
COMMENT ON COLUMN user_preferences.user_id IS 'Clerk user ID (JWT sub claim) used for RLS policies';

-- Step 2: Indexes
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);

-- Step 3: Enable Row Level Security
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- Step 4: Create/replace RLS policies
DROP POLICY IF EXISTS "Users can view their own preferences" ON user_preferences;
DROP POLICY IF EXISTS "Users can create their own preferences" ON user_preferences;
DROP POLICY IF EXISTS "Users can update their own preferences" ON user_preferences;
DROP POLICY IF EXISTS "Users can delete their own preferences" ON user_preferences;

CREATE POLICY "Users can view their own preferences" ON user_preferences
  FOR SELECT
  USING ((auth.jwt() ->> 'sub') = user_id);

CREATE POLICY "Users can create their own preferences" ON user_preferences
  FOR INSERT
  WITH CHECK ((auth.jwt() ->> 'sub') = user_id);

CREATE POLICY "Users can update their own preferences" ON user_preferences
  FOR UPDATE
  USING ((auth.jwt() ->> 'sub') = user_id)
  WITH CHECK ((auth.jwt() ->> 'sub') = user_id);

CREATE POLICY "Users can delete their own preferences" ON user_preferences
  FOR DELETE
  USING ((auth.jwt() ->> 'sub') = user_id);

-- Step 5: updated_at trigger (reuse existing function name used by other migrations)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_user_preferences_updated_at ON user_preferences;
CREATE TRIGGER update_user_preferences_updated_at
  BEFORE UPDATE ON user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();


