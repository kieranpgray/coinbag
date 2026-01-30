# PostgREST Schema Cache Fix

## Issue

PostgREST is returning error: `Could not find the table 'public.transactions' in the schema cache` (PGRST205)

This happens when PostgREST's schema cache hasn't been refreshed after creating a new table.

## Solution

### Step 1: Verify Table Exists

Run this SQL in Supabase Dashboard → SQL Editor:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'transactions';
```

**Expected**: Should return 1 row with `transactions`

If the table doesn't exist, run the migration:
```sql
-- Run the transactions table migration
-- Copy contents from: supabase/migrations/20251230000000_create_transactions_table.sql
```

### Step 2: Refresh PostgREST Schema Cache

PostgREST's schema cache usually refreshes automatically, but if it hasn't:

#### Option A: Wait (Recommended)
- PostgREST refreshes its cache automatically every few minutes
- Wait 2-5 minutes and try again
- The retry logic in the Edge Function will handle temporary cache issues

#### Option B: Trigger Refresh via API (If Available)
Some Supabase projects have a schema refresh endpoint. Check your Supabase Dashboard → API → Settings for schema refresh options.

#### Option C: Restart PostgREST (Requires Admin Access)
If you have admin access to your Supabase project:
1. Go to Supabase Dashboard → Project Settings → Infrastructure
2. Look for PostgREST service restart option
3. Or contact Supabase support to refresh the schema cache

### Step 3: Verify PostgREST Can See the Table

Test if PostgREST can access the table:

```bash
# Replace with your actual values
curl -X GET 'https://your-project.supabase.co/rest/v1/transactions?select=id&limit=1' \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Expected**: Should return `[]` (empty array) or transaction data, NOT a 404 error

### Step 4: Edge Function Retry Logic

The Edge Function now includes retry logic for schema cache errors:
- Automatically retries up to 3 times with exponential backoff
- Waits 1s, 2s, 4s between retries
- Logs schema cache errors for debugging

## Prevention

To prevent this issue in the future:

1. **Always run migrations via Supabase CLI**: `supabase db push`
   - This ensures PostgREST's cache is refreshed automatically

2. **Or run migrations via Supabase Dashboard SQL Editor**
   - Supabase Dashboard triggers PostgREST cache refresh automatically

3. **Wait a few minutes after creating tables** before using them in Edge Functions

## Current Status

✅ Edge Function updated with retry logic for schema cache errors
⏳ Waiting for PostgREST schema cache to refresh automatically
✅ Table exists (verified via migration)

## Next Steps

1. Wait 2-5 minutes for PostgREST cache to refresh
2. Try uploading a statement again
3. Check Edge Function logs for retry attempts
4. If still failing after 5 minutes, contact Supabase support

