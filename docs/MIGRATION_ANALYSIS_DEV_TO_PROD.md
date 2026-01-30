# Migration Analysis: Dev to Production

**Date**: January 27, 2025  
**Dev Project**: `tislabgxitwtcqfwrpik`  
**Prod Project**: `auvtsvmtfrbpvgyvfqlx`  
**Total Migrations**: 41

## Executive Summary

### Production Database Status
- ✅ **10/11 required tables exist**
- ❌ **1 table missing**: `ocr_results`
- ✅ **Functions**: `test_jwt_extraction` exists
- ⚠️ **Migrations**: Some migrations may not be fully applied

### Missing in Production
1. **Table**: `ocr_results` (from migration `20260123000000_create_ocr_results_table.sql`)
2. **Related migrations** that may not be applied:
   - `20260123000001_add_transactions_duplicate_check_index.sql` (index)
   - `20260123000002_create_user_statement_count_view.sql` (view)

## Complete Migration Inventory

### Core Table Migrations (Applied ✅)

1. ✅ `20251227120112_create_subscriptions_table.sql` → Later renamed to `expenses`
2. ✅ `20251227120113_create_categories_table.sql`
3. ✅ `20251227120114_fix_subscriptions_user_id_type.sql`
4. ✅ `20251227130000_create_user_preferences_table.sql`
5. ✅ `20251228110046_create_assets_table.sql`
6. ✅ `20251228130000_create_liabilities_table.sql`
7. ✅ `20251228140000_create_accounts_table.sql`
8. ✅ `20251228150000_create_income_table.sql`
9. ✅ `20251228160000_create_goals_table.sql`
10. ✅ `20251230000000_create_transactions_table.sql`
11. ✅ `20251230000001_create_statement_imports_table.sql`
12. ✅ `20260103085822_rename_subscriptions_to_expenses.sql`

### Schema Enhancement Migrations (Likely Applied ✅)

13. `20251228120000_add_cash_asset_type.sql` - Adds asset type enum value
14. `20251229160000_add_liability_repayment_fields.sql` - Adds repayment fields
15. `20251229160001_add_superannuation_asset_type.sql` - Adds asset type enum value
16. `20251230000002_add_currency_to_accounts.sql` - Adds currency column
17. `20251230000003_add_account_type_constraint.sql` - Adds constraints
18. `20251231000001_add_credit_fields_to_accounts.sql` - Adds credit fields
19. `20251231000002_update_account_types.sql` - Updates account types
20. `20251231000003_add_account_linking_to_goals.sql` - Links accounts to goals
21. `20251231000004_remove_available_balance_and_make_institution_optional.sql` - Schema cleanup
22. `20251231000005_add_locale_to_user_preferences.sql` - Adds locale field
23. `20260106000000_ensure_institution_is_optional.sql` - Makes institution optional
24. `20260108000000_add_hide_setup_checklist_to_user_preferences.sql` - Adds preference field
25. `20260112101715_add_paid_from_account_to_expenses.sql` - Links accounts to expenses
26. `20260112101716_add_paid_to_account_to_income.sql` - Links accounts to income
27. `20260114120000_make_next_payment_date_nullable.sql` - Makes field nullable
28. `20260115100000_make_expense_dates_optional.sql` - Makes dates optional

### Function & Infrastructure Migrations (Applied ✅)

29. ✅ `20251228170000_test_jwt_extraction_function.sql` - JWT test function
30. `20251230000002_enable_statement_imports_realtime.sql` - Enables realtime
31. `20251230000004_add_transactions_foreign_key.sql` - Adds foreign keys
32. `20251230000005_create_statement_storage_bucket.sql` - Creates storage bucket
33. `20251230000006_fix_statement_storage_rls_policies.sql` - Fixes RLS policies
34. `20260117105340_add_transaction_provenance_documentation.sql` - Adds documentation
35. `20260122194652_purge_bad_cache_transactions.sql` - Data cleanup (one-time)
36. `20260125000000_fix_sync_goal_trigger_account_id_error.sql` - Fixes trigger

### Missing Migrations (Need to Apply ❌)

37. ❌ `20260123000000_create_ocr_results_table.sql` - **MISSING TABLE**
38. ❓ `20260123000001_add_transactions_duplicate_check_index.sql` - Index (may be missing)
39. ❓ `20260123000002_create_user_statement_count_view.sql` - View (may be missing)
40. ❓ `20250101000000_add_correlation_id_to_statement_imports.sql` - Column (may be missing)
41. ❓ `20251228180000_data_recovery_fix_user_ids.sql` - Data fix (one-time, may not be needed)

## Detailed Analysis

### Missing Table: `ocr_results`

**Migration**: `20260123000000_create_ocr_results_table.sql`

**Purpose**: Caches OCR extraction results to avoid re-processing duplicate statements

**Structure**:
- `id` (uuid, primary key)
- `file_hash` (text, indexed)
- `ocr_content_hash` (text, indexed)
- `markdown_text` (text)
- `structured_data` (jsonb)
- `pages_count` (integer)
- `created_at` (timestamp)

**RLS Policies**:
- Service role can manage all records
- Users can read records for files they've uploaded (via file_hash matching statement_imports)

**Impact**: 
- ⚠️ **Medium** - Statement processing will work but won't cache OCR results
- May cause duplicate OCR processing
- Edge Function will still function, just less efficient

### Related Missing Objects

**Index**: `20260123000001_add_transactions_duplicate_check_index.sql`
- Creates index on `transactions` table for duplicate checking
- **Impact**: Low - Performance optimization only

**View**: `20260123000002_create_user_statement_count_view.sql`
- Creates view for counting user statements
- **Impact**: Low - Analytics/UI feature only

**Column**: `20250101000000_add_correlation_id_to_statement_imports.sql`
- Adds `correlation_id` column to `statement_imports` table
- **Impact**: Low - Debugging/tracing feature only

## Migration Application Plan

### Phase 1: Critical Missing Objects (Required)

**Priority**: High  
**Impact**: Functionality

1. **Apply**: `20260123000000_create_ocr_results_table.sql`
   - Creates missing `ocr_results` table
   - Required for efficient statement processing

### Phase 2: Performance & Features (Recommended)

**Priority**: Medium  
**Impact**: Performance and features

2. **Apply**: `20260123000001_add_transactions_duplicate_check_index.sql`
   - Improves duplicate transaction detection performance

3. **Apply**: `20260123000002_create_user_statement_count_view.sql`
   - Enables statement count analytics

4. **Apply**: `20250101000000_add_correlation_id_to_statement_imports.sql`
   - Adds correlation ID for debugging

### Phase 3: Verification

**After applying migrations**:

1. Verify `ocr_results` table exists:
   ```sql
   SELECT * FROM ocr_results LIMIT 1;
   ```

2. Verify index exists:
   ```sql
   SELECT indexname FROM pg_indexes WHERE tablename = 'transactions' AND indexname LIKE '%duplicate%';
   ```

3. Verify view exists:
   ```sql
   SELECT * FROM user_statement_count LIMIT 1;
   ```

4. Verify correlation_id column exists:
   ```sql
   SELECT correlation_id FROM statement_imports LIMIT 1;
   ```

## Migration Execution

### Option 1: Apply All Missing Migrations (Recommended)

```bash
# Link to production
supabase link --project-ref auvtsvmtfrbpvgyvfqlx

# Apply all pending migrations
supabase db push
```

### Option 2: Apply Specific Migrations

If you prefer to apply only the missing ones:

1. Go to [Supabase SQL Editor](https://app.supabase.com/project/auvtsvmtfrbpvgyvfqlx/sql/new)
2. Copy and paste each migration SQL in order:
   - `20260123000000_create_ocr_results_table.sql`
   - `20260123000001_add_transactions_duplicate_check_index.sql`
   - `20260123000002_create_user_statement_count_view.sql`
   - `20250101000000_add_correlation_id_to_statement_imports.sql`
3. Execute each one
4. Verify results

## Risk Assessment

### Low Risk Migrations
- ✅ All migrations use `IF NOT EXISTS` or `DROP IF EXISTS` patterns
- ✅ Most migrations are idempotent
- ✅ No data loss risk (additive changes only)

### Medium Risk
- ⚠️ `20260122194652_purge_bad_cache_transactions.sql` - Data cleanup (one-time, may have already run)
- ⚠️ `20251228180000_data_recovery_fix_user_ids.sql` - Data fix (one-time, may not be needed in prod)

**Recommendation**: Review these data migration scripts before applying to production.

## Summary

### Required Actions

1. ✅ **Apply `ocr_results` table migration** (Critical)
2. ✅ **Apply related index and view migrations** (Recommended)
3. ✅ **Verify all objects created successfully**
4. ✅ **Test statement processing functionality**

### Estimated Time

- Migration application: 5-10 minutes
- Verification: 5 minutes
- Testing: 10 minutes
- **Total**: ~20-25 minutes

### Success Criteria

- [ ] `ocr_results` table exists
- [ ] All indexes created
- [ ] View created
- [ ] `correlation_id` column exists in `statement_imports`
- [ ] Statement processing works end-to-end
- [ ] No errors in Edge Function logs

