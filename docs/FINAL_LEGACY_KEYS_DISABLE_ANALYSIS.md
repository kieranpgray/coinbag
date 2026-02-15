# Final Analysis: What Will Break When Disabling Legacy Keys

## Executive Summary

**DEV Project**: ✅ **SAFE TO DISABLE** - Already fully migrated  
**PROD Project**: ⚠️ **NEEDS VERIFICATION** - May break if using legacy keys

---

## DEV Project (`tislabgxitwtcqfwrpik`) - ✅ READY

### Current Status
- ✅ **Frontend**: Using new Publishable API key (`sb_publishable_...`, 46 chars)
- ✅ **Scripts**: Using new Secret API key (41 chars)
- ✅ **All keys migrated**: No dependencies on legacy keys

### What Will Break: **NOTHING** ✅

**If you disable legacy keys in DEV project:**
- ✅ Frontend continues working (uses new Publishable key)
- ✅ Scripts continue working (uses new Secret key)
- ✅ No impact on production (different project)

**Action**: ✅ **SAFE TO DISABLE** legacy keys in DEV project

---

## PROD Project (`auvtsvmtfrbpvgyvfqlx`) - ⚠️ VERIFICATION REQUIRED

### Critical Components to Check

#### 1. Frontend (Vercel Environment Variables)

**Variable**: `VITE_SUPABASE_ANON_KEY`  
**Location**: Vercel Dashboard → Settings → Environment Variables  
**Project**: `auvtsvmtfrbpvgyvfqlx` (PROD)

**How to Verify**:
1. Go to: https://vercel.com/dashboard
2. Select project: **supafolio**
3. Go to: **Settings** → **Environment Variables**
4. Find: `VITE_SUPABASE_ANON_KEY`
5. Check format:
   - **Legacy**: Starts with `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (200+ chars, JWT)
   - **New**: Starts with `sb_publishable_...` (46+ chars)

**Impact if Legacy Key**:
- ❌ **WILL BREAK** if you disable legacy keys in PROD project
- ✅ **WON'T BREAK** if you only disable in DEV project (different projects)

**Action Required**:
- If legacy key → Migrate to Publishable API key
- Update Vercel environment variable
- Redeploy production

#### 2. Edge Function (Supabase Auto-Provided)

**Variable**: `SUPABASE_ANON_KEY` (automatically provided by Supabase)  
**Location**: Supabase Dashboard → Edge Functions → process-statement  
**Project**: `auvtsvmtfrbpvgyvfqlx` (PROD)

**Important**: Supabase **automatically provides** this key to Edge Functions. It uses whatever anon key is configured for the project.

**How to Verify**:
1. Go to: https://supabase.com/dashboard/project/auvtsvmtfrbpvgyvfqlx/settings/api
2. Check which anon key is active:
   - **Legacy tab**: Legacy anon key (JWT format)
   - **Publishable tab**: New Publishable API key

**Impact if Legacy Key**:
- ❌ **WILL BREAK** if you disable legacy keys in PROD project
- ✅ **WON'T BREAK** if you only disable in DEV project

**Action Required**:
- If project uses legacy anon key → Migrate project to Publishable API key
- Edge Function will automatically use the new key
- Test Edge Function execution

---

## Impact Scenarios

### Scenario 1: Disable Legacy Keys in DEV Only ✅ SAFE

**What Happens**:
- ✅ DEV frontend: Works (new Publishable key)
- ✅ DEV scripts: Work (new Secret key)
- ✅ PROD frontend: **Still works** (different project, legacy keys still active)
- ✅ PROD Edge Function: **Still works** (different project, legacy keys still active)

**Result**: ✅ **SAFE** - Only affects DEV project, PROD unaffected

### Scenario 2: Disable Legacy Keys in PROD (Without Migration) ❌ DANGEROUS

**What Happens**:
- ✅ DEV: Still works (already migrated)
- ❌ PROD frontend: **BREAKS** (if using legacy anon key)
- ❌ PROD Edge Function: **BREAKS** (if using legacy anon key)

**Result**: ❌ **PRODUCTION WILL BREAK** - Do not do this without migration

### Scenario 3: Migrate PROD First, Then Disable ✅ IDEAL

**What Happens**:
- ✅ DEV: Works (already migrated)
- ✅ PROD frontend: Works (migrated to new key)
- ✅ PROD Edge Function: Works (migrated to new key)
- ✅ Both projects: Safe to disable legacy keys

**Result**: ✅ **SAFE** - Complete migration, maximum security

---

## Recommended Action Plan

### Phase 1: Disable DEV Legacy Keys (Safe Now) ✅

**Status**: ✅ Ready to proceed

**Steps**:
1. Go to: https://supabase.com/dashboard/project/tislabgxitwtcqfwrpik/settings/api
2. Click "Legacy anon, service_role API keys" tab
3. Scroll to bottom
4. Click "Disable JWT-based API keys"
5. Confirm

**Impact**: ✅ None - DEV already migrated

### Phase 2: Verify PROD Keys (Required Before Disabling)

**Status**: ⚠️ Manual verification needed

**Steps**:

1. **Check Vercel**:
   - Go to Vercel Dashboard → Environment Variables
   - Check `VITE_SUPABASE_ANON_KEY` format
   - Document: Legacy or New?

2. **Check Supabase PROD Project**:
   - Go to: https://supabase.com/dashboard/project/auvtsvmtfrbpvgyvfqlx/settings/api
   - Check "Publishable and secret API keys" tab
   - Check "Legacy anon, service_role API keys" tab
   - Document: Which anon key is active?

3. **Check Edge Function**:
   - Note: Uses project's anon key automatically
   - If project uses legacy → Edge Function uses legacy
   - If project uses new → Edge Function uses new

### Phase 3: Migrate PROD (If Needed)

**If PROD is using legacy keys**:

1. **Get New Publishable API Key**:
   - Go to: https://supabase.com/dashboard/project/auvtsvmtfrbpvgyvfqlx/settings/api
   - Click "Publishable and secret API keys" tab
   - Copy Publishable API key

2. **Update Vercel**:
   - Update `VITE_SUPABASE_ANON_KEY` with new key
   - Redeploy production
   - Test production app

3. **Verify Edge Function**:
   - Edge Function automatically uses project's anon key
   - If project now uses new key → Edge Function uses new key
   - Test Edge Function execution

### Phase 4: Disable PROD Legacy Keys (After Migration)

**Only after**:
- ✅ PROD frontend migrated and tested
- ✅ PROD Edge Function verified working
- ✅ Production deployment tested

**Then**:
- Disable legacy keys in PROD project
- Verify everything still works

---

## Quick Reference: Key Formats

### Legacy Keys
- **Anon Key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (200+ chars, JWT)
- **Service Role**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (200+ chars, JWT)

### New Keys
- **Publishable**: `sb_publishable_...` (46+ chars)
- **Secret**: `sb_secret_...` or similar (varies)

---

## Summary

### ✅ Safe to Disable Now
- **DEV Project**: Legacy keys can be disabled immediately

### ⚠️ Verify Before Disabling
- **PROD Project**: Check key formats first

### 📋 Actions Required for PROD
1. Verify Vercel `VITE_SUPABASE_ANON_KEY` format
2. Verify Supabase PROD project anon key format
3. If legacy → Migrate to new keys
4. Test production
5. Then disable legacy keys

---

**Status**: DEV ready ✅ | PROD needs verification ⚠️

