# Clerk + Supabase JWT Configuration Guide

This guide provides step-by-step instructions for configuring Supabase to validate Clerk JWTs. **This configuration is REQUIRED for data persistence to work.**

## Why This Is Required

Supabase uses Row Level Security (RLS) policies that rely on `auth.jwt() ->> 'sub'` to extract the Clerk user ID. Without JWT validation configured:
- `auth.jwt()` returns `NULL`
- All RLS policies fail (NULL != user_id)
- Data cannot be read or written correctly
- Users see empty data even though data might exist in the database

## Prerequisites

- Supabase project created
- Clerk application created
- Access to both Supabase Dashboard and Clerk Dashboard

## Step 1: Get Clerk JWT Configuration

1. **Go to Clerk Dashboard**:
   - Navigate to [https://dashboard.clerk.com](https://dashboard.clerk.com)
   - Select your application

2. **Get JWKS URL**:
   - The JWKS URL follows this pattern: `https://<your-clerk-domain>/.well-known/jwks.json`
   - For example: `https://secure-tapir-36.clerk.accounts.dev/.well-known/jwks.json`
   - You can find your domain in Clerk Dashboard → Settings → Domains
   - Or check your `.env` file for `VITE_CLERK_PUBLISHABLE_KEY` - the domain is in the key

3. **Get Issuer**:
   - The issuer is your Clerk domain: `https://<your-clerk-domain>`
   - Example: `https://secure-tapir-36.clerk.accounts.dev`

4. **Get Audience (Optional but Recommended)**:
   - Go to Clerk Dashboard → API Keys
   - Find your Application ID (this is your audience)
   - Example: `clerk_xxxxxxxxxxxxx`

## Step 2: Configure Supabase JWT Validation

1. **Go to Supabase Dashboard**:
   - Navigate to [https://app.supabase.com](https://app.supabase.com)
   - Select your project

2. **Navigate to Authentication Settings**:
   - Go to **Authentication** → **Settings** (in the left sidebar)
   - Scroll down to **"JWT Settings"** or **"JWKS URL"** section

3. **Configure JWKS URL**:
   - Find the **"JWKS URL"** field
   - Enter your Clerk JWKS URL: `https://<your-clerk-domain>/.well-known/jwks.json`
   - Example: `https://secure-tapir-36.clerk.accounts.dev/.well-known/jwks.json`

4. **Configure Issuer** (if available):
   - Find the **"Issuer"** field
   - Enter your Clerk issuer: `https://<your-clerk-domain>`
   - Example: `https://secure-tapir-36.clerk.accounts.dev`

5. **Configure Audience** (if available):
   - Find the **"Audience"** field
   - Enter your Clerk Application ID
   - This is optional but recommended for security

6. **Enable JWT Verification**:
   - Make sure **"Enable JWT verification"** or similar toggle is enabled
   - Some Supabase projects have this enabled by default

7. **Save Changes**:
   - Click **"Save"** or **"Update"** button
   - Wait for confirmation that settings were saved

## Step 3: Verify Configuration

### Option A: Test via SQL Editor (Recommended)

1. **Go to Supabase Dashboard → SQL Editor**

2. **Run this SQL query**:
   ```sql
   -- Test if auth.jwt() function works
   SELECT 
     auth.jwt() ->> 'sub' as user_id,
     auth.jwt() ->> 'exp' as expires_at,
     CASE 
       WHEN auth.jwt() IS NULL THEN '❌ JWT validation NOT configured'
       WHEN auth.jwt() ->> 'sub' IS NULL THEN '⚠️  JWT validated but missing sub claim'
       ELSE '✅ JWT validation working'
     END as status;
   ```

3. **Expected Result**:
   - If JWT validation is **NOT configured**: `user_id` will be `NULL` and status will be `❌ JWT validation NOT configured`
   - If JWT validation **IS configured**: `user_id` will show a Clerk user ID (when authenticated) or `NULL` (when not authenticated), and status will be `✅ JWT validation working`

**Note**: This test requires an authenticated request. For a full test, use Option B.

### Option B: Test via Browser Console

1. **Start your dev server**: `npm run dev`

2. **Sign in with Clerk** in your app

3. **Open browser console** (F12)

4. **Run the test code** from `scripts/test-jwt-validation.ts` (see that file for the code)

5. **Check results**:
   - If JWT validation works: You should see your user ID and successful queries
   - If JWT validation doesn't work: You'll see errors about JWT or permissions

### Option C: Test via RPC Function

1. **Run the migration**: `supabase/migrations/20251228170000_test_jwt_extraction_function.sql`
   - Go to Supabase Dashboard → SQL Editor
   - Copy and paste the migration SQL
   - Run it

2. **Test the function** (requires being signed in):
   ```sql
   SELECT test_jwt_extraction();
   ```

3. **Check the result**:
   - `jwt_exists: true` means JWT validation is configured
   - `has_sub: true` means the sub claim is being extracted correctly
   - `status` will indicate if everything is working

## Step 4: Troubleshooting

### Issue: `auth.jwt()` returns NULL

**Symptoms**: 
- SQL query shows `user_id` as NULL
- Status shows "❌ JWT validation NOT configured"

**Solutions**:
1. Verify JWKS URL is correct (check for typos)
2. Verify Issuer matches your Clerk domain exactly
3. Check Supabase logs for JWT validation errors
4. Try disabling and re-enabling JWT verification
5. Wait a few minutes after saving (configuration can take time to propagate)

### Issue: JWT validated but `sub` claim is NULL

**Symptoms**:
- `auth.jwt()` returns a value but `auth.jwt() ->> 'sub'` is NULL
- Status shows "⚠️ JWT validated but missing sub claim"

**Solutions**:
1. Verify the JWT token actually contains a `sub` claim (check in browser console)
2. Check if Clerk is issuing tokens with the correct format
3. Verify Audience matches your Clerk Application ID

### Issue: RLS policies still blocking

**Symptoms**:
- JWT validation works (auth.jwt() returns value)
- But RLS policies still block queries

**Solutions**:
1. Verify RLS policies use correct syntax: `(auth.jwt() ->> 'sub') = user_id`
2. Check if `user_id` values in database match Clerk user IDs
3. Verify policies are enabled: `ALTER TABLE <table> ENABLE ROW LEVEL SECURITY;`
4. Check Supabase logs for RLS policy violations

### Issue: Configuration saved but not working

**Solutions**:
1. Wait 2-5 minutes for configuration to propagate
2. Clear browser cache and cookies
3. Sign out and sign back in to get a fresh JWT
4. Check Supabase Dashboard → Logs for errors
5. Verify you're using the correct Supabase project

## Step 5: Verify Data Persistence

After configuring JWT validation:

1. **Create test data**:
   - Sign in to your app
   - Create an asset, liability, income, subscription, or goal

2. **Verify data appears**:
   - Check that data shows up immediately

3. **Test persistence**:
   - Logout
   - Login again
   - Verify data is still present

4. **Check database**:
   - Go to Supabase Dashboard → Table Editor
   - Verify data exists with correct `user_id` values

## Quick Reference

### Clerk Configuration Values

For the example project (`secure-tapir-36.clerk.accounts.dev`):

- **JWKS URL**: `https://secure-tapir-36.clerk.accounts.dev/.well-known/jwks.json`
- **Issuer**: `https://secure-tapir-36.clerk.accounts.dev`
- **Audience**: (Your Clerk Application ID from API Keys)

### Supabase Dashboard Path

1. Go to: [https://app.supabase.com](https://app.supabase.com)
2. Select your project
3. Navigate to: **Authentication** → **Settings**
4. Scroll to: **"JWT Settings"** or **"JWKS URL"**

### Verification SQL

```sql
-- Quick test
SELECT 
  auth.jwt() IS NOT NULL as jwt_configured,
  auth.jwt() ->> 'sub' as user_id,
  CASE 
    WHEN auth.jwt() IS NULL THEN 'NOT CONFIGURED'
    WHEN auth.jwt() ->> 'sub' IS NULL THEN 'CONFIGURED BUT NO SUB'
    ELSE 'WORKING'
  END as status;
```

## Additional Resources

- [Supabase JWT Documentation](https://supabase.com/docs/guides/auth/jwts)
- [Clerk JWT Documentation](https://clerk.com/docs/backend-requests/making/jwt)
- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)

## Support

If you continue to have issues:

1. Run diagnostic script: `npx tsx scripts/diagnose-persistence.ts`
2. Run JWT test: `npx tsx scripts/test-jwt-validation.ts`
3. Check browser console for errors (with `VITE_DEBUG_LOGGING=true`)
4. Check Supabase Dashboard → Logs for database errors
5. Verify all environment variables are set correctly

