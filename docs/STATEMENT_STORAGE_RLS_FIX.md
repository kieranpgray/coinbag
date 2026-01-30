# Statement Storage RLS Policy Fix

## Issue

Statement uploads are failing with the error:
```
new row violates row-level security policy
```

**Root Cause**: The RLS policies in `20251230000005_create_statement_storage_bucket.sql` use `storage.foldername(name)[1]`, which is **not a valid Supabase function**. This causes all upload attempts to be rejected by RLS.

## Solution

Created a fix migration (`20251230000006_fix_statement_storage_rls_policies.sql`) that:
1. Drops the incorrect policies
2. Recreates them using `split_part(name, '/', 1)` to extract the userId from the path

### Path Structure
Files are uploaded to: `{userId}/{accountId}/{timestamp}-{filename}`
- `split_part(name, '/', 1)` extracts the first folder (userId)
- This matches against `auth.jwt() ->> 'sub'` (the Clerk user ID)

## How to Apply the Fix

### Option 1: Supabase CLI (Recommended)
```bash
# Make sure you're linked to the project
supabase link --project-ref tislabgxitwtcqfwrpik

# Run the fix migration
./scripts/run-fix-statement-storage-rls.sh
```

### Option 2: Supabase Dashboard
1. Go to: https://supabase.com/dashboard/project/tislabgxitwtcqfwrpik/sql/new
2. Copy and paste the SQL from: `supabase/migrations/20251230000006_fix_statement_storage_rls_policies.sql`
3. Execute the SQL

### Option 3: Manual SQL Execution
Run the SQL in `supabase/migrations/20251230000006_fix_statement_storage_rls_policies.sql` via:
- Supabase Dashboard SQL Editor
- psql (if connection string is properly configured)
- Any PostgreSQL client

## Verification

After applying the fix, verify it worked:

```bash
node scripts/verify-statement-storage-fix.js
```

Or manually check in Supabase Dashboard:
- Storage → Policies → Look for policies with names containing "statement"
- They should use: `split_part(name, '/', 1)` (not `storage.foldername()`)

## What Changed

### Before (Incorrect)
```sql
(auth.jwt() ->> 'sub')::text = (storage.foldername(name))[1]
```

### After (Correct)
```sql
(auth.jwt() ->> 'sub')::text = split_part(name, '/', 1)
```

## Testing

After applying the fix:
1. Try uploading a statement file in the application
2. Verify the upload succeeds
3. Check that the file is stored at: `{userId}/{accountId}/{filename}`
4. Verify users can only access their own files

## Related Issues

The `user_preferences` 400 errors in the console are a separate issue, likely related to:
- Missing columns in the table schema (e.g., `tax_settings_configured`, `locale`, `hide_setup_checklist`)
- These columns were added in later migrations that may not have been applied

To fix user_preferences errors, ensure all migrations are applied:
```bash
supabase db push
```

## Files Modified

- `supabase/migrations/20251230000006_fix_statement_storage_rls_policies.sql` - Fix migration
- `scripts/run-fix-statement-storage-rls.sh` - Migration runner script
- `scripts/verify-statement-storage-fix.js` - Verification script




