-- Remove tax preference columns (UI and app contract no longer expose tax settings).
ALTER TABLE user_preferences DROP COLUMN IF EXISTS tax_settings_configured;
ALTER TABLE user_preferences DROP COLUMN IF EXISTS tax_rate;
