# 🔧 Configure Clerk JWT Validation in Supabase - ACTION REQUIRED

## Current Status
❌ **JWT validation is NOT configured** - This is why statement uploads are failing with RLS policy errors.

## Why This Is Critical
Without Clerk JWT validation:
- `auth.jwt()` returns `NULL` in Supabase
- All RLS policies fail (they check `auth.jwt() ->> 'sub'`)
- Statement uploads are blocked
- Data operations may fail

## Step-by-Step Configuration

### Step 1: Get Your Clerk Domain

**Option A: From Clerk Dashboard**
1. Go to [https://dashboard.clerk.com](https://dashboard.clerk.com)
2. Select your application
3. Go to **Settings** → **Domains**
4. Copy your Clerk domain (e.g., `clerk.supafolio.app` or `xxxxx.clerk.accounts.dev`)

**Option B: From Your Publishable Key**
- Your Clerk publishable key format: `pk_test_xxxxx` or `pk_live_xxxxx`
- The domain is embedded in the key or can be found in Clerk Dashboard → API Keys

### Step 2: Get Your Clerk Application ID (Audience)

1. In Clerk Dashboard, go to **API Keys**
2. Find your **Application ID** (format: `clerk_xxxxxxxxxxxxx` or `ins_xxxxxxxxxxxxx`)
3. Copy this value - you'll need it for the Audience field

### Step 3: Configure in Supabase Dashboard

1. **Go to Supabase Dashboard**:
   - Navigate to: https://app.supabase.com/project/tislabgxitwtcqfwrpik

2. **Navigate to Authentication Settings**:
   - Click **Authentication** in the left sidebar
   - Click **Settings** (or **Providers**)
   - Scroll down to find **"JWT Settings"**, **"JWKS URL"**, or **"External JWT"** section

3. **Enter Configuration Values**:
   
   **JWKS URL**:
   ```
   https://<your-clerk-domain>/.well-known/jwks.json
   ```
   Example: `https://clerk.supafolio.app/.well-known/jwks.json`
   
   **Issuer**:
   ```
   https://<your-clerk-domain>
   ```
   Example: `https://clerk.supafolio.app`
   
   **Audience** (Optional but Recommended):
   ```
   <your-clerk-application-id>
   ```
   Example: `ins_37VAGQw0JVza01qpTa6yUt8iVLY`

4. **Enable JWT Verification**:
   - Make sure the toggle for **"Enable JWT verification"** is **ON**
   - Some projects have this enabled by default

5. **Save Changes**:
   - Click **"Save"** or **"Update"**
   - Wait for confirmation

### Step 4: Wait for Propagation

- Configuration changes can take **2-5 minutes** to propagate
- You may need to sign out and sign back in to get a fresh JWT

### Step 5: Verify Configuration

**Test in Supabase SQL Editor** (while signed in to your app):

```sql
SELECT 
  auth.jwt() IS NOT NULL as jwt_exists,
  auth.jwt() ->> 'sub' as user_id_from_jwt,
  CASE 
    WHEN auth.jwt() IS NULL THEN '❌ JWT NOT CONFIGURED'
    WHEN auth.jwt() ->> 'sub' IS NULL THEN '⚠️ JWT EXISTS BUT NO SUB'
    ELSE '✅ JWT WORKING'
  END as jwt_status;
```

**Expected Result** (after configuration):
- `jwt_exists`: `true`
- `user_id_from_jwt`: Your Clerk user ID (e.g., `user_37Q7p6jNwGDnBiCzIrBd7m9dXtq`)
- `jwt_status`: `✅ JWT WORKING`

### Step 6: Test Statement Upload

After JWT validation is working:
1. Try uploading a statement file again
2. The RLS policy should now pass
3. Upload should succeed

## Troubleshooting

### If you can't find JWT settings in Supabase:

1. **Check Project Settings → API**:
   - Look for tabs like "External JWT", "Custom JWT", or "Auth Providers"
   - The "JWT Keys" tab is for Supabase's own keys, not external validation

2. **Check Authentication → Providers**:
   - Some Supabase projects have JWT settings under Providers
   - Look for "External JWT" or "Custom JWT Configuration"

3. **Contact Supabase Support**:
   - If the UI option isn't available, you may need to contact Supabase support
   - They can enable external JWT validation for your project

### If JWT is still NULL after configuration:

1. **Wait 2-5 minutes** for configuration to propagate
2. **Sign out and sign back in** to get a fresh JWT token
3. **Clear browser cache** and cookies
4. **Check Supabase Dashboard → Logs** for errors
5. **Verify Clerk domain is correct** (no typos)
6. **Verify JWKS URL is accessible**: Open `https://<your-clerk-domain>/.well-known/jwks.json` in browser - should show JSON

## Quick Reference

### Your Supabase Project
- **Project URL**: https://tislabgxitwtcqfwrpik.supabase.co
- **Dashboard**: https://app.supabase.com/project/tislabgxitwtcqfwrpik

### Configuration Path in Supabase
1. Dashboard → Authentication → Settings
2. Scroll to "JWT Settings" or "JWKS URL"
3. Enter JWKS URL, Issuer, and Audience
4. Enable JWT verification
5. Save

### After Configuration
- Wait 2-5 minutes
- Sign out and sign back in
- Test with SQL query above
- Try statement upload


