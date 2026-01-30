# Clerk Third-Party Auth Migration Guide

## Overview

This guide documents the migration from deprecated JWT templates to Supabase's native Third-Party Auth integration with Clerk.

## Why This Migration?

### JWT Templates Are Deprecated

- **Deprecation Date**: April 1, 2025
- **Status**: JWT templates are still functional but no longer recommended
- **Reason**: Supabase now provides native Third-Party Auth integration

### Benefits of Third-Party Auth

1. **No Secret Sharing**: No need to share Supabase JWT secret with Clerk
2. **Automatic Verification**: Supabase validates Clerk tokens via JWKS endpoint
3. **Better Security**: Uses RS256 (asymmetric) instead of HS256 (symmetric)
4. **Simpler Setup**: No custom JWT template configuration needed
5. **Official Support**: Recommended approach by both Supabase and Clerk

## Prerequisites

- Clerk application configured
- Supabase project created
- Clerk configured as Third-Party Auth provider in Supabase Dashboard

## Migration Steps

### Step 1: Configure Supabase Third-Party Auth

1. **Go to Supabase Dashboard**:
   - Navigate to: https://app.supabase.com
   - Select your project

2. **Add Clerk Provider**:
   - Go to **Authentication** → **Providers** (or **Sign In / Up** → **Providers**)
   - Find **Clerk** in the list
   - Click **"Add provider"** or **"Enable"**
   - Enter your Clerk domain: `https://<your-clerk-domain>`
   - Example: `https://secure-tapir-36.clerk.accounts.dev`
   - Save

3. **Verify Configuration**:
   - Ensure Clerk provider shows as **"ENABLED"**
   - Verify domain matches your Clerk dashboard domain

### Step 2: Remove JWT Template (Optional)

If you created a JWT template named "supabase":

1. **Go to Clerk Dashboard**:
   - Navigate to: https://dashboard.clerk.com
   - Select your application

2. **Delete Template** (optional):
   - Go to **JWT Templates**
   - Find template named "supabase"
   - Delete it (not required, but recommended for cleanup)

**Note**: You can keep the template for now - the code will use default tokens instead.

### Step 3: Update Code

The code has been updated to:
- Use Clerk's default `getToken()` (no template parameter)
- Use Supabase's `global.headers` option to inject JWT per-request
- Automatically work with Third-Party Auth

**No code changes needed** - the migration is complete in the codebase.

## How It Works

### Token Flow

1. **User signs in** via Clerk
2. **Frontend calls** `getToken()` to get Clerk session token
3. **Supabase client** uses `global.headers` to inject token per-request
4. **Supabase validates** token via Clerk's JWKS endpoint
5. **RLS policies** use `auth.jwt() ->> 'sub'` to match user ID

### Key Differences

| Aspect | JWT Template (Deprecated) | Third-Party Auth (Current) |
|--------|---------------------------|----------------------------|
| **Algorithm** | HS256 (symmetric) | RS256 (asymmetric) |
| **Signing Key** | Supabase JWT Secret | Clerk's private key |
| **Verification** | Shared secret | JWKS endpoint |
| **Template** | Required | Not needed |
| **Setup** | Complex (secret sharing) | Simple (domain only) |

## Required Claims

Clerk's default session tokens include:

- ✅ `sub`: User ID (automatically included)
- ✅ `iss`: Issuer (Clerk domain)
- ✅ `aud`: Audience
- ✅ `exp`, `iat`: Timestamps
- ⚠️ `role`: Must be `"authenticated"` (may need configuration)

### Ensuring `role` Claim

If your RLS policies require `role: "authenticated"`:

1. **Check Clerk Session Token**:
   - In browser console: `window.Clerk.session.getToken().then(t => console.log(JSON.parse(atob(t.split('.')[1]))))`
   - Verify `role` claim is present

2. **If Missing**:
   - Clerk's Third-Party Auth integration should add it automatically
   - If not, check Clerk Dashboard → Integrations → Supabase settings
   - May need to enable "Include role claim" option

## Verification

### Test 1: Verify Token Contains Required Claims

```javascript
// In browser console (while signed in)
const clerk = window.Clerk;
const token = await clerk.session.getToken();
const payload = JSON.parse(atob(token.split('.')[1]));
console.log('Token payload:', payload);
console.log('Has sub:', !!payload.sub);
console.log('Has role:', !!payload.role);
console.log('Role value:', payload.role);
```

**Expected**: `sub` and `role` should both be present, `role` should be `"authenticated"`

### Test 2: Verify Supabase Accepts Token

1. **Try uploading a statement file** in your app
2. **Check browser console** for errors
3. **Should work** without 400 errors

### Test 3: Verify RLS Works

1. **Create data** (e.g., upload statement, create account)
2. **Verify data appears** in UI
3. **Check Supabase Dashboard** → Table Editor
4. **Verify `user_id` matches** your Clerk user ID

## Troubleshooting

### Issue: `auth.jwt()` returns NULL

**Symptoms**:
- SQL query shows `jwt_exists: false`
- RLS policies blocking all requests

**Solutions**:
1. Verify Clerk provider is enabled in Supabase Dashboard
2. Check Clerk domain matches exactly (no trailing slashes)
3. Wait 2-5 minutes after configuration (propagation delay)
4. Verify token is being sent (check Network tab → Authorization header)

### Issue: `role` claim missing

**Symptoms**:
- Token has `sub` but no `role`
- RLS policies with `to authenticated` fail

**Solutions**:
1. Check Clerk Dashboard → Integrations → Supabase
2. Enable "Include role claim" if available
3. Verify Third-Party Auth integration is active
4. Check if custom session token configuration is needed

### Issue: Storage uploads still fail

**Symptoms**:
- Database queries work but Storage uploads return 400

**Solutions**:
1. Verify `global.headers` is working (check Network tab)
2. Ensure Authorization header is present in Storage requests
3. Check Storage RLS policies use `auth.jwt() ->> 'sub'` not `auth.uid()`
4. Verify Storage bucket RLS is enabled

### Issue: 400 errors on all requests

**Symptoms**:
- All Supabase requests return 400 Bad Request

**Solutions**:
1. Check error response body for details (see enhanced error logging)
2. Verify token is not expired
3. Check Supabase logs for JWT validation errors
4. Verify Clerk domain configuration matches exactly

## Code Changes Summary

### Files Modified

1. **`src/lib/supabase/supabaseBrowserClient.ts`**:
   - Added `getToken` parameter support
   - Implemented `global.headers` with async token fetching
   - Maintains singleton pattern

2. **`src/lib/supabaseClient.ts`**:
   - Simplified `getClerkToken()` to use default tokens (no template)
   - Refactored `createAuthenticatedSupabaseClient()` to use `global.headers`
   - Removed manual header manipulation

3. **`src/lib/statementUpload.ts`**:
   - Enhanced error logging with full error details
   - Added response body extraction
   - Improved debugging information

### What Was Removed

- JWT template parameter from `getToken()` calls
- Manual REST client header manipulation
- Storage client fetch interception
- Template fallback logic

## Rollback Plan

If Third-Party Auth doesn't work:

1. **Re-enable JWT Template**:
   - Create template in Clerk Dashboard
   - Use HS256 with Supabase JWT secret
   - Update code to use `{ template: 'supabase' }`

2. **Revert Code Changes**:
   - Restore manual header manipulation
   - Re-add Storage client fetch interception

3. **Alternative**: Use JWKS URL configuration in Supabase Settings (if available)

## Additional Resources

- [Supabase Third-Party Auth Docs](https://supabase.com/docs/guides/auth/third-party/clerk)
- [Clerk Supabase Integration](https://clerk.com/docs/integrations/databases/supabase)
- [Supabase RLS with External Auth](https://supabase.com/docs/guides/auth/row-level-security)

## Support

If issues persist:
1. Check browser console for detailed error messages
2. Review Supabase Dashboard → Logs for JWT validation errors
3. Verify all configuration steps were completed
4. Test with a fresh token (sign out and back in)

