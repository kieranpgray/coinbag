# Storage RLS Fix - Clerk JWT Authentication

## Problem
Statement uploads failing with: `new row violates row-level security policy`

## Root Cause
Supabase Storage operations use a separate HTTP client that doesn't inherit the REST client headers. The JWT was only being set on the REST client, so Storage operations had no authentication, causing RLS policies to fail.

## Solution Applied

### 1. Updated `getClerkToken()` to use Supabase JWT template
- Now tries to get token with `{ template: 'supabase' }` first
- Falls back to default token if template doesn't exist
- This ensures we get a Supabase-compatible JWT if Clerk template is configured

### 2. Updated `createAuthenticatedSupabaseClient()` to set JWT for Storage
- Sets JWT in REST client headers (for database operations)
- Intercepts Storage client's internal fetch to add Authorization header
- Ensures all Storage operations include the Clerk JWT

## Required Clerk Configuration

For this to work, you need:

1. **Clerk JWT Template for Supabase**:
   - In Clerk Dashboard → JWT Templates
   - Create a template named "supabase" (or configure existing)
   - Must include `role: "authenticated"` claim
   - Should be signed with Supabase's JWT secret (if using HS256)

2. **Supabase Third-Party Auth**:
   - In Supabase Dashboard → Authentication → Sign In / Up → Providers
   - Add Clerk as a provider
   - Enter your Clerk domain

3. **Supabase JWT Validation** (if not using third-party auth):
   - In Supabase Dashboard → Authentication → Settings
   - Configure JWKS URL: `https://<your-clerk-domain>/.well-known/jwks.json`
   - Configure Issuer: `https://<your-clerk-domain>`

## Verification Steps

1. **Check if JWT template is being used**:
   ```typescript
   // In browser console (while signed in):
   const { useAuth } = await import('@clerk/clerk-react');
   const { getToken } = useAuth();
   const token = await getToken({ template: 'supabase' });
   console.log('Supabase template token:', token ? '✅' : '❌');
   ```

2. **Verify JWT includes role claim**:
   - Decode the JWT at jwt.io
   - Check that it includes `role: "authenticated"`

3. **Test Storage upload**:
   - Try uploading a statement file
   - Should no longer get RLS policy error

4. **Verify auth.jwt() works**:
   ```sql
   -- In Supabase SQL Editor (while signed in to app):
   SELECT 
     auth.jwt() IS NOT NULL as jwt_exists,
     auth.jwt() ->> 'sub' as user_id,
     auth.jwt() ->> 'role' as role,
     CASE 
       WHEN auth.jwt() IS NULL THEN '❌ JWT NOT CONFIGURED'
       WHEN auth.jwt() ->> 'role' != 'authenticated' THEN '⚠️ ROLE MISSING'
       ELSE '✅ JWT WORKING'
     END as status;
   ```

## Files Modified

- `src/lib/supabaseClient.ts`:
  - Updated `getClerkToken()` to try Supabase template
  - Updated `createAuthenticatedSupabaseClient()` to set JWT for Storage client

## Next Steps if Still Not Working

1. **Verify Clerk JWT template exists**:
   - Clerk Dashboard → JWT Templates
   - Should see "supabase" template

2. **Check JWT payload**:
   - Decode token and verify it has:
     - `sub`: User ID
     - `role`: "authenticated"
     - Valid signature

3. **Verify Supabase configuration**:
   - Clerk domain added in Third-Party Auth OR
   - JWKS URL configured in JWT Settings

4. **Check Storage RLS policies**:
   - Should use `auth.jwt() ->> 'sub'` not `auth.uid()`
   - Should use `split_part(name, '/', 1)` not `storage.foldername()`


