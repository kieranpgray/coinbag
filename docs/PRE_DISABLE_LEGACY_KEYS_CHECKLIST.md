# Pre-Disable Legacy Keys Checklist

## ⚠️ CRITICAL: Verify Production Before Disabling

Before disabling legacy keys in **DEV project**, you must verify and potentially migrate **PROD project** as well.

---

## DEV Project (`tislabgxitwtcqfwrpik`) - Status

### ✅ Already Migrated
- **Frontend**: Using new Publishable API key (`sb_publishable_...`)
- **Scripts**: Using new Secret API key
- **Status**: ✅ **SAFE TO DISABLE** legacy keys

### What Will Break: **NOTHING** ✅
- Frontend uses new Publishable key
- Scripts use new Secret key
- No dependencies on legacy keys

---

## PROD Project (`auvtsvmtfrbpvgyvfqlx`) - ⚠️ NEEDS VERIFICATION

### Critical Checks Required

#### 1. Frontend (Vercel Environment Variables)

**Check**: Is `VITE_SUPABASE_ANON_KEY` in Vercel using legacy or new key?

**How to Check**:
1. Go to Vercel Dashboard → Project Settings → Environment Variables
2. Find `VITE_SUPABASE_ANON_KEY`
3. Check the key format:
   - **Legacy**: Starts with `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (JWT, 200+ chars)
   - **New Publishable**: Starts with `sb_publishable_...` (46+ chars)

**If Legacy Key**:
- ❌ **WILL BREAK** if you disable legacy keys in PROD project
- ✅ **WON'T BREAK** if you only disable in DEV project (different projects)

**Action Required**:
- If using legacy key in PROD → Migrate to Publishable API key
- Update Vercel environment variable
- Test production deployment

#### 2. Edge Function (Supabase Dashboard)

**Check**: Is `SUPABASE_ANON_KEY` in Edge Function using legacy or new key?

**How to Check**:
1. Go to Supabase Dashboard → Edge Functions → process-statement → Settings
2. Find `SUPABASE_ANON_KEY` environment variable
3. Check the key format (same as above)

**If Legacy Key**:
- ❌ **WILL BREAK** if you disable legacy keys in PROD project
- ✅ **WON'T BREAK** if you only disable in DEV project

**Action Required**:
- If using legacy key → Migrate to Publishable API key
- Update Edge Function environment variable
- Test Edge Function execution

#### 3. Production Scripts

**Check**: Are any production scripts using service role key?

**Status**: ✅ **SAFE** - Production scripts don't use service role key
- Scripts use DEV project for admin operations
- Production doesn't need service role key

---

## Impact Analysis by Scenario

### Scenario A: Disable Legacy Keys in DEV Only

**What Happens**:
- ✅ DEV frontend: Works (using new Publishable key)
- ✅ DEV scripts: Work (using new Secret key)
- ✅ PROD frontend: **Still works** (different project, legacy keys still active)
- ✅ PROD Edge Function: **Still works** (different project, legacy keys still active)

**Result**: ✅ **SAFE** - Only affects DEV project

### Scenario B: Disable Legacy Keys in PROD (Without Migration)

**What Happens**:
- ✅ DEV: Still works (already migrated)
- ❌ PROD frontend: **BREAKS** (if using legacy anon key)
- ❌ PROD Edge Function: **BREAKS** (if using legacy anon key)

**Result**: ❌ **DANGEROUS** - Production will break

### Scenario C: Migrate PROD First, Then Disable

**What Happens**:
- ✅ DEV: Works (already migrated)
- ✅ PROD frontend: Works (migrated to new key)
- ✅ PROD Edge Function: Works (migrated to new key)
- ✅ Both projects: Safe to disable legacy keys

**Result**: ✅ **SAFE** - Everything works

---

## Recommended Action Plan

### Step 1: Verify Production Keys (REQUIRED)

**Check Vercel**:
```bash
# Go to Vercel Dashboard
# Settings → Environment Variables
# Check VITE_SUPABASE_ANON_KEY format
```

**Check Edge Function**:
```bash
# Go to Supabase Dashboard
# Project: auvtsvmtfrbpvgyvfqlx (PROD)
# Edge Functions → process-statement → Settings
# Check SUPABASE_ANON_KEY format
```

### Step 2: Migrate Production (If Needed)

**If PROD is using legacy keys**:

1. **Get New Publishable API Key**:
   - Go to: https://supabase.com/dashboard/project/auvtsvmtfrbpvgyvfqlx/settings/api
   - Click "Publishable and secret API keys" tab
   - Copy Publishable API key

2. **Update Vercel**:
   - Update `VITE_SUPABASE_ANON_KEY` with new key
   - Redeploy production

3. **Update Edge Function**:
   - Update `SUPABASE_ANON_KEY` with new key
   - Test Edge Function

### Step 3: Disable Legacy Keys

**Option A: Disable in DEV Only (Safest)**
- ✅ Only affects DEV project
- ✅ PROD continues working
- ✅ Can migrate PROD later

**Option B: Disable in Both (After Migration)**
- ✅ Complete migration
- ✅ Maximum security
- ⚠️ Requires PROD migration first

---

## Verification Checklist

Before disabling legacy keys, verify:

### DEV Project (`tislabgxitwtcqfwrpik`)
- [x] Frontend using new Publishable API key ✅
- [x] Scripts using new Secret API key ✅
- [x] Edge Function checked (if any) ⚠️

### PROD Project (`auvtsvmtfrbpvgyvfqlx`)
- [ ] Vercel `VITE_SUPABASE_ANON_KEY` format verified
- [ ] Edge Function `SUPABASE_ANON_KEY` format verified
- [ ] If legacy keys found → Migrated to new keys
- [ ] Production tested after migration

---

## Current Recommendation

**SAFEST APPROACH**:

1. ✅ **Disable legacy keys in DEV project only** (already migrated)
2. ⚠️ **Keep legacy keys active in PROD project** (until verified/migrated)
3. 📋 **Verify PROD keys** (check if legacy or new)
4. 🔄 **Migrate PROD if needed** (when convenient)
5. 🔒 **Disable PROD legacy keys** (after migration)

This approach:
- ✅ Eliminates security risk in DEV (exposed key)
- ✅ Keeps PROD working (no disruption)
- ✅ Allows gradual migration

---

**Status**: Ready to disable DEV legacy keys ✅  
**PROD Status**: Needs verification ⚠️

