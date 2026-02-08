# Migrating from Legacy Service Role Key to Secret API Keys

## Overview

Supabase has deprecated the legacy `service_role` key and now requires using **Secret API keys** instead. The good news is that the Supabase JS client works the same way with both - you just need to get the new key from a different location.

## Step-by-Step Migration

### Step 1: Get Your New Secret API Key

1. **Go to Supabase Dashboard**:
   - Navigate to: https://supabase.com/dashboard/project/tislabgxitwtcqfwrpik/settings/api
   - Project: `tislabgxitwtcqfwrpik` (coinbag-dev)

2. **Switch to the New Tab**:
   - Click on **"Publishable and secret API keys"** tab (NOT the "Legacy" tab)
   - You should see sections for:
     - **Publishable API keys** (for client-side, like anon key)
     - **Secret API keys** (for server-side/admin operations)

3. **Create a New Secret API Key**:
   - Look for **"Secret API keys"** section
   - Click **"Create new secret key"** or **"Generate"**
   - Give it a name (e.g., "dev-admin-key" or "script-access")
   - **Copy the key** - it should be a long string (similar format to service_role key)

4. **Key Format**:
   - The new Secret API key should be a long string
   - It may or may not start with `eyJ` (JWT format)
   - It will be much longer than a UUID (should be 100+ characters)

### Step 2: Update Your .env File

Replace the old service role key with the new Secret API key:

```bash
# OLD (remove this)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...old-key...

# NEW (add this - use your new Secret API key)
SUPABASE_SERVICE_ROLE_KEY=your-new-secret-api-key-here
```

**Note**: We're keeping the same environment variable name (`SUPABASE_SERVICE_ROLE_KEY`) because the scripts already use it, and the Supabase client works the same way with both key types.

### Step 3: Test the New Key

Run the verification script:

```bash
export $(cat .env | grep -v '^#' | xargs) && \
SUPABASE_URL=https://tislabgxitwtcqfwrpik.supabase.co \
node scripts/verify-statement-bucket.js
```

**Expected**: ✅ Should work the same as before

### Step 4: Revoke the Old Legacy Key (Optional)

Once you've confirmed everything works:

1. Go back to the **"Legacy anon, service_role API keys"** tab
2. You can optionally disable the legacy keys if you're no longer using them
3. **Warning**: Only do this after confirming all scripts work with the new key

## Important Notes

### Why This Works

The Supabase JS client (`createClient`) accepts any API key - it doesn't care if it's:
- Legacy service_role key
- New Secret API key
- Anon key

They all work the same way. The difference is just how Supabase manages them in their dashboard.

### Environment Variable Name

We're keeping `SUPABASE_SERVICE_ROLE_KEY` as the variable name because:
- All scripts already use this name
- It's clear what it's for (admin/server operations)
- No code changes needed

### What About Production?

- **DEV project** (`tislabgxitwtcqfwrpik`): Use new Secret API key
- **PROD project** (`auvtsvmtfrbpvgyvfqlx`): Can continue using legacy key for now, or migrate when ready

## Troubleshooting

### Issue: "Invalid API key" error
- Verify you copied the entire key (no truncation)
- Check for extra spaces or newlines
- Ensure you're using the Secret API key, not the Publishable key

### Issue: Key doesn't work
- Make sure you created a **Secret API key**, not a Publishable key
- Verify the key has the right permissions (should have admin access)
- Check you're using the correct project (DEV: `tislabgxitwtcqfwrpik`)

### Issue: Can't find Secret API keys section
- Make sure you're on the **"Publishable and secret API keys"** tab
- If you don't see it, your project might need to be upgraded
- Contact Supabase support if the option isn't available

## Summary

1. ✅ Get new Secret API key from "Publishable and secret API keys" tab
2. ✅ Update `.env` file with new key (same variable name)
3. ✅ Test scripts work with new key
4. ✅ Optionally disable legacy keys after verification

The scripts don't need any code changes - just update the key value in `.env`!

---

**Last Updated**: $(date)
**Status**: Ready for migration

