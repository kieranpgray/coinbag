# Fix: Superannuation Asset Type Constraint Violation

## Problem

When trying to change an asset type from "Investments" to "Superannuation", you get this error:

```
new row for relation "assets" violates check constraint "assets_type_check"
```

## Root Cause

The database constraint `assets_type_check` doesn't include 'Superannuation' because the migration hasn't been run on your local database.

## Solution

Run the migration that adds 'Superannuation' to the allowed asset types.

### Quick Fix: Run Migration Script

```bash
./scripts/run-superannuation-migration.sh
```

This script will guide you through running the migration.

### Manual Fix: Via Supabase Dashboard

1. **Go to Supabase Dashboard**:
   - Navigate to [https://app.supabase.com](https://app.supabase.com)
   - Select your project (tislabgxitwtcqfwrpik)

2. **Open SQL Editor**:
   - Click **"SQL Editor"** in the left sidebar
   - Click **"New query"**

3. **Run the Migration SQL**:
   ```sql
   -- Drop existing constraint
   ALTER TABLE assets
     DROP CONSTRAINT IF EXISTS assets_type_check;

   -- Add new constraint with Superannuation included
   ALTER TABLE assets
     ADD CONSTRAINT assets_type_check 
     CHECK (type IN ('Real Estate', 'Investments', 'Vehicles', 'Crypto', 'Cash', 'Superannuation', 'Other'));

   -- Update column comment to reflect new type
   COMMENT ON COLUMN assets.type IS 'Asset type: Real Estate, Investments, Vehicles, Crypto, Cash, Superannuation, Other';
   ```

4. **Click "Run"** (or press Cmd+Enter / Ctrl+Enter)

5. **Verify**:
   - The query should complete successfully
   - Try updating your asset again - it should work now!

### Alternative: Using Supabase CLI

If you have Supabase CLI installed:

```bash
# Link to your project (if not already linked)
supabase link --project-ref tislabgxitwtcqfwrpik

# Push all pending migrations
supabase db push
```

## Verification

After running the migration, you can verify it worked by:

1. **Check the constraint** in Supabase Dashboard → Table Editor → assets → Constraints
2. **Try updating an asset** to "Superannuation" - it should work now!

## Migration File

The migration is located at:
- `supabase/migrations/20251229160001_add_superannuation_asset_type.sql`

## Code Changes

The codebase has been updated to:
- ✅ Validate asset types before sending to database
- ✅ Provide clear error messages when constraint violations occur
- ✅ Log detailed information for debugging

Once the migration is run, the constraint violation will be resolved.

