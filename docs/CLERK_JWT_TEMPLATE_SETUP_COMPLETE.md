# Complete Clerk JWT Template Setup Guide

This guide walks you through creating a Clerk JWT template for Supabase and configuring both systems to work together.

## Overview

You need to:
1. **Get Supabase JWT Secret** (from Supabase Dashboard)
2. **Create Clerk JWT Template** (in Clerk Dashboard)
3. **Configure Supabase to Accept Clerk JWTs** (in Supabase Dashboard)
4. **Verify Everything Works**

---

## Step 1: Get Supabase JWT Secret

### Option A: From Supabase Dashboard (Recommended)

1. **Go to Supabase Dashboard**:
   - Navigate to: https://app.supabase.com
   - Select your project

2. **Get JWT Secret**:
   - Go to **Project Settings** (gear icon in left sidebar)
   - Click **API** tab
   - Scroll to **"JWT Settings"** section
   - Find **"JWT Secret"** (it's a long string, starts with something like `your-super-secret-jwt-token-with-at-least-32-characters-long`)
   - **Copy this value** - you'll need it for the Clerk template

### Option B: From Environment Variables

If you have access to your Supabase project's environment:
- Look for `SUPABASE_JWT_SECRET` or similar
- This is the same value as in the dashboard

**⚠️ Important**: This is a **secret key** - keep it secure and never commit it to version control.

---

## Step 2: Get Your Clerk Domain

1. **Go to Clerk Dashboard**:
   - Navigate to: https://dashboard.clerk.com
   - Select your application

2. **Find Your Domain**:
   - Go to **Settings** → **Domains**
   - You'll see your domain (e.g., `clerk.coinbag.app` or `xxxxx.clerk.accounts.dev`)
   - **Copy this domain** - you'll need it for:
     - JWKS URL: `https://<your-domain>/.well-known/jwks.json`
     - Issuer: `https://<your-domain>`

3. **Get Application ID (Audience)**:
   - Go to **API Keys** section
   - Find your **Application ID** (format: `clerk_xxxxxxxxxxxxx` or `ins_xxxxxxxxxxxxx`)
   - **Copy this value** - you'll need it for the Audience claim

---

## Step 3: Create Clerk JWT Template

1. **Go to Clerk Dashboard**:
   - Navigate to: https://dashboard.clerk.com
   - Select your application

2. **Navigate to JWT Templates**:
   - In the left sidebar, click **JWT Templates**
   - Click **"New template"** or **"Create template"** button

3. **Configure Template**:

   **Template Name**:
   ```
   supabase
   ```
   ⚠️ **Must be exactly "supabase"** (lowercase) - our code looks for this name.

   **Signing Algorithm**:
   - Select **HS256** (HMAC with SHA-256)
   - This uses a shared secret (your Supabase JWT secret)

   **Signing Key**:
   - Paste your **Supabase JWT Secret** from Step 1
   - This is the long secret string from Supabase Dashboard → Project Settings → API → JWT Secret

   **Token Lifetime**:
   - Set to **3600 seconds** (1 hour) or your preferred duration
   - This is how long the JWT will be valid

4. **Configure Claims** (Click "Add claim" or edit the JSON):

   You need to add these claims:

   ```json
   {
     "sub": "{{user.id}}",
     "role": "authenticated",
     "aud": "<your-clerk-application-id>",
     "iss": "https://<your-clerk-domain>",
     "exp": "{{date.now_plus_seconds(3600)}}",
     "iat": "{{date.now}}"
   }
   ```

   **Required Claims**:
   - **`sub`**: `{{user.id}}` - The Clerk user ID (this is what Supabase RLS uses)
   - **`role`**: `"authenticated"` - **CRITICAL**: Must be exactly `"authenticated"` (string, not variable)
   - **`aud`**: Your Clerk Application ID from Step 2
   - **`iss`**: `https://<your-clerk-domain>` - Your Clerk domain from Step 2
   - **`exp`**: `{{date.now_plus_seconds(3600)}}` - Expiration time
   - **`iat`**: `{{date.now}}` - Issued at time

   **Example with real values**:
   ```json
   {
     "sub": "{{user.id}}",
     "role": "authenticated",
     "aud": "ins_37VAGQw0JVza01qpTa6yUt8iVLY",
     "iss": "https://clerk.coinbag.app",
     "exp": "{{date.now_plus_seconds(3600)}}",
     "iat": "{{date.now}}"
   }
   ```

5. **Save Template**:
   - Click **"Save"** or **"Create"**
   - Wait for confirmation

---

## Step 4: Configure Supabase to Accept Clerk JWTs

You have **two options** - choose one:

### Option A: Third-Party Auth Provider (Recommended if available)

1. **Go to Supabase Dashboard**:
   - Navigate to: https://app.supabase.com
   - Select your project

2. **Add Clerk Provider**:
   - Go to **Authentication** → **Providers** (or **Sign In / Up** → **Providers**)
   - Look for **"Clerk"** in the list
   - If you see it, click **"Add provider"** or **"Enable"**
   - Enter your Clerk domain: `https://<your-clerk-domain>`
   - Save

### Option B: JWKS URL Configuration (If Option A not available)

1. **Go to Supabase Dashboard**:
   - Navigate to: https://app.supabase.com
   - Select your project

2. **Navigate to Authentication Settings**:
   - Go to **Authentication** → **Settings** (in left sidebar)
   - Scroll down to **"JWT Settings"** or **"JWKS URL"** section

3. **Configure JWKS URL**:
   - Find the **"JWKS URL"** field
   - Enter: `https://<your-clerk-domain>/.well-known/jwks.json`
   - Example: `https://clerk.coinbag.app/.well-known/jwks.json`

4. **Configure Issuer** (if field available):
   - Find the **"Issuer"** field
   - Enter: `https://<your-clerk-domain>`
   - Example: `https://clerk.coinbag.app`

5. **Configure Audience** (if field available):
   - Find the **"Audience"** field
   - Enter your Clerk Application ID from Step 2

6. **Enable JWT Verification**:
   - Make sure **"Enable JWT verification"** toggle is **ON**

7. **Save Changes**:
   - Click **"Save"** or **"Update"**
   - Wait for confirmation

---

## Step 5: Verify Configuration

### Test 1: Check JWT Template in Clerk

1. **In Clerk Dashboard**:
   - Go to **JWT Templates**
   - Verify you see a template named **"supabase"**
   - Click on it to verify the claims are correct

### Test 2: Test JWT Token in Browser Console

1. **Start your dev server**:
   ```bash
   npm run dev
   # or
   pnpm dev
   ```

2. **Sign in to your app** (using Clerk)

3. **Open browser console** (F12)

4. **Run this code**:
   ```javascript
   // Get Clerk session
   const clerk = window.Clerk;
   if (!clerk || !clerk.session) {
     console.error('❌ Not signed in or Clerk not available');
   } else {
     // Try to get Supabase template token
     clerk.session.getToken({ template: 'supabase' })
       .then(token => {
         if (token) {
           console.log('✅ Supabase template token retrieved');
           
           // Decode token to see payload
           const parts = token.split('.');
           const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
           console.log('📋 JWT Payload:', payload);
           console.log('📋 User ID (sub):', payload.sub);
           console.log('📋 Role:', payload.role);
           console.log('📋 Issuer:', payload.iss);
           console.log('📋 Audience:', payload.aud);
           
           // Verify required claims
           if (payload.role === 'authenticated') {
             console.log('✅ Role claim is correct');
           } else {
             console.error('❌ Role claim is missing or incorrect:', payload.role);
           }
           
           if (payload.sub) {
             console.log('✅ Sub claim (user ID) is present');
           } else {
             console.error('❌ Sub claim is missing');
           }
         } else {
           console.error('❌ No token returned - template might not exist');
         }
       })
       .catch(error => {
         console.error('❌ Error getting token:', error);
       });
   }
   ```

5. **Expected Results**:
   - ✅ Should see "Supabase template token retrieved"
   - ✅ Payload should show `role: "authenticated"`
   - ✅ Payload should show `sub: "user_xxxxx"` (your Clerk user ID)
   - ✅ Payload should show `iss` and `aud` matching your configuration

### Test 3: Verify Supabase JWT Validation

1. **Go to Supabase Dashboard**:
   - Navigate to: https://app.supabase.com
   - Select your project

2. **Open SQL Editor**:
   - Click **SQL Editor** in left sidebar
   - Click **"New query"**

3. **Run this query** (while signed in to your app):
   ```sql
   SELECT 
     auth.jwt() IS NOT NULL as jwt_exists,
     auth.jwt() ->> 'sub' as user_id_from_jwt,
     auth.jwt() ->> 'role' as role_from_jwt,
     CASE 
       WHEN auth.jwt() IS NULL THEN '❌ JWT NOT CONFIGURED - Clerk JWT validation missing'
       WHEN auth.jwt() ->> 'role' != 'authenticated' THEN '⚠️ JWT configured but role claim missing or incorrect'
       WHEN auth.jwt() ->> 'sub' IS NULL THEN '⚠️ JWT configured but sub claim missing'
       ELSE '✅ JWT WORKING - All claims present'
     END as jwt_status;
   ```

4. **Expected Results**:
   - `jwt_exists`: `true`
   - `user_id_from_jwt`: Your Clerk user ID (e.g., `user_37Q7p6jNwGDnBiCzIrBd7m9dXtq`)
   - `role_from_jwt`: `authenticated`
   - `jwt_status`: `✅ JWT WORKING - All claims present`

   **⚠️ Note**: This query needs to run in the context of an authenticated request. If you're running it directly in SQL Editor without being signed in, it will show `jwt_exists: false`. To test properly, you need to make an authenticated API call (see Test 4).

### Test 4: Test Storage Upload (Full Integration Test)

1. **In your app** (while signed in):
   - Try uploading a statement file
   - Should no longer get RLS policy error

2. **Check browser console**:
   - Should see logs showing JWT is being used
   - Should see successful upload

3. **If you still get errors**:
   - Check browser console for JWT-related errors
   - Verify the JWT template name is exactly "supabase" (case-sensitive)
   - Verify the role claim is exactly "authenticated" (not a variable)

---

## Troubleshooting

### Issue: "Template not found" error in browser console

**Solution**:
- Verify template name is exactly **"supabase"** (lowercase, no spaces)
- Check Clerk Dashboard → JWT Templates to confirm it exists
- Try refreshing the page and signing in again

### Issue: `auth.jwt()` returns NULL in Supabase

**Solutions**:
1. **Verify JWKS URL is correct**:
   - Check for typos in the URL
   - Verify it's accessible: Open `https://<your-clerk-domain>/.well-known/jwks.json` in browser
   - Should see JSON with keys

2. **Verify Issuer matches**:
   - Must match exactly: `https://<your-clerk-domain>`
   - Check for trailing slashes or protocol mismatches

3. **Wait for propagation**:
   - Supabase configuration can take 2-5 minutes to propagate
   - Try again after waiting

4. **Check Supabase logs**:
   - Go to Supabase Dashboard → Logs
   - Look for JWT validation errors

### Issue: Role claim is missing or incorrect

**Solution**:
- In Clerk JWT template, verify `role` claim is set to exactly `"authenticated"` (string, not variable)
- Should be: `"role": "authenticated"` (with quotes)
- NOT: `"role": "{{something}}"` or `"role": authenticated` (without quotes)

### Issue: Storage upload still fails with RLS error

**Solutions**:
1. **Verify JWT template is being used**:
   - Check browser console - should see token being retrieved with template
   - Verify token payload includes `role: "authenticated"`

2. **Check Storage RLS policies**:
   - Go to Supabase Dashboard → Storage → Policies
   - Verify policies use `auth.jwt() ->> 'sub'` not `auth.uid()`
   - Verify policies use `split_part(name, '/', 1)` not `storage.foldername()`

3. **Clear browser cache**:
   - Hard refresh (Ctrl+Shift+R or Cmd+Shift+R)
   - Sign out and sign back in to get fresh JWT

---

## Quick Reference Checklist

- [ ] Got Supabase JWT Secret from Supabase Dashboard → Project Settings → API → JWT Secret
- [ ] Got Clerk domain from Clerk Dashboard → Settings → Domains
- [ ] Got Clerk Application ID from Clerk Dashboard → API Keys
- [ ] Created Clerk JWT template named "supabase"
- [ ] Set signing algorithm to HS256
- [ ] Set signing key to Supabase JWT Secret
- [ ] Added `sub` claim: `{{user.id}}`
- [ ] Added `role` claim: `"authenticated"` (exact string)
- [ ] Added `aud` claim: Your Clerk Application ID
- [ ] Added `iss` claim: `https://<your-clerk-domain>`
- [ ] Saved template in Clerk
- [ ] Configured Supabase (either Third-Party Auth or JWKS URL)
- [ ] Tested JWT token retrieval in browser console
- [ ] Verified token payload has correct claims
- [ ] Tested `auth.jwt()` in Supabase SQL Editor (with authenticated request)
- [ ] Tested storage upload in app

---

## Next Steps

Once everything is configured:

1. **Test statement upload** - Should work without RLS errors
2. **Monitor logs** - Check browser console and Supabase logs for any issues
3. **Verify data persistence** - Create data and verify it persists after logout/login

If you encounter any issues, refer to the Troubleshooting section above or check:
- Browser console for JWT-related errors
- Supabase Dashboard → Logs for database errors
- Clerk Dashboard → JWT Templates to verify template configuration

