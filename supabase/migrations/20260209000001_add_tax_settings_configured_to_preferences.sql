-- Migration: Add tax_settings_configured column to user_preferences table
-- Description: Adds missing tax_settings_configured column that code expects
-- Safe to run multiple times (IF NOT EXISTS)

ALTER TABLE user_preferences 
ADD COLUMN IF NOT EXISTS tax_settings_configured boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN user_preferences.tax_settings_configured IS 'Whether user has configured tax settings';
