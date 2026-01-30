# Apply Missing Migrations to Production

## Quick Method: SQL Editor

Since the Supabase CLI has migration conflicts, apply the migrations directly via SQL Editor:

### Step 1: Open SQL Editor

1. Go to [Supabase Dashboard → SQL Editor](https://app.supabase.com/project/auvtsvmtfrbpvgyvfqlx/sql/new)
2. Click **"New query"**

### Step 2: Copy and Execute

1. Open the file: `scripts/apply-missing-migrations.sql`
2. Copy the entire contents
3. Paste into SQL Editor
4. Click **"Run"** or press `Ctrl+Enter` (or `Cmd+Enter` on Mac)

### Step 3: Verify

After execution, check the output for verification messages:
- ✅ `ocr_results table exists`
- ✅ `idx_transactions_duplicate_check index exists`
- ✅ `user_statement_count_hourly view exists`
- ✅ `correlation_id column exists in statement_imports`

## What This Script Does

1. **Creates `ocr_results` table** (Critical)
   - Caches OCR extraction results
   - Includes RLS policies
   - Creates indexes

2. **Creates duplicate check index** (Recommended)
   - Optimizes transaction duplicate detection
   - Improves query performance

3. **Creates materialized view** (Recommended)
   - Optimizes rate limit checking
   - Improves statement import performance

4. **Adds correlation_id column** (Optional)
   - Enables end-to-end tracing
   - Useful for debugging

## Safety

- ✅ All migrations use `IF NOT EXISTS` patterns
- ✅ Safe to run multiple times
- ✅ No data loss (additive changes only)
- ✅ Includes verification queries

## Alternative: Individual Migrations

If you prefer to apply migrations individually, use these files in order:

1. `supabase/migrations/20260123000000_create_ocr_results_table.sql`
2. `supabase/migrations/20260123000001_add_transactions_duplicate_check_index.sql`
3. `supabase/migrations/20260123000002_create_user_statement_count_view.sql`
4. `supabase/migrations/20250101000000_add_correlation_id_to_statement_imports.sql`

## After Application

Run verification:
```bash
npx tsx scripts/compare-dev-prod-schema.ts
```

Expected: All 11/11 tables should exist.

