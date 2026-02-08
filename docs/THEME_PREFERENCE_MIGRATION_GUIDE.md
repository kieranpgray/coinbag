# Theme Preference Migration Guide

## Overview

This migration converts the `dark_mode` boolean column to a `theme_preference` text enum column supporting three values: `'system'`, `'light'`, and `'dark'`.

## Migration File

**File**: `supabase/migrations/20260203135440_convert_dark_mode_to_theme_preference.sql`

## Manual Application (Recommended for Production)

### Step 1: Access Supabase Dashboard

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project: **coinbag** (auvtsvmtfrbpvgyvfqlx)
3. Navigate to **SQL Editor**

### Step 2: Apply Migration

1. Open the migration file: `supabase/migrations/20260203135440_convert_dark_mode_to_theme_preference.sql`
2. Copy the entire SQL content
3. Paste into the SQL Editor
4. Click **Run** or press `Cmd+Enter` (Mac) / `Ctrl+Enter` (Windows)

### Step 3: Verify Migration

Run this verification query in SQL Editor:

```sql
-- Verify column exists and has correct type
SELECT 
  column_name, 
  data_type, 
  column_default,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'user_preferences' 
  AND column_name = 'theme_preference';

-- Verify data migration
SELECT 
  theme_preference,
  COUNT(*) as count
FROM user_preferences
GROUP BY theme_preference;

-- Verify constraint exists
SELECT 
  constraint_name,
  constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'user_preferences' 
  AND constraint_name = 'user_preferences_theme_preference_check';
```

Expected results:
- `theme_preference` column exists with `text` type
- Default value is `'system'`
- Column is `NOT NULL`
- Data migrated: existing users have `'light'` or `'dark'` based on their old `dark_mode` value
- CHECK constraint exists

## Migration Details

### What This Migration Does

1. **Adds `theme_preference` column** (if not exists)
2. **Migrates existing data**:
   - `dark_mode = false` → `theme_preference = 'light'`
   - `dark_mode = true` → `theme_preference = 'dark'`
3. **Sets default** to `'system'` for new rows
4. **Makes column NOT NULL** after data migration
5. **Adds CHECK constraint** to ensure only valid values: `'system'`, `'light'`, `'dark'`
6. **Keeps `dark_mode` column** temporarily for backward compatibility

### Backward Compatibility

- The `dark_mode` column is **kept** for now to ensure backward compatibility
- The repository code handles both `theme_preference` and `dark_mode` columns
- After confirming all clients are updated, you can drop `dark_mode` by uncommenting the last line in the migration

## Code Changes Summary

### ✅ Completed

1. **Database Migration**: SQL migration file created
2. **TypeScript Contracts**: Updated `userPreferencesSchema` to use `themePreference` enum
3. **Repository Layer**: Updated to handle `theme_preference` with `dark_mode` fallback
4. **Theme Context**: Refactored to compute `darkMode` from `themePreference` + system preference
5. **Settings Page**: Replaced Switch with Select dropdown (System/Light/Dark)
6. **Header Toggle**: Cycles through modes: `system → light → dark → system`
7. **Type Definitions**: Updated `User` interface and mocks
8. **Test Files**: Updated test mocks

### Testing Checklist

After applying the migration:

- [ ] Verify migration applied successfully (run verification queries)
- [ ] Test new user signup (should default to 'system')
- [ ] Test existing user login (should have migrated preference)
- [ ] Test Settings page dropdown (all three options work)
- [ ] Test Header toggle button (cycles through modes)
- [ ] Test system preference detection (OS dark/light mode changes)
- [ ] Verify backward compatibility (old `dark_mode` column still exists)

## Rollback (If Needed)

If you need to rollback this migration:

```sql
-- Remove the new column and constraint
ALTER TABLE user_preferences 
DROP CONSTRAINT IF EXISTS user_preferences_theme_preference_check;

ALTER TABLE user_preferences 
DROP COLUMN IF EXISTS theme_preference;
```

**Note**: This will lose user theme preferences. Only do this if absolutely necessary.

## Next Steps

1. ✅ Apply migration via Supabase Dashboard SQL Editor
2. ✅ Verify migration with verification queries
3. ✅ Test application functionality
4. ✅ Monitor for any issues
5. ⏳ (Future) Drop `dark_mode` column after confirming all clients updated

