# Statement Storage Bucket Fix

## Issue
Statement uploads are failing with "bucket not found" error. The `statements` storage bucket does not exist in the Supabase project.

## Root Cause
The migration `20251230000005_create_statement_storage_bucket.sql` has not been executed in the development project (`tislabgxitwtcqfwrpik`).

## Solution Applied

### 1. Enhanced Error Logging ✅
- Added comprehensive error logging in `src/lib/statementUpload.ts`
- Logs now include:
  - Bucket existence check before upload
  - Full error details (statusCode, responseBody, context)
  - Available buckets list when bucket is missing
  - User ID and account ID for debugging
- Console errors always logged (not gated by debug flag)

### 2. Bucket Existence Check ✅
- Added pre-upload bucket verification
- Provides clear error message if bucket doesn't exist
- Lists available buckets for debugging

### 3. Migration Scripts Created ✅
- `scripts/run-statement-bucket-migration.sh` - Supabase CLI migration runner
- `scripts/create-statement-bucket-direct.js` - Verification and SQL display script

## Action Required

### Option 1: Supabase Dashboard (Recommended)
1. Go to: https://supabase.com/dashboard/project/tislabgxitwtcqfwrpik/sql/new
2. Copy and paste the SQL from: `supabase/migrations/20251230000005_create_statement_storage_bucket.sql`
3. Execute the SQL

### Option 2: Supabase CLI
```bash
# Link to project (if not already linked)
supabase link --project-ref tislabgxitwtcqfwrpik --password 'tfq1azv-zdr@UJE1uxp'

# Push migrations (may have conflicts with existing migrations)
supabase db push -p 'tfq1azv-zdr@UJE1uxp' --yes
```

### Option 3: Manual SQL Execution
Run the SQL in `supabase/migrations/20251230000005_create_statement_storage_bucket.sql` via:
- Supabase Dashboard SQL Editor
- psql (if connection string is properly configured)
- Any PostgreSQL client

## Verification

After creating the bucket, verify it exists:

```bash
node scripts/create-statement-bucket-direct.js
```

Or check in Supabase Dashboard:
- Storage → Buckets → Should see "statements" bucket
- Storage → Policies → Should see 4 RLS policies for statements bucket

## What the Migration Creates

1. **Storage Bucket**: `statements`
   - Private bucket (not public)
   - 10MB file size limit
   - Allowed types: PDF, JPEG, PNG, JPG

2. **RLS Policies** (4 policies):
   - Users can upload their own statement files
   - Users can view their own statement files
   - Users can update their own statement files
   - Users can delete their own statement files

## Enhanced Logging Output

When uploads are attempted, you'll now see in the console:
- `[UPLOAD:STATEMENT]` prefixed logs
- Bucket existence check results
- Full error details including statusCode and responseBody
- Available buckets list if bucket is missing

## Next Steps

1. ✅ Enhanced logging - **COMPLETE**
2. ⏳ Create bucket via SQL - **REQUIRES MANUAL ACTION**
3. ⏳ Verify bucket exists - **AFTER CREATION**
4. ⏳ Test upload functionality - **AFTER VERIFICATION**

## Files Modified

- `src/lib/statementUpload.ts` - Enhanced error logging and bucket check
- `scripts/run-statement-bucket-migration.sh` - Migration runner script
- `scripts/create-statement-bucket-direct.js` - Verification script

