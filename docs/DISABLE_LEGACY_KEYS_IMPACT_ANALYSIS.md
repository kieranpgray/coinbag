# Impact Analysis: Disabling JWT-based API Keys

## ⚠️ CRITICAL: Frontend Will Break!

**TL;DR**: If you disable legacy keys, your **frontend application will stop working** because it's using the legacy anon key.

## Keys That Will Be Disabled

When you click "Disable JWT-based API keys", these will stop working:

### 1. Legacy Service Role Key ✅ SAFE TO DISABLE
- **Status**: ✅ Already replaced with new Secret API key
- **Used in**: Scripts only (`SUPABASE_SERVICE_ROLE_KEY`)
- **Impact**: ✅ None - scripts already use new Secret API key
- **Action**: Safe to disable

### 2. Legacy Anon Key ❌ WILL BREAK FRONTEND
- **Status**: ❌ Still being used by frontend
- **Used in**: 
  - `src/lib/supabaseClient.ts` → `VITE_SUPABASE_ANON_KEY`
  - `src/lib/supabase/supabaseBrowserClient.ts` → `VITE_SUPABASE_ANON_KEY`
  - `src/lib/statementProcessing.ts` → `VITE_SUPABASE_ANON_KEY`
- **Impact**: ❌ **FRONTEND WILL BREAK** - All Supabase operations will fail
- **Action**: ⚠️ **DO NOT DISABLE** until you migrate to Publishable API keys

## What You Need to Do First

### Step 1: Migrate to Publishable API Keys (Required)

Before disabling legacy keys, you must migrate the frontend to use **Publishable API keys**:

1. **Go to Supabase Dashboard**:
   - https://supabase.com/dashboard/project/tislabgxitwtcqfwrpik/settings/api
   - Click **"Publishable and secret API keys"** tab

2. **Get Your Publishable API Key**:
   - Look for **"Publishable API keys"** section
   - Copy the key (should look similar to anon key)

3. **Update Environment Variables**:
   - Update `.env`:
     ```bash
     # OLD (legacy anon key)
     VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...legacy-anon...
     
     # NEW (publishable API key)
     VITE_SUPABASE_ANON_KEY=your-new-publishable-api-key-here
     ```
   - Update Vercel environment variables (same key name, new value)

4. **Test Frontend**:
   - Run the app locally
   - Verify all Supabase operations work
   - Test authentication, data fetching, etc.

### Step 2: Check Edge Function

The Edge Function also uses an anon key. Check if it needs updating:

- **Location**: Supabase Dashboard → Edge Functions → process-statement → Environment Variables
- **Variable**: `SUPABASE_ANON_KEY`
- **Action**: Update to new Publishable API key if using legacy anon key

### Step 3: Then Disable Legacy Keys

**Only after** you've:
- ✅ Migrated frontend to Publishable API key
- ✅ Updated Vercel environment variables
- ✅ Tested frontend works
- ✅ Updated Edge Function (if needed)
- ✅ Verified scripts use new Secret API key (already done ✅)

Then you can safely disable legacy keys.

## Current Status

### ✅ Safe to Disable
- **Service Role Key**: Already using new Secret API key ✅

### ❌ NOT Safe to Disable Yet
- **Anon Key**: Frontend still uses legacy anon key ❌

## Recommended Action Plan

### Option A: Migrate First (Recommended)
1. Get new Publishable API key
2. Update `.env` and Vercel with new key
3. Test frontend works
4. Update Edge Function if needed
5. **Then** disable legacy keys

### Option B: Keep Legacy Keys Active (Safer for Now)
- Keep legacy keys active
- They're already exposed in git history anyway
- Focus on preventing future exposure
- Migrate to new keys when convenient

## Impact Summary

| Key Type | Current Status | Impact if Disabled | Action Required |
|----------|---------------|-------------------|-----------------|
| Legacy Service Role | ✅ Replaced | ✅ None | Safe to disable |
| Legacy Anon | ❌ Still in use | ❌ **Frontend breaks** | Migrate first |
| New Secret API | ✅ Working | ✅ None | Already using |
| New Publishable | ❓ Not migrated | ❓ N/A | Need to migrate |

## Recommendation

**DO NOT disable legacy keys yet** until you:
1. Migrate frontend to Publishable API keys
2. Test everything works
3. Update production (Vercel) environment variables

The exposed legacy service_role key is already replaced, so the security risk is mitigated. The legacy anon key is less critical (it's meant to be public anyway), so keeping it active temporarily is acceptable.

---

**Status**: ⚠️ **DO NOT DISABLE** - Frontend migration required first

