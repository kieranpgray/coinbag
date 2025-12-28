# Assets Supabase Implementation - Setup Guide

## Overview

This guide walks you through setting up and verifying the Supabase assets persistence implementation. Assets will now persist across server restarts, browser sessions, and user logout/login cycles.

## Improvements Made

### 1. **Error Handling**
- Added null checks after database operations
- Enhanced error normalization with more specific error codes
- Better error messages for common scenarios (auth, permissions, validation)

### 2. **Data Validation**
- Added value precision validation (max 99,999,999.99)
- Enhanced date validation to prevent invalid calendar dates
- Consistent empty string → null normalization

### 3. **Code Quality**
- Extracted entity-to-domain mapping to reduce duplication
- Added JSDoc comments for better documentation
- Improved type safety with helper methods

### 4. **Migration Safety**
- Added check for existing trigger function before creating trigger
- Ensures migration can run even if subscriptions migration hasn't run

## Prerequisites

1. **Supabase Project**: You need a Supabase project with Clerk JWT configured
2. **Environment Variables**: Ensure `.env` has:
   ```bash
   VITE_DATA_SOURCE=supabase
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your_anon_key
   VITE_CLERK_PUBLISHABLE_KEY=your_clerk_key
   ```

3. **Clerk JWT Configuration**: Supabase must be configured to validate Clerk JWTs
   - See `docs/SUPABASE_SETUP.md` for details
   - JWT must map Clerk user ID to `auth.jwt() ->> 'sub'`

## Step-by-Step Setup

### Step 1: Run Database Migration

**Option A: Using Supabase CLI** (Recommended)
```bash
# If you have Supabase CLI installed
supabase db push

# Or link to your project and run migrations
supabase link --project-ref your-project-ref
supabase db push
```

**Option B: Using Supabase Dashboard**
1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy the contents of `supabase/migrations/20251228110046_create_assets_table.sql`
4. Paste and execute the SQL

**Option C: Using psql**
```bash
psql -h db.your-project.supabase.co -U postgres -d postgres -f supabase/migrations/20251228110046_create_assets_table.sql
```

### Step 2: Verify Migration Success

Run this query in Supabase SQL Editor to verify:
```sql
-- Check table exists
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name = 'assets';

-- Check RLS is enabled
SELECT tablename, rowsecurity FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'assets';

-- Check policies exist
SELECT policyname FROM pg_policies 
WHERE tablename = 'assets';

-- Should return 4 policies:
-- - Users can view their own assets
-- - Users can create their own assets
-- - Users can update their own assets
-- - Users can delete their own assets
```

### Step 3: Verify Clerk JWT Configuration

**Critical**: RLS policies use `(auth.jwt() ->> 'sub') = user_id`, which requires Clerk JWT to be configured in Supabase.

1. Go to Supabase Dashboard → Authentication → Providers
2. Ensure JWT is configured to validate Clerk tokens
3. Test with a query:
   ```sql
   -- This should return your Clerk user ID when authenticated
   SELECT auth.jwt() ->> 'sub' as user_id;
   ```

If this doesn't work, see `docs/SUPABASE_SETUP.md` for Clerk JWT configuration.

### Step 4: Test the Implementation

1. **Start Dev Server**:
   ```bash
   VITE_DEBUG_LOGGING=true npm run dev
   ```

2. **Create an Asset**:
   - Navigate to `/assets`
   - Click "Add New Asset"
   - Fill in form and submit
   - Verify asset appears in list

3. **Check Browser Console**:
   - Look for `[INFO] DB:ASSET_INSERT` logs
   - Verify `repoType: 'SupabaseAssetsRepository'`
   - Check for any error messages

4. **Verify Persistence**:
   - **Server Restart**: Stop dev server, restart, verify asset still exists
   - **Browser Session**: Close browser completely, reopen, login, verify asset exists
   - **Logout/Login**: Log out, log back in, verify asset persists

5. **Check Database**:
   ```sql
   -- View your assets (replace with your user_id)
   SELECT * FROM assets WHERE user_id = 'your_clerk_user_id';
   ```

### Step 5: Verify RLS Policies

Test that users can only see their own assets:

1. **Create asset as User A**
2. **Switch to User B** (different Clerk account)
3. **Verify User B cannot see User A's assets**
4. **Verify User B cannot update/delete User A's assets**

## Troubleshooting

### Issue: "Authentication token expired"
**Solution**: 
- Verify Clerk JWT is configured in Supabase
- Check that `VITE_CLERK_PUBLISHABLE_KEY` is correct
- Ensure user is signed in

### Issue: "Permission denied" errors
**Solution**:
- Verify RLS policies are created correctly
- Check that `auth.jwt() ->> 'sub'` returns the Clerk user ID
- Ensure user_id column has default value set

### Issue: "Invalid data received from server"
**Solution**:
- Check browser console for validation errors
- Verify database column types match expected types
- Check that date format is YYYY-MM-DD

### Issue: Migration fails with "function already exists"
**Solution**:
- This is expected if subscriptions migration ran first
- The migration includes a check to handle this gracefully
- If it still fails, the function already exists and is fine

### Issue: Assets not persisting
**Solution**:
1. Verify `VITE_DATA_SOURCE=supabase` in `.env`
2. Restart dev server after changing env vars
3. Check browser console for errors
4. Verify migration ran successfully
5. Check Supabase logs for errors

## Rollback Plan

If you need to rollback:

1. **Switch back to mock repository**:
   ```bash
   # In .env
   VITE_DATA_SOURCE=mock
   ```

2. **Rollback migration** (if needed):
   ```sql
   SELECT rollback_assets_migration();
   ```

3. **Restart dev server**

## Next Steps

After verifying everything works:

1. **Test all CRUD operations**:
   - Create, Read, Update, Delete assets
   - Verify each operation works correctly

2. **Test edge cases**:
   - Very large values (test precision limits)
   - Invalid dates
   - Empty strings for optional fields
   - Special characters in names/notes

3. **Monitor performance**:
   - Check query performance in Supabase dashboard
   - Verify indexes are being used
   - Monitor RLS policy performance

4. **Consider adding**:
   - Unit tests for repository
   - Integration tests for full flow
   - Performance tests for large datasets

## Success Criteria

✅ Assets persist across server restarts  
✅ Assets persist across browser sessions  
✅ Assets persist across user logout/login  
✅ Users can only see their own assets (RLS working)  
✅ All CRUD operations work correctly  
✅ Error handling provides clear messages  
✅ No data loss when switching between mock and Supabase  

## Support

If you encounter issues:
1. Check browser console for detailed error messages
2. Check Supabase dashboard → Logs for database errors
3. Verify all environment variables are set correctly
4. Ensure Clerk JWT is properly configured in Supabase

