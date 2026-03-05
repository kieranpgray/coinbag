# Production Migration Status

This document consolidates database migrations required for production (`auvtsvmtfrbpvgyvfqlx`). The application includes **schema fallback workarounds** so the app can run when migrations are not applied, but full functionality requires the correct schema.

## Schema Check (Run First)

Before applying migrations, verify what exists in production:

```sql
-- Check assets table columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'assets' 
ORDER BY ordinal_position;

-- Check accounts table columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'accounts' 
ORDER BY ordinal_position;

-- Check if tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('asset_value_history', 'net_worth_history', 'workspace_memberships');
```

## Required Migrations (Exact Order)

Apply via Supabase Dashboard SQL Editor: https://app.supabase.com/project/auvtsvmtfrbpvgyvfqlx/sql/new

### Core Tables (if missing)
- `supabase/migrations/20251228140000_create_accounts_table.sql`
- `supabase/migrations/20251228110046_create_assets_table.sql`

### Accounts Credit Fields
- `supabase/migrations/20251231000001_add_credit_fields_to_accounts.sql` — adds `credit_limit`, `balance_owed`

### Asset Value History
- `supabase/migrations/20260208161317_create_asset_value_history.sql` — creates table
- `supabase/migrations/20260208161319_add_history_triggers.sql` — triggers for value change logging
- `supabase/migrations/20260216120000_add_asset_value_as_at_date.sql` — adds `value_as_at_date`

### Net Worth History
- `supabase/migrations/20260204000000_create_net_worth_history_table.sql`

### Asset Columns (Stock/RSU/Real Estate)
- `supabase/migrations/20260213120000_add_stock_rsu_asset_columns.sql` — ticker, quantity, purchase_price, etc.
- `supabase/migrations/20260216000000_add_price_caching.sql` — `last_price_fetched_at`, `price_source`
- `supabase/migrations/20260216120001_add_assets_address_property_grant_price.sql` — `address`, `property_type`, `grant_price`

### Workspace (if using collaboration features)
- `supabase/migrations/20260226000000_create_workspaces_schema.sql`
- `supabase/migrations/20260226120000_workspace_context_domain_tables.sql`
- `supabase/migrations/20260226180000_workspace_invite_accept_function.sql`
- `supabase/migrations/20260304120000_fix_workspace_memberships_rls_recursion.sql`

## Application Fallbacks

When schema is behind, the app uses reduced column selects:

| Resource | Fallback behavior |
|----------|-------------------|
| assets | Retries with selectColumnsMinimal (`id, name, type, value, date_added, user_id, created_at, updated_at`) |
| accounts | Retries with selectColumnsMinimal (drops `last_updated`, `hidden`, `credit_limit`, `balance_owed`) |
| asset_value_history | Returns empty array when table does not exist |
| net_worth_history | Returns empty array when table does not exist |

**Recommended fix:** Apply migrations so fallbacks are not needed and all features work fully.

## Verification

After applying migrations:

1. **Assets:** Edit an asset with address (Real Estate) — save should succeed
2. **Accounts:** List accounts — should load without 400
3. **Change history:** AssetChangeLog shows "No change history available." or populated history
4. **Net worth chart:** Dashboard chart loads without 404
