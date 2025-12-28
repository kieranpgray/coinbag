# Run Categories Migration

The `categories` table migration exists but hasn't been applied to your Supabase database yet.

## Quick Fix: Run Migration in Supabase Dashboard

1. **Go to Supabase Dashboard**:
   - Navigate to [https://app.supabase.com](https://app.supabase.com)
   - Select your project

2. **Open SQL Editor**:
   - Click **"SQL Editor"** in the left sidebar
   - Click **"New query"**

3. **Copy Migration SQL**:
   - Open `supabase/migrations/20251227120113_create_categories_table.sql`
   - Copy the entire contents

4. **Paste and Run**:
   - Paste the SQL into the SQL Editor
   - Click **"Run"** (or press Cmd+Enter / Ctrl+Enter)

5. **Verify**:
   - Go to **"Table Editor"** in the left sidebar
   - You should see a `categories` table listed

## Alternative: Use Supabase CLI

If you have Supabase CLI installed:

```bash
supabase db push
```

This will apply all pending migrations.

## After Running Migration

1. Refresh your browser
2. The red console errors should disappear
3. Categories should load correctly

