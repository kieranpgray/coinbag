# Run Superannuation Migration

## Quick Method: Supabase Dashboard SQL Editor (Recommended)

Since the CLI circuit breaker is active, use the Dashboard:

1. **Go to SQL Editor**:
   - https://app.supabase.com/project/tislabgxitwtcqfwrpik/sql/new

2. **Copy and paste this SQL**:

```sql
-- Migration: Add 'Superannuation' asset type to assets table
-- Description: Adds 'Superannuation' as a valid asset type option

-- Drop existing constraint
ALTER TABLE assets
  DROP CONSTRAINT IF EXISTS assets_type_check;

-- Add new constraint with Superannuation included
ALTER TABLE assets
  ADD CONSTRAINT assets_type_check 
  CHECK (type IN ('Real Estate', 'Investments', 'Vehicles', 'Crypto', 'Cash', 'Superannuation', 'Other'));

-- Update column comment to reflect new type
COMMENT ON COLUMN assets.type IS 'Asset type: Real Estate, Investments, Vehicles, Crypto, Cash, Superannuation, Other';
```

3. **Click "Run"** (or press Cmd+Enter)

4. **Verify**: Try updating an asset to 'Superannuation' - it should work now!

## Alternative: Wait and Use CLI

If you prefer to use CLI, wait 5-10 minutes for the circuit breaker to reset, then:

```bash
./scripts/run-migration-superannuation.sh
```

This script now includes the dev project credentials.

## Project Information

- **Project**: supafolio-dev
- **Project Ref**: tislabgxitwtcqfwrpik
- **Database Password**: tfq1azv-zdr@UJE1uxp





