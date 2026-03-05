# Asset Migration Requirements

This document outlines the database migrations required to resolve asset edit failures and missing change history issues.

## Problem Description

The production Supabase database (`auvtsvmtfrbpvgyvfqlx`) is missing several migrations that add new columns and tables for asset functionality. This causes:

1. **Asset update failures**: PATCH requests return 400 errors when trying to save assets with address/property_type/grant_price fields
2. **Missing change history**: AssetChangeLog shows "Unable to load change history" because the `asset_value_history` table doesn't exist

## Required Migrations

Apply these migrations to the production Supabase project in the specified order:

### 1. Asset Value History Table
**File:** `supabase/migrations/20260208161317_create_asset_value_history.sql`

**Purpose:** Creates the `asset_value_history` table to track value changes for change history functionality.

**What it adds:**
- `asset_value_history` table with columns: `id`, `asset_id`, `previous_value`, `new_value`, `change_amount`, `created_at`, `user_id`, `value_as_at_date`
- Row Level Security policies for user data isolation
- Indexes for performance

### 2. Asset Value History Triggers
**File:** `supabase/migrations/20260208161319_add_history_triggers.sql`

**Purpose:** Adds database triggers to automatically log asset value changes.

**What it adds:**
- `log_asset_value_change()` function
- Triggers on `assets` table for INSERT/UPDATE operations
- Automatic history logging when asset values change

### 3. Value As At Date Column
**File:** `supabase/migrations/20260216120000_add_asset_value_as_at_date.sql`

**Purpose:** Adds `value_as_at_date` column to asset_value_history for date-based filtering.

**What it adds:**
- `value_as_at_date date` column to `asset_value_history` table
- Default value set to `CURRENT_DATE`

### 4. Price Caching Columns
**File:** `supabase/migrations/20260216000000_add_price_caching.sql`

**Purpose:** Adds columns for price caching and stock data.

**What it adds:**
- `last_price_fetched_at timestamp with time zone` - when price was last fetched
- `price_source text` - source of the price data (e.g., 'yahoo', 'manual')
- Index on ticker and type for performance

### 5. Asset Address and Grant Price Columns
**File:** `supabase/migrations/20260216120001_add_assets_address_property_grant_price.sql`

**Purpose:** Adds Real Estate and RSU-specific columns.

**What it adds:**
- `address text` - property address for Real Estate assets
- `property_type text` - type of property (optional)
- `grant_price numeric(12,4)` - RSU grant price

## Application of Migrations

### Option 1: Supabase Dashboard (Recommended)
1. Go to https://app.supabase.com/project/auvtsvmtfrbpvgyvfqlx/sql/new
2. Copy and paste each migration file content in order
3. Execute each migration
4. Verify with: `SELECT * FROM asset_value_history LIMIT 1;`

### Option 2: Supabase CLI
```bash
# Set up connection (requires SUPABASE_DB_PASSWORD)
export SUPABASE_DB_PASSWORD='your-password'

# Apply migrations
supabase db push
```

### Option 3: Manual Script
Use the existing script: `scripts/apply-workspace-migrations.sh`
(Note: This script focuses on workspace migrations, not asset migrations)

## Verification

After applying migrations, test the following:

1. **Asset Updates:** Try editing an asset with address (Real Estate) - should save successfully
2. **Change History:** AssetChangeLog should show "No change history available." instead of error
3. **New Assets:** Create assets with new fields (address, grant_price) - should persist

## Rollback

If needed, rollback migrations in reverse order:
- Delete `address`, `property_type`, `grant_price` columns
- Delete `last_price_fetched_at`, `price_source` columns
- Drop `asset_value_history` table and related objects

See individual migration files for specific rollback SQL.

## Code Changes

The application code has been updated with fallback logic to handle missing migrations gracefully:

- **Asset updates:** Retry with reduced column sets when PostgREST returns 400/PGRST204
- **Change history:** Return empty array when `asset_value_history` table doesn't exist
- **Tests:** Added comprehensive test coverage for fallback scenarios

These changes ensure the app works with or without the migrations applied, but full functionality requires the migrations.