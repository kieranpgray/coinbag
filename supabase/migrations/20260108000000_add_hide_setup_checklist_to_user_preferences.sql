-- Migration: Add hide_setup_checklist column to user_preferences table
-- Description: Allows users to dismiss the setup checklist permanently
-- Safe to run multiple times (IF NOT EXISTS).

-- Step 1: Add hide_setup_checklist column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_preferences' AND column_name = 'hide_setup_checklist'
  ) THEN
    ALTER TABLE user_preferences 
    ADD COLUMN hide_setup_checklist boolean NOT NULL DEFAULT false;
  END IF;
END $$;

-- Step 2: Add comment
COMMENT ON COLUMN user_preferences.hide_setup_checklist IS 'If true, user has dismissed the setup checklist and it should not be shown again.';




