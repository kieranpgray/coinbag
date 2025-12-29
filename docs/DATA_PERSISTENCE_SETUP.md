# Data Persistence Setup Guide

This guide explains how to configure and verify that all user-entered data persists across logout/login, server restarts, and browser sessions.

## Overview

The Coinbag application uses Supabase PostgreSQL database for data persistence. All user data is stored securely with Row Level Security (RLS) policies ensuring users can only access their own data.

## Prerequisites

- Supabase project created and configured
- Clerk authentication configured
- Environment variables set in `.env` file

## Step 1: Environment Configuration

### Verify Environment Variables

Ensure your `.env` file contains:

```bash
# Clerk Authentication (Required)
VITE_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key

# Data Source Toggle
VITE_DATA_SOURCE=supabase

# Supabase Database (Required when VITE_DATA_SOURCE=supabase)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

**Important**: 
- Set `VITE_DATA_SOURCE=supabase` for data persistence
- Set `VITE_DATA_SOURCE=mock` only for development/testing (data won't persist)

### Validate Environment

The app automatically validates environment variables on startup. Check the browser console for warnings or errors.

You can also manually validate:

```bash
# The app will log warnings/errors on startup
npm run dev
```

## Step 2: Run Database Migrations

All database tables must be created before the app can persist data. Migrations are SQL scripts that create tables, indexes, and RLS policies.

### Verify Migrations Status

Run the migration verification script:

```bash
npx tsx scripts/verify-migrations.ts
```

This script will:
- Check if all required tables exist
- List any missing tables
- Provide instructions for running missing migrations

### Run Missing Migrations

If tables are missing, run the migrations in Supabase Dashboard:

1. **Open Supabase Dashboard**:
   - Go to your Supabase project dashboard
   - Navigate to **SQL Editor**

2. **Run Migrations in Order**:
   - Copy the contents of each migration file from `supabase/migrations/`
   - Run them in chronological order (by timestamp in filename):
     - `20251227120112_create_subscriptions_table.sql`
     - `20251227120113_create_categories_table.sql`
     - `20251227120114_fix_subscriptions_user_id_type.sql`
     - `20251227130000_create_user_preferences_table.sql`
     - `20251228110046_create_assets_table.sql`
     - `20251228120000_add_cash_asset_type.sql`
     - `20251228130000_create_liabilities_table.sql`
     - `20251228140000_create_accounts_table.sql`
     - `20251228150000_create_income_table.sql`
     - `20251228160000_create_goals_table.sql`

3. **Verify Success**:
   - Each migration should show "Success. No rows returned"
   - Re-run `npx tsx scripts/verify-migrations.ts` to confirm all tables exist

## Step 3: Verify Data Persistence

### Manual Verification Checklist

Follow these steps to verify data persists correctly:

1. **Start the Development Server**:
   ```bash
   npm run dev
   ```

2. **Sign In**:
   - Open the app in your browser
   - Sign in with Clerk

3. **Create Test Data**:
   - Create at least one of each entity type:
     - **Assets**: Add an asset (e.g., "Test Asset", type "Other", value $1000)
     - **Liabilities**: Add a liability (e.g., "Test Loan", type "Loans", balance $5000)
     - **Accounts**: Add an account (if applicable)
     - **Income**: Add an income source (e.g., "Salary", $5000/month)
     - **Subscriptions**: Add a subscription (e.g., "Netflix", $15/month)
     - **Goals**: Add a goal (e.g., "Save for vacation", target $5000)

4. **Verify Data Appears**:
   - Check that all created data appears in the respective pages
   - Verify dashboard shows correct aggregations

5. **Logout**:
   - Click logout/sign out
   - Confirm you're redirected to sign-in page

6. **Login Again**:
   - Sign in with the same Clerk account
   - Navigate to each page (Assets, Liabilities, Income, Subscriptions, Goals)

7. **Verify Data Persists**:
   - ✅ All previously created data should still be present
   - ✅ Dashboard should show the same aggregations
   - ✅ No data should be missing or reset

8. **Test Server Restart**:
   - Stop the dev server (Ctrl+C)
   - Restart: `npm run dev`
   - Refresh the browser
   - ✅ All data should still be present

9. **Test User Isolation** (Optional):
   - Sign out
   - Create a second Clerk account (or use a different account)
   - Sign in with the second account
   - ✅ Should see empty/zero data (no data from first account)
   - Sign out and sign back in with first account
   - ✅ Should see original data (no data from second account)

## Step 4: Troubleshooting

### Issue: Data Not Persisting

**Symptoms**: Data disappears after logout/login or server restart

**Possible Causes**:
1. `VITE_DATA_SOURCE` is set to `mock` instead of `supabase`
2. Migrations haven't been run
3. Supabase credentials are incorrect
4. RLS policies are blocking writes

**Solutions**:
1. Check `.env` file: `VITE_DATA_SOURCE=supabase`
2. Run `npx tsx scripts/verify-migrations.ts` to check tables
3. Verify Supabase credentials in `.env`
4. Check browser console for errors
5. Check Supabase dashboard → Logs for database errors

### Issue: "Table does not exist" Errors

**Solution**: Run the missing migrations in Supabase SQL Editor

### Issue: "Permission denied" or RLS Errors

**Symptoms**: Can't create/read data, getting permission errors

**Possible Causes**:
1. Clerk JWT not configured in Supabase
2. RLS policies not set up correctly
3. User not authenticated

**Solutions**:
1. Verify Clerk JWT configuration in Supabase (see `docs/SUPABASE_SETUP.md`)
2. Check RLS policies in Supabase dashboard → Authentication → Policies
3. Ensure user is signed in with Clerk

### Issue: Environment Variables Not Loading

**Symptoms**: App shows "mock" data source or Supabase errors

**Solutions**:
1. Ensure `.env` file is in project root
2. Restart dev server after changing `.env`
3. Check that variable names start with `VITE_`
4. Verify no typos in variable names

### Issue: Goals Not Persisting

**Symptoms**: Goals work but don't persist

**Check**:
1. Verify `goals` table exists: `npx tsx scripts/verify-migrations.ts`
2. Check browser console for errors
3. Verify `src/data/goals/repo.ts` uses `SupabaseGoalsRepository`

## Step 5: Production Checklist

Before deploying to production:

- [ ] `VITE_DATA_SOURCE=supabase` is set
- [ ] All migrations have been run in production Supabase instance
- [ ] Supabase credentials are configured in production environment
- [ ] Clerk JWT is configured in production Supabase
- [ ] RLS policies are enabled and tested
- [ ] Data persistence verified with test account
- [ ] User isolation verified (multiple users see only their data)

## Repository Pattern

The app uses a repository pattern for data access:

- **Mock Repository**: In-memory storage (no persistence) - used when `VITE_DATA_SOURCE=mock`
- **Supabase Repository**: PostgreSQL database storage - used when `VITE_DATA_SOURCE=supabase`

All repositories implement the same interface, so switching between mock and Supabase is seamless.

## Data Entities

The following entities are persisted in Supabase:

- **Assets**: Real estate, investments, vehicles, crypto, cash, other assets
- **Liabilities**: Loans, credit cards, other debts
- **Accounts**: Bank accounts, investment accounts
- **Income**: Salary, freelance, business, investments, rental, other income sources
- **Subscriptions**: Recurring expenses (utilities, entertainment, etc.)
- **Goals**: Financial goals (grow, save, pay off, invest)
- **Categories**: User-defined subscription categories
- **User Preferences**: User settings and preferences

## Security

All data is protected by:

1. **Row Level Security (RLS)**: Database-level policies ensure users can only access their own data
2. **Clerk Authentication**: JWT tokens verify user identity
3. **User ID Isolation**: All tables use `user_id` column filtered by Clerk JWT `sub` claim

## Support

If you encounter issues:

1. Check browser console for errors
2. Check Supabase dashboard → Logs for database errors
3. Run verification scripts: `npx tsx scripts/verify-migrations.ts`
4. Review this guide and `docs/SUPABASE_SETUP.md`

