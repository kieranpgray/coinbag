# Theme Preference Migration - Verification Steps

## ✅ Migration Applied Successfully

The `theme_preference` migration has been applied to the database.

## Verification Queries

Run these in Supabase SQL Editor to verify:

### 1. Check Column Exists
```sql
SELECT 
  column_name, 
  data_type, 
  column_default,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'user_preferences' 
  AND column_name = 'theme_preference';
```

**Expected**: Should show `theme_preference` with type `text`, default `'system'`, and `is_nullable = NO`

### 2. Check Data Migration
```sql
SELECT 
  theme_preference,
  COUNT(*) as count
FROM user_preferences
GROUP BY theme_preference;
```

**Expected**: Should show counts for `'light'` and/or `'dark'` (migrated from old `dark_mode` values)

### 3. Check Constraint
```sql
SELECT 
  constraint_name,
  constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'user_preferences' 
  AND constraint_name = 'user_preferences_theme_preference_check';
```

**Expected**: Should show the CHECK constraint exists

### 4. Verify Default for New Rows
```sql
-- This should return 'system' as the default
SELECT column_default
FROM information_schema.columns
WHERE table_name = 'user_preferences' 
  AND column_name = 'theme_preference';
```

## Application Testing Checklist

- [ ] **New User Signup**: Verify new users default to 'system' theme preference
- [ ] **Existing User Login**: Verify existing users have their preferences migrated (light/dark)
- [ ] **Settings Page**: 
  - [ ] Dropdown shows three options: System, Light, Dark
  - [ ] Current selection is displayed correctly
  - [ ] Changing selection saves correctly
- [ ] **Header Toggle Button**:
  - [ ] Cycles through: system → light → dark → system
  - [ ] Icon reflects current effective theme
- [ ] **System Preference Detection**:
  - [ ] When set to 'system', theme follows OS dark/light mode
  - [ ] Changing OS theme updates app theme automatically
- [ ] **Theme Application**:
  - [ ] Dark mode class is applied/removed correctly
  - [ ] UI reflects theme changes immediately

## Rollback Plan (If Needed)

If issues are discovered, you can rollback:

```sql
-- Remove the new column and constraint
ALTER TABLE user_preferences 
DROP CONSTRAINT IF EXISTS user_preferences_theme_preference_check;

ALTER TABLE user_preferences 
DROP COLUMN IF EXISTS theme_preference;
```

**Note**: This will lose user theme preferences. Only use if absolutely necessary.

## Next Steps

1. ✅ Migration applied
2. ⏳ Verify with queries above
3. ⏳ Test application functionality
4. ⏳ Monitor for any issues
5. ⏳ (Future) After confirming all clients updated, drop `dark_mode` column

## Future Cleanup

Once all clients are confirmed to be using `theme_preference`, you can drop the old column:

```sql
ALTER TABLE user_preferences DROP COLUMN IF EXISTS dark_mode;
```

This should only be done after:
- All application instances are updated
- All mobile apps (if any) are updated
- Monitoring shows no errors related to `dark_mode`

