# Supabase Dev to Production Migration Guide

This guide walks you through migrating all database schema, policies, and configuration from your dev Supabase instance to your new production instance.

## What Gets Migrated

### ✅ Schema & Structure (Via Migrations)
- All database tables (subscriptions, categories, assets, liabilities, accounts, income, goals, user_preferences)
- Row Level Security (RLS) policies
- Indexes for performance
- Triggers for automatic timestamp updates
- Database functions (JWT extraction test function)

### ✅ Configuration
- RLS policies
- Database constraints
- Default values

### ❌ User Data (NOT Migrated)
- **User data stays in dev** - Production starts fresh
- Each user's data is isolated by `user_id` (Clerk user ID)
- Users will create their own data in production

### ✅ Default Categories (Created Dynamically)
- Default categories are created automatically when users sign up
- No migration needed - handled by `ensureDefaultCategories()` function
- Categories: "Uncategorised", "Utilities", "Entertainment", "Software", "Streaming", "Cloud Storage", "Insurance"

## Prerequisites

Before starting, ensure you have:

- [ ] Access to your **production Supabase project** dashboard
- [ ] Access to your **dev Supabase project** dashboard (for reference)
- [ ] All 12 migration files ready in `supabase/migrations/`
- [ ] Clerk production credentials ready (for JWT configuration)

## Step-by-Step Migration Process

### Step 1: Verify Production Supabase Project

1. Go to [app.supabase.com](https://app.supabase.com)
2. Select your **production** project
3. Verify it's a fresh/empty project (no tables yet)
4. Note your production project URL and anon key

### Step 2: Run Migrations in Order

**⚠️ CRITICAL**: Run migrations in this exact order. Each migration depends on the previous one.

#### Migration 1: Subscriptions Table
**File**: `supabase/migrations/20251227120112_create_subscriptions_table.sql`

**What it does**:
- Creates `subscriptions` table
- Sets up RLS policies
- Creates indexes
- Adds triggers for `updated_at`

**Steps**:
1. Open Supabase Dashboard → **SQL Editor**
2. Click **New query**
3. Open the migration file and copy all SQL
4. Paste into SQL Editor
5. Click **Run** (or Cmd/Ctrl + Enter)
6. Verify success message: "Success. No rows returned"

**Verification**:
```sql
-- Run this to verify table exists
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name = 'subscriptions';
-- Should return: subscriptions
```

---

#### Migration 2: Categories Table
**File**: `supabase/migrations/20251227120113_create_categories_table.sql`

**What it does**:
- Creates `categories` table
- Sets up RLS policies
- Creates indexes
- **Important**: Also adds `category_id` column to subscriptions table
- Migrates existing category strings to category IDs

**Steps**: Same as Migration 1

**Verification**:
```sql
-- Verify categories table exists
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name = 'categories';
-- Should return: categories

-- Verify category_id column added to subscriptions
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'subscriptions' AND column_name = 'category_id';
-- Should return: category_id
```

---

#### Migration 3: Fix Subscriptions User ID Type
**File**: `supabase/migrations/20251227120114_fix_subscriptions_user_id_type.sql`

**What it does**:
- ⚠️ **CRITICAL**: Fixes RLS policies to use `auth.jwt() ->> 'sub'` instead of `auth.uid()`
- Changes `user_id` column type from `uuid` to `text` (for Clerk compatibility)
- Updates all RLS policies to work with Clerk JWTs

**Steps**: Same as Migration 1

**Verification**:
```sql
-- Verify user_id is now text type
SELECT data_type FROM information_schema.columns 
WHERE table_name = 'subscriptions' AND column_name = 'user_id';
-- Should return: text

-- Verify RLS policies use auth.jwt()
SELECT policyname, pg_get_expr(polqual, polrelid) as using_expression
FROM pg_policies 
WHERE tablename = 'subscriptions';
-- Should show: (auth.jwt() ->> 'sub') = user_id
```

---

#### Migration 4: User Preferences Table
**File**: `supabase/migrations/20251227130000_create_user_preferences_table.sql`

**What it does**:
- Creates `user_preferences` table
- Sets up default values (dark_mode, privacy_mode, tax_rate, etc.)
- Sets up RLS policies

**Steps**: Same as Migration 1

**Verification**:
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name = 'user_preferences';
-- Should return: user_preferences
```

---

#### Migration 5: Assets Table
**File**: `supabase/migrations/20251228110046_create_assets_table.sql`

**What it does**:
- Creates `assets` table
- Sets up RLS policies
- Creates indexes
- Adds triggers

**Steps**: Same as Migration 1

**Verification**:
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name = 'assets';
-- Should return: assets
```

---

#### Migration 6: Add Cash Asset Type
**File**: `supabase/migrations/20251228120000_add_cash_asset_type.sql`

**What it does**:
- Adds "Cash" to the asset type enum
- Updates CHECK constraint

**Steps**: Same as Migration 1

**Verification**:
```sql
-- Check constraint should include 'Cash'
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'assets'::regclass AND conname LIKE '%asset_type%';
-- Should show: CHECK (asset_type IN ('Investment', 'Real Estate', 'Vehicle', 'Crypto', 'Other', 'Cash'))
```

---

#### Migration 7: Liabilities Table
**File**: `supabase/migrations/20251228130000_create_liabilities_table.sql`

**What it does**:
- Creates `liabilities` table
- Sets up RLS policies
- Creates indexes
- Adds triggers

**Steps**: Same as Migration 1

**Verification**:
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name = 'liabilities';
-- Should return: liabilities
```

---

#### Migration 8: Accounts Table
**File**: `supabase/migrations/20251228140000_create_accounts_table.sql`

**What it does**:
- Creates `accounts` table
- Sets up RLS policies
- Creates indexes
- Adds triggers

**Steps**: Same as Migration 1

**Verification**:
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name = 'accounts';
-- Should return: accounts
```

---

#### Migration 9: Income Table
**File**: `supabase/migrations/20251228150000_create_income_table.sql`

**What it does**:
- Creates `income` table
- Sets up RLS policies
- Creates indexes
- Adds triggers

**Steps**: Same as Migration 1

**Verification**:
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name = 'income';
-- Should return: income
```

---

#### Migration 10: Goals Table
**File**: `supabase/migrations/20251228160000_create_goals_table.sql`

**What it does**:
- Creates `goals` table
- Sets up RLS policies
- Creates indexes
- Adds triggers

**Steps**: Same as Migration 1

**Verification**:
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name = 'goals';
-- Should return: goals
```

---

#### Migration 11: JWT Extraction Test Function
**File**: `supabase/migrations/20251228170000_test_jwt_extraction_function.sql`

**What it does**:
- Creates `test_jwt_extraction()` function
- Useful for testing JWT validation configuration
- Helps diagnose JWT issues

**Steps**: Same as Migration 1

**Verification**:
```sql
-- Verify function exists
SELECT routine_name FROM information_schema.routines 
WHERE routine_schema = 'public' AND routine_name = 'test_jwt_extraction';
-- Should return: test_jwt_extraction
```

---

#### Migration 12: Data Recovery Fix
**File**: `supabase/migrations/20251228180000_data_recovery_fix_user_ids.sql`

**What it does**:
- Creates helper function for fixing NULL user_ids (if any)
- Useful if data was inserted before JWT validation was configured
- **Note**: For fresh production instance, this won't do anything, but it's safe to run

**Steps**: Same as Migration 1

**Verification**: Function created (no data to fix in fresh instance)

---

### Step 3: Verify All Tables Created

Run this SQL in Supabase SQL Editor:

```sql
-- List all tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

**Expected Tables** (8 total):
- `accounts`
- `assets`
- `categories`
- `goals`
- `income`
- `liabilities`
- `subscriptions`
- `user_preferences`

---

### Step 4: Verify RLS is Enabled

Run this SQL:

```sql
-- Check RLS status for all tables
SELECT 
  tablename, 
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;
```

**Expected**: All tables should show `rls_enabled = true`

---

### Step 5: Verify RLS Policies

Run this SQL:

```sql
-- Count policies per table
SELECT 
  tablename, 
  COUNT(*) as policy_count
FROM pg_policies 
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;
```

**Expected**: Each table should have 4 policies (SELECT, INSERT, UPDATE, DELETE)

---

### Step 6: Verify RLS Policies Use Correct Syntax

**⚠️ CRITICAL CHECK**: Ensure all policies use `auth.jwt() ->> 'sub'` (NOT `auth.uid()`)

Run this SQL:

```sql
-- Check policy expressions
SELECT 
  tablename,
  policyname,
  pg_get_expr(polqual, polrelid) as using_expression,
  pg_get_expr(polwithcheck, polrelid) as with_check_expression
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

**Expected**: All expressions should contain `auth.jwt() ->> 'sub'`, NOT `auth.uid()`

**If you see `auth.uid()`**: The subscriptions fix migration (Migration 3) may not have run correctly. Re-run it.

---

### Step 7: Configure Clerk JWT Validation

**This is REQUIRED** for RLS policies to work.

1. Get your Clerk production JWKS URL:
   - Format: `https://<your-clerk-domain>/.well-known/jwks.json`
   - Example: `https://xxxxx.clerk.accounts.dev/.well-known/jwks.json`
   - Find this in Clerk Dashboard → Settings → Domains

2. Get your Clerk production issuer:
   - Format: `https://<your-clerk-domain>`
   - Example: `https://xxxxx.clerk.accounts.dev`

3. Get your Clerk production Application ID (audience):
   - Found in Clerk Dashboard → API Keys → Application ID

4. Configure in Supabase:
   - Go to **Authentication** → **Settings**
   - Scroll to **JWT Settings** or **JWKS URL**
   - Set **JWKS URL**: Your Clerk JWKS URL
   - Set **Issuer**: Your Clerk issuer
   - Set **Audience**: Your Clerk Application ID
   - Enable **JWT verification**
   - Click **Save**

5. Wait 2-5 minutes for configuration to propagate

---

### Step 8: Test JWT Validation

Run this SQL in Supabase SQL Editor (you'll need to be authenticated via your app):

```sql
-- Test JWT extraction
SELECT test_jwt_extraction();
```

**Expected Result** (when signed in):
```json
{
  "jwt_exists": true,
  "has_sub": true,
  "user_id": "user_xxxxx",
  "status": "✅ JWT validation working"
}
```

**If JWT not configured**:
```json
{
  "jwt_exists": false,
  "has_sub": false,
  "user_id": null,
  "status": "❌ JWT validation NOT configured"
}
```

**Alternative Test** (without being signed in):
```sql
SELECT 
  auth.jwt() IS NOT NULL as jwt_configured,
  auth.jwt() ->> 'sub' as user_id,
  CASE 
    WHEN auth.jwt() IS NULL THEN '❌ NOT CONFIGURED'
    WHEN auth.jwt() ->> 'sub' IS NULL THEN '⚠️ CONFIGURED BUT NO SUB'
    ELSE '✅ WORKING'
  END as status;
```

**Note**: This will show `jwt_configured = false` if you're not authenticated. To test properly, sign in to your app first, then run the test.

---

## Migration Checklist

Use this checklist to track your progress:

### Migrations
- [ ] Migration 1: Subscriptions table
- [ ] Migration 2: Categories table
- [ ] Migration 3: Fix subscriptions user_id type ⚠️ **CRITICAL**
- [ ] Migration 4: User preferences table
- [ ] Migration 5: Assets table
- [ ] Migration 6: Add cash asset type
- [ ] Migration 7: Liabilities table
- [ ] Migration 8: Accounts table
- [ ] Migration 9: Income table
- [ ] Migration 10: Goals table
- [ ] Migration 11: JWT extraction test function
- [ ] Migration 12: Data recovery fix

### Verification
- [ ] All 8 tables exist
- [ ] RLS enabled on all tables
- [ ] 4 policies per table (32 total policies)
- [ ] All policies use `auth.jwt() ->> 'sub'` (NOT `auth.uid()`)
- [ ] All indexes created
- [ ] All triggers created

### Configuration
- [ ] Clerk JWT validation configured
- [ ] JWKS URL set correctly
- [ ] Issuer set correctly
- [ ] Audience set correctly
- [ ] JWT verification enabled
- [ ] Test JWT extraction function works

---

## Quick Migration Script

If you want to run all migrations at once (not recommended for first-time setup, but useful for reference):

**⚠️ WARNING**: Run migrations one at a time for the first production setup. Use this script only if you're confident.

```sql
-- This is a reference - DO NOT run all at once without testing
-- Run each migration file separately instead

-- Migration 1: (copy from file)
-- Migration 2: (copy from file)
-- ... etc
```

**Better Approach**: Use the step-by-step process above.

---

## Troubleshooting

### Issue: Migration fails with "relation already exists"

**Cause**: Table already exists from a previous migration attempt.

**Solution**:
- Check if table exists: `SELECT * FROM <table_name> LIMIT 1;`
- If table exists and is correct, skip that migration
- If table exists but is wrong, drop it: `DROP TABLE <table_name> CASCADE;` (then re-run migration)

### Issue: RLS policies blocking all queries

**Cause**: JWT validation not configured or using wrong syntax.

**Solution**:
1. Verify JWT validation is configured (Step 7)
2. Verify policies use `auth.jwt() ->> 'sub'` (Step 6)
3. Wait 2-5 minutes after configuring JWT
4. Sign out and sign back in to get fresh JWT

### Issue: "auth.jwt() returns NULL"

**Cause**: JWT validation not configured in Supabase.

**Solution**:
1. Go to Supabase Dashboard → Authentication → Settings
2. Configure JWKS URL, Issuer, and Audience
3. Enable JWT verification
4. Wait 2-5 minutes
5. Test again

### Issue: Policies use `auth.uid()` instead of `auth.jwt() ->> 'sub'`

**Cause**: Migration 3 (fix subscriptions) didn't run or didn't complete.

**Solution**:
1. Re-run Migration 3: `20251227120114_fix_subscriptions_user_id_type.sql`
2. Verify policies updated (Step 6)
3. Check other tables - they should all use `auth.jwt() ->> 'sub'` from the start

---

## What's Next?

After completing all migrations:

1. **Set Vercel Environment Variables** (see `docs/MANUAL_PREREQUISITES_CHECKLIST.md`)
2. **Deploy to Vercel**
3. **Test Production Deployment**:
   - Sign in with Clerk
   - Create test data
   - Verify data persists
   - Test user isolation

---

## Reference: Migration File Locations

All migration files are in: `supabase/migrations/`

1. `20251227120112_create_subscriptions_table.sql`
2. `20251227120113_create_categories_table.sql`
3. `20251227120114_fix_subscriptions_user_id_type.sql` ⚠️ **CRITICAL**
4. `20251227130000_create_user_preferences_table.sql`
5. `20251228110046_create_assets_table.sql`
6. `20251228120000_add_cash_asset_type.sql`
7. `20251228130000_create_liabilities_table.sql`
8. `20251228140000_create_accounts_table.sql`
9. `20251228150000_create_income_table.sql`
10. `20251228160000_create_goals_table.sql`
11. `20251228170000_test_jwt_extraction_function.sql`
12. `20251228180000_data_recovery_fix_user_ids.sql`

---

## Support

If you encounter issues:
1. Check Supabase Dashboard → Logs for errors
2. Verify each migration succeeded before proceeding
3. Test JWT validation after configuring
4. Review `docs/CLERK_SUPABASE_JWT_SETUP.md` for JWT configuration details

