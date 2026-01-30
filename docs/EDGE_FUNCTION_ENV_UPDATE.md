# Edge Function Environment Variables Update

## Summary

After implementing the secure PostgREST REST API approach, the Edge Function no longer requires the service role key.

## Required Action: Update Supabase Dashboard

Go to **Supabase Dashboard** → **Edge Functions** → **Environment Variables** and ensure:

### ✅ Required Variables (Keep These)

1. **MISTRAL_API_KEY**
   - Your Mistral API key for OCR processing
   - Keep this as-is

2. **SUPABASE_ANON_KEY**
   - Your Supabase anon/public key
   - Required for all database operations (with JWT for RLS)

3. **SUPABASE_URL**
   - Your Supabase project URL (e.g., `https://your-project.supabase.co`)
   - Required for API calls

### ❌ Remove This Variable (No Longer Needed)

**SUPABASE_SERVICE_ROLE_KEY**
- **Can be removed** - The function no longer uses the service role key
- All operations now use anon key + JWT, which respects RLS policies
- This improves security by ensuring RLS is always enforced

## Verification

After updating environment variables:

1. The function should work without `SUPABASE_SERVICE_ROLE_KEY`
2. All database operations will respect RLS policies automatically
3. No schema cache errors should occur (REST API doesn't require schema introspection)

## Current Configuration

The function now uses:
- **PostgREST REST API** (`/rest/v1/transactions`) for all transaction operations
- **Anon key + JWT** in Authorization header for RLS enforcement
- **No service role key** - removed for security

## Security Benefits

- ✅ RLS policies automatically enforced (no manual filtering needed)
- ✅ No privilege escalation risk (service role key removed)
- ✅ Defense in depth (RLS protects data even if code has bugs)
- ✅ No schema cache issues (REST API doesn't require schema introspection)

