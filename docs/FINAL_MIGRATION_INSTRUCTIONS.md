# Final Migration Instructions

## Status

✅ **Migration 1**: Completed successfully  
✅ **Migration 2**: Fixed and ready (idempotent - safe to re-run)  
⏳ **Migrations 2-12**: Ready to execute

## Issue Encountered

Direct PostgreSQL connection failed due to network/DNS resolution issues. Supabase REST API doesn't support arbitrary SQL execution.

## Solution: Manual Execution via Supabase Dashboard

This is actually the **safest** method for production migrations.

### Step-by-Step Instructions

1. **Go to Supabase Dashboard**
   - Navigate to: https://app.supabase.com
   - Select your project: `auvtsvmtfrbpvgyvfqlx`

2. **Open SQL Editor**
   - Click **SQL Editor** in the left sidebar
   - Click **New query**

3. **Run Migrations in Order**

   For each migration (2-12), follow these steps:
   
   a. Open the migration file from `supabase/migrations/`:
      - Migration 2: `20251227120113_create_categories_table.sql` ✅ **FIXED**
      - Migration 3: `20251227120114_fix_subscriptions_user_id_type.sql`
      - Migration 4: `20251227130000_create_user_preferences_table.sql`
      - Migration 5: `20251228110046_create_assets_table.sql`
      - Migration 6: `20251228120000_add_cash_asset_type.sql`
      - Migration 7: `20251228130000_create_liabilities_table.sql`
      - Migration 8: `20251228140000_create_accounts_table.sql`
      - Migration 9: `20251228150000_create_income_table.sql`
      - Migration 10: `20251228160000_create_goals_table.sql`
      - Migration 11: `20251228170000_test_jwt_extraction_function.sql`
      - Migration 12: `20251228180000_data_recovery_fix_user_ids.sql`
   
   b. Copy the entire SQL content
   
   c. Paste into SQL Editor
   
   d. Click **Run** (or press Cmd/Ctrl + Enter)
   
   e. Verify success message: "Success. No rows returned" or similar
   
   f. **Wait for completion** before proceeding to next migration

4. **Verify After All Migrations**

   Run this SQL to verify all tables exist:
   ```sql
   SELECT table_name 
   FROM information_schema.tables 
   WHERE table_schema = 'public' 
   ORDER BY table_name;
   ```
   
   Expected tables:
   - `accounts`
   - `assets`
   - `categories`
   - `goals`
   - `income`
   - `liabilities`
   - `subscriptions`
   - `user_preferences`

## Migration 2 Fix

Migration 2 has been fixed to handle existing policies. It now:
- Drops policies before creating them (idempotent)
- Drops triggers before creating them
- Safe to re-run if it partially failed before

## Quick Copy Helper

I've prepared all migration files. You can also run:

```bash
./scripts/prepare-migrations-for-dashboard.sh
```

This creates a `migration-outputs/` directory with all migrations ready to copy-paste.

## Troubleshooting

### Error: "policy already exists"
- **Migration 2**: Should be fixed now - re-run it
- **Other migrations**: Check if migration partially ran - may need to drop policies first

### Error: "relation already exists"
- Table already created - this is OK, migration is idempotent
- Verify table structure matches expected schema

### Error: "column already exists"
- Column already added - this is OK
- Migration uses `IF NOT EXISTS` where possible

### Connection Issues
- If SQL Editor is slow, wait a few seconds between migrations
- Supabase may throttle rapid SQL execution

## After Migrations Complete

1. **Configure Clerk JWT Validation**:
   - Go to Authentication → Settings
   - Set JWKS URL: `https://<your-clerk-domain>/.well-known/jwks.json`
   - Set Issuer: `https://<your-clerk-domain>`
   - Set Audience: Your Clerk Application ID
   - Enable JWT verification

2. **Test JWT Extraction**:
   ```sql
   SELECT test_jwt_extraction();
   ```

3. **Set Vercel Environment Variables** (if not done):
   - `VITE_DATA_SOURCE=supabase`
   - `VITE_SUPABASE_URL=https://auvtsvmtfrbpvgyvfqlx.supabase.co`
   - `VITE_SUPABASE_ANON_KEY=<your-anon-key>`
   - `VITE_CLERK_PUBLISHABLE_KEY=<your-clerk-production-key>`

## Summary

- ✅ Migration 1: Done
- ✅ Migration 2: Fixed and ready
- ⏳ Migrations 2-12: Ready to execute manually (safest method)

The manual method via Supabase Dashboard is actually **recommended** for production as it gives you full control and visibility into each migration step.

