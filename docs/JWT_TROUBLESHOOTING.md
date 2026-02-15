# JWT Validation Troubleshooting

## Current Issue

The JWT extraction test shows:
```json
{
  "status": "JWT validation NOT configured - auth.jwt() returns NULL",
  "has_sub": false,
  "full_jwt": null,
  "sub_claim": null,
  "jwt_exists": false
}
```

This means `auth.jwt()` is returning NULL, indicating JWT validation is not configured correctly.

## Troubleshooting Steps

### Step 1: Verify Configuration in Supabase Dashboard

1. **Go to Supabase Dashboard** → **Authentication**
2. **Check where Clerk was configured**:
   - Look for "External OAuth Providers" or "Third-party Auth"
   - Verify the configuration is saved
   - Check if there's a toggle to "Enable" the provider

3. **Verify the values are correct**:
   - JWKS URL: `https://clerk.supafolio.app/.well-known/jwks.json`
   - Issuer: `https://clerk.supafolio.app`
   - Audience: `ins_37VAGQw0JVza01qpTa6yUt8iVLY`

### Step 2: Check if Configuration Needs to be Enabled

Some Supabase projects require:
- Enabling the external provider
- Enabling JWT verification toggle
- Saving and waiting for propagation (2-5 minutes)

### Step 3: Test JWKS URL is Accessible

Run this in your browser or terminal:

```bash
curl https://clerk.supafolio.app/.well-known/jwks.json
```

**Expected**: Should return JSON with keys array

### Step 4: Check Supabase Logs

1. Go to Supabase Dashboard → **Logs**
2. Look for JWT validation errors
3. Check for any authentication-related errors

### Step 5: Verify You're Testing Correctly

**Important**: The SQL test in Supabase SQL Editor runs **without authentication**. 

To properly test JWT validation:

1. **Sign in to your app** (local or production)
2. **Then run the SQL query** while authenticated
3. **OR** test via your application code (see Step 6)

### Step 6: Test via Application

The SQL Editor test might not work because it's not authenticated. Test via your app instead:

1. **Start your app**: `pnpm dev`
2. **Sign in with Clerk**
3. **Open browser console** (F12)
4. **Check for JWT in requests**:
   - Go to Network tab
   - Look for Supabase API requests
   - Check Authorization header contains Bearer token
   - Verify requests succeed

5. **Create test data**:
   - Add an asset or subscription
   - If data persists, JWT validation is working
   - If you get permission errors, JWT validation isn't working

### Step 7: Alternative Configuration Method

If the UI configuration isn't working, Supabase might need configuration via API or SQL. Check:

```sql
-- Check current auth configuration
SELECT * FROM auth.config;
```

Or check if there's a way to configure via Supabase Management API.

### Step 8: Verify Clerk Configuration

Double-check in Clerk Dashboard:

1. **Domain Configuration**:
   - Settings → Domains
   - Verify `supafolio.app` is configured correctly
   - Check DNS records are verified

2. **API Keys**:
   - Verify production keys are active
   - Check Application ID matches what you configured

## Common Issues

### Issue 1: Configuration Not Saved

**Solution**: 
- Go back to Authentication settings
- Verify all fields are filled
- Click "Save" again
- Wait 2-5 minutes

### Issue 2: Wrong Configuration Location

**Solution**:
- Clerk might need to be configured under "Providers" not "External JWT"
- Or might need to be in Project Settings → API → External Auth
- Check all sections in Authentication settings

### Issue 3: Configuration Needs Propagation

**Solution**:
- Wait 5-10 minutes after saving
- Try signing out and back in
- Clear browser cache

### Issue 4: Testing Without Authentication

**Solution**:
- The SQL Editor test requires being signed in
- Test via your application instead
- Or use the browser console while signed in

## Next Steps

1. **Verify configuration is saved** in Supabase Dashboard
2. **Wait 5 minutes** for propagation
3. **Test via your application** (not SQL Editor) - sign in and create data
4. **Check Supabase Logs** for any errors
5. **Verify JWKS URL** is accessible

## If Still Not Working

If JWT validation still doesn't work after troubleshooting:

1. **Contact Supabase Support** - They can verify the configuration
2. **Check Supabase Documentation** - The UI might have changed
3. **Verify via API** - Check if configuration can be set via Management API

## Quick Test: Create Data via App

The best test is to use your application:

1. Sign in to your app
2. Try to create an asset or subscription
3. If it works → JWT validation is working (even if SQL test shows NULL)
4. If it fails with permission errors → JWT validation needs fixing

The SQL Editor test might not work because it's not sending the Clerk JWT. Your application code does send it, so that's the real test.

