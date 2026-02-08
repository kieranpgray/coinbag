-- Migration: Convert dark_mode boolean to theme_preference enum
-- Description: Replaces boolean dark_mode with theme_preference text enum ('system', 'light', 'dark')
-- Safe to run multiple times (IF NOT EXISTS / DROP CONSTRAINT IF EXISTS).

-- Step 1: Add theme_preference column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_preferences' AND column_name = 'theme_preference'
  ) THEN
    ALTER TABLE user_preferences 
    ADD COLUMN theme_preference text;
  END IF;
END $$;

-- Step 2: Migrate existing data from dark_mode to theme_preference
-- false -> 'light', true -> 'dark'
UPDATE user_preferences 
SET theme_preference = CASE 
  WHEN dark_mode = true THEN 'dark'
  WHEN dark_mode = false THEN 'light'
  ELSE 'system'
END
WHERE theme_preference IS NULL;

-- Step 3: Set default for new rows
ALTER TABLE user_preferences 
ALTER COLUMN theme_preference SET DEFAULT 'system';

-- Step 4: Make column NOT NULL after data migration
ALTER TABLE user_preferences 
ALTER COLUMN theme_preference SET NOT NULL;

-- Step 5: Add CHECK constraint for valid values
DO $$
BEGIN
  -- Drop existing constraint if it exists
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'user_preferences_theme_preference_check'
  ) THEN
    ALTER TABLE user_preferences DROP CONSTRAINT user_preferences_theme_preference_check;
  END IF;
  
  -- Add new constraint
  ALTER TABLE user_preferences 
  ADD CONSTRAINT user_preferences_theme_preference_check 
  CHECK (theme_preference IN ('system', 'light', 'dark'));
END $$;

-- Step 6: Add comment
COMMENT ON COLUMN user_preferences.theme_preference IS 'Theme preference: system (follows OS), light, or dark. Defaults to system for new users.';

-- Step 7: Drop old dark_mode column (after migration is complete and app is updated)
-- Note: We keep this commented out initially for backward compatibility during deployment
-- Uncomment after confirming all clients are updated to use theme_preference
-- ALTER TABLE user_preferences DROP COLUMN IF EXISTS dark_mode;

