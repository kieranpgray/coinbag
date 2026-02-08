# How to Revoke the Old Legacy Service Role Key

## ⚠️ Important: Manual Action Required

Revoking the old key must be done manually in the Supabase Dashboard. I cannot do this automatically.

## Step-by-Step Instructions

### Step 1: Navigate to API Settings

1. Go to: **https://supabase.com/dashboard/project/tislabgxitwtcqfwrpik/settings/api**
2. Project: `tislabgxitwtcqfwrpik` (coinbag-dev)

### Step 2: Go to Legacy Keys Tab

1. Click on the **"Legacy anon, service_role API keys"** tab
2. You should see:
   - Anon Public Key
   - Service Role Secret Key (the old exposed key)

### Step 3: Disable Legacy Keys

**Option A: Disable All Legacy Keys (Recommended)**

1. Scroll to the bottom of the page
2. Find the section: **"Disable legacy API keys"**
3. Read the warning: *"Make sure you are no longer using your legacy API keys before proceeding."*
4. Click the button: **"Disable JWT-based API keys"**
5. Confirm the action

**This will disable:**
- ✅ Legacy service_role key (the exposed one)
- ✅ Legacy anon key (if you're using the new publishable keys)

**Option B: Keep Legacy Anon Key (If Still Using It)**

If you're still using the legacy anon key and only want to disable the service_role key:
- Unfortunately, Supabase doesn't allow disabling individual legacy keys
- You'll need to migrate to the new Publishable API keys first
- Then disable all legacy keys

### Step 4: Verify New Key Still Works

After disabling, verify your new Secret API key still works:

```bash
export $(cat .env | grep -v '^#' | xargs) && \
SUPABASE_URL=https://tislabgxitwtcqfwrpik.supabase.co \
node scripts/verify-statement-bucket.js
```

**Expected**: ✅ Should still work (uses new Secret API key)

## What Happens When You Disable

- ❌ Old legacy service_role key will stop working immediately
- ❌ Old legacy anon key will stop working (if you disable all)
- ✅ New Secret API key will continue working
- ✅ New Publishable API keys will continue working

## Safety Check

Before disabling, make sure:
- ✅ New Secret API key is working (we tested this ✅)
- ✅ You're not using legacy anon key (check your code)
- ✅ All scripts use environment variables (they do ✅)

## After Disabling

Once disabled:
1. The old exposed key will be permanently invalid
2. Any attempts to use it will fail
3. Your security exposure is eliminated
4. Only the new Secret API key will work

---

**Status**: Ready to disable - new key is tested and working ✅

