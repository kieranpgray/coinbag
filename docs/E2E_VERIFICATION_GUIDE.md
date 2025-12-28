# End-to-End Data Persistence Verification Guide

This guide provides step-by-step instructions to verify that data persistence is working correctly after configuring Supabase JWT validation.

## Prerequisites

- ✅ Supabase JWT validation configured (see `docs/CLERK_SUPABASE_JWT_SETUP.md`)
- ✅ All migrations run
- ✅ Dev server running: `npm run dev`
- ✅ Signed in with Clerk

## Step 1: Pre-Verification Checks

### 1.1 Verify JWT Validation is Configured

Run this SQL in Supabase Dashboard → SQL Editor:

```sql
SELECT 
  auth.jwt() IS NOT NULL as jwt_configured,
  auth.jwt() ->> 'sub' as user_id,
  CASE 
    WHEN auth.jwt() IS NULL THEN '❌ NOT CONFIGURED'
    WHEN auth.jwt() ->> 'sub' IS NULL THEN '⚠️ CONFIGURED BUT NO SUB'
    ELSE '✅ WORKING'
  END as status;
```

**Expected**: Status should be `✅ WORKING` (or at least `jwt_configured` should be `true`)

### 1.2 Check Current Data State

Run diagnostic script:

```bash
npx tsx scripts/diagnose-persistence.ts
```

**Expected**: Should show tables exist and optionally data counts (if service role key provided)

### 1.3 Enable Debug Logging

Set in `.env`:

```bash
VITE_DEBUG_LOGGING=true
```

Restart dev server to enable verbose logging.

## Step 2: Create Test Data

### 2.1 Create Assets

1. Navigate to `/assets` page
2. Click "Add asset"
3. Fill in form:
   - Name: "Test Asset 1"
   - Type: "Other"
   - Value: 1000
   - Date Added: Today's date
4. Click "Save"
5. **Verify**: Asset appears in list immediately

### 2.2 Create Liabilities

1. Navigate to `/liabilities` page
2. Click "Add liability"
3. Fill in form:
   - Name: "Test Loan 1"
   - Type: "Loans"
   - Balance: 5000
4. Click "Save"
5. **Verify**: Liability appears in list immediately

### 2.3 Create Income

1. Navigate to `/income` page
2. Click "Add income"
3. Fill in form:
   - Name: "Test Salary"
   - Source: "Salary"
   - Amount: 5000
   - Frequency: "monthly"
   - Next Payment Date: Next month
4. Click "Save"
5. **Verify**: Income appears in list immediately

### 2.4 Create Subscriptions

1. Navigate to `/subscriptions` page
2. Click "Add subscription"
3. Fill in form:
   - Name: "Test Subscription"
   - Amount: 15
   - Frequency: "monthly"
   - Category: "Entertainment"
4. Click "Save"
5. **Verify**: Subscription appears in list immediately

### 2.5 Create Goals

1. Navigate to `/goals` page
2. Click "Add goal"
3. Fill in form:
   - Name: "Test Goal"
   - Type: "Save"
   - Target Amount: 10000
4. Click "Save"
5. **Verify**: Goal appears in list immediately

## Step 3: Verify Data in Database

### 3.1 Check Supabase Dashboard

1. Go to Supabase Dashboard → Table Editor
2. Check each table:
   - `assets` - Should show "Test Asset 1"
   - `liabilities` - Should show "Test Loan 1"
   - `income` - Should show "Test Salary"
   - `subscriptions` - Should show "Test Subscription"
   - `goals` - Should show "Test Goal"
3. **Verify**: All records have `user_id` set to your Clerk user ID (not NULL)

### 3.2 Check Browser Console

With `VITE_DEBUG_LOGGING=true`, check browser console for:
- ✅ JWT token retrieved successfully
- ✅ JWT contains `sub` claim
- ✅ Queries succeed (no RLS errors)
- ✅ Data returned from Supabase

## Step 4: Test Persistence - Logout/Login

### 4.1 Logout

1. Click logout/sign out button
2. **Verify**: Redirected to sign-in page
3. **Verify**: All data disappears from UI (expected - not signed in)

### 4.2 Login Again

1. Sign in with the **same Clerk account**
2. **Verify**: Redirected to dashboard
3. Navigate to each page:
   - `/assets` - Should show "Test Asset 1"
   - `/liabilities` - Should show "Test Loan 1"
   - `/income` - Should show "Test Salary"
   - `/subscriptions` - Should show "Test Subscription"
   - `/goals` - Should show "Test Goal"

### 4.3 Verify Dashboard

1. Navigate to `/dashboard`
2. **Verify**: Dashboard shows correct aggregations:
   - Total Assets includes "Test Asset 1" ($1000)
   - Total Debts includes "Test Loan 1" ($5000)
   - Income Breakdown shows "Test Salary"
   - Expense Breakdown shows "Test Subscription"

## Step 5: Test Persistence - Server Restart

### 5.1 Restart Dev Server

1. Stop dev server (Ctrl+C)
2. Start again: `npm run dev`
3. **Verify**: Server starts successfully

### 5.2 Refresh Browser

1. Refresh browser (F5)
2. **Verify**: Still signed in (Clerk session persists)
3. **Verify**: All data still present

## Step 6: Test User Isolation

### 6.1 Create Second User (Optional)

1. Sign out
2. Create a new Clerk account (or use a different account)
3. Sign in with second account
4. **Verify**: Dashboard shows empty/zero data
5. **Verify**: No data from first account is visible

### 6.2 Switch Back to First User

1. Sign out
2. Sign in with first account
3. **Verify**: All original data is still present
4. **Verify**: No data from second account is visible

## Step 7: Verify RLS Policies

### 7.1 Test Direct Database Query

Run this SQL in Supabase Dashboard → SQL Editor (while signed in as first user):

```sql
-- This should only return data for the authenticated user
SELECT id, name, user_id FROM assets;
```

**Expected**: Should only show assets with your Clerk user ID

### 7.2 Test Cross-User Access Prevention

If you have a second user:
1. Sign in as second user
2. Try to access first user's data via API
3. **Verify**: Cannot see first user's data (RLS blocks it)

## Step 8: Final Verification Checklist

- [ ] ✅ JWT validation configured in Supabase
- [ ] ✅ All test data created successfully
- [ ] ✅ Data appears immediately after creation
- [ ] ✅ Data persists after logout/login
- [ ] ✅ Data persists after server restart
- [ ] ✅ Data persists after browser refresh
- [ ] ✅ User isolation works (users can't see each other's data)
- [ ] ✅ Dashboard shows correct aggregations
- [ ] ✅ No RLS errors in browser console
- [ ] ✅ No NULL user_id values in database
- [ ] ✅ All tables have correct user_id values

## Troubleshooting

### Issue: Data Doesn't Persist After Logout/Login

**Check**:
1. Is JWT validation configured? (Run SQL test from Step 1.1)
2. Check browser console for RLS errors
3. Check Supabase Dashboard → Logs for errors
4. Verify `user_id` values in database match Clerk user ID

**Fix**:
1. Configure JWT validation (see `docs/CLERK_SUPABASE_JWT_SETUP.md`)
2. If data has NULL user_id, run data recovery migration
3. Re-test after fixing

### Issue: RLS Errors in Console

**Symptoms**: Console shows "permission denied" or "policy violation" errors

**Fix**:
1. Verify JWT validation is configured
2. Check if `auth.jwt() ->> 'sub'` returns your user ID
3. Verify RLS policies are enabled
4. Check Supabase logs for details

### Issue: Data Exists But Not Visible

**Symptoms**: Data exists in database but doesn't appear in UI

**Check**:
1. Verify `user_id` matches your Clerk user ID
2. Check browser console for errors
3. Verify JWT is being sent correctly
4. Check if RLS policies are blocking

**Fix**:
1. Fix `user_id` values if incorrect
2. Configure JWT validation if not configured
3. Re-test

## Success Criteria

✅ **All criteria must pass**:

1. Data created successfully
2. Data visible immediately after creation
3. Data persists after logout/login
4. Data persists after server restart
5. Data persists after browser refresh
6. Users cannot see each other's data
7. No RLS errors in console
8. No NULL user_id values in database

## Next Steps

After verification:
1. Remove test data (optional)
2. Disable debug logging: `VITE_DEBUG_LOGGING=false`
3. Continue using the app normally
4. Monitor for any persistence issues

## Support

If verification fails:
1. Run diagnostic script: `npx tsx scripts/diagnose-persistence.ts`
2. Check JWT validation: `npx tsx scripts/test-jwt-validation.ts`
3. Review setup guide: `docs/CLERK_SUPABASE_JWT_SETUP.md`
4. Check browser console (with debug logging enabled)
5. Check Supabase Dashboard → Logs

