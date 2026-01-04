-- Migration: Add locale column to user_preferences table
-- Description: Adds locale preference for localization (en-US, en-AU initially, extensible)
-- Safe to run multiple times (IF NOT EXISTS / DROP CONSTRAINT IF EXISTS).

-- Step 1: Add locale column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_preferences' AND column_name = 'locale'
  ) THEN
    ALTER TABLE user_preferences 
    ADD COLUMN locale text NOT NULL DEFAULT 'en-US';
  END IF;
END $$;

-- Step 2: Add CHECK constraint for valid locale values
-- Initially supports en-US and en-AU, but can be extended by updating this constraint
DO $$
BEGIN
  -- Drop existing constraint if it exists
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'user_preferences_locale_check'
  ) THEN
    ALTER TABLE user_preferences DROP CONSTRAINT user_preferences_locale_check;
  END IF;
  
  -- Add new constraint
  ALTER TABLE user_preferences 
  ADD CONSTRAINT user_preferences_locale_check 
  CHECK (locale IN ('en-US', 'en-AU'));
END $$;

-- Step 3: Add comment
COMMENT ON COLUMN user_preferences.locale IS 'User locale preference (en-US, en-AU). Controls date formats, currency display, and text translations.';

-- Step 4: Update existing rows to have default locale (if any exist without locale)
UPDATE user_preferences 
SET locale = 'en-US' 
WHERE locale IS NULL OR locale = '';

