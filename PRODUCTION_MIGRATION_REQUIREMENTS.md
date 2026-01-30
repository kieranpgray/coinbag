# Production Migration Requirements Summary

**Date**: January 27, 2025  
**Dev Project**: `tislabgxitwtcqfwrpik`  
**Prod Project**: `auvtsvmtfrbpvgyvfqlx`

## Current Status

### Production Database
- ✅ **10/11 required tables exist**
- ✅ **Core functionality tables**: All present
- ❌ **Missing**: `ocr_results` table
- ✅ **Functions**: `test_jwt_extraction` exists

### Missing Objects in Production

1. **Table**: `ocr_results` (Critical)
   - Migration: `20260123000000_create_ocr_results_table.sql`
   - Purpose: Caches OCR extraction results
   - Impact: Medium - Statement processing works but less efficient

2. **Index**: `idx_transactions_duplicate_check` (Recommended)
   - Migration: `20260123000001_add_transactions_duplicate_check_index.sql`
   - Purpose: Optimizes duplicate transaction detection
   - Impact: Low - Performance optimization

3. **View**: `user_statement_count_hourly` (Recommended)
   - Migration: `20260123000002_create_user_statement_count_view.sql`
   - Purpose: Rate limit checking optimization
   - Impact: Low - Performance optimization

4. **Column**: `correlation_id` in `statement_imports` (Optional)
   - Migration: `20250101000000_add_correlation_id_to_statement_imports.sql`
   - Purpose: Debugging/tracing
   - Impact: Low - Debugging feature

## Required Actions

### Critical (Must Apply)

**Apply `ocr_results` table migration**:
```bash
# Option 1: Via Supabase CLI
supabase link --project-ref auvtsvmtfrbpvgyvfqlx
supabase db push

# Option 2: Manual SQL
# Go to Supabase Dashboard → SQL Editor
# Copy/paste: supabase/migrations/20260123000000_create_ocr_results_table.sql
```

### Recommended (Should Apply)

**Apply remaining migrations**:
- `20260123000001_add_transactions_duplicate_check_index.sql`
- `20260123000002_create_user_statement_count_view.sql`
- `20250101000000_add_correlation_id_to_statement_imports.sql`

## Migration Execution

### Quick Method (All Migrations)

```bash
# Link to production (if not already linked)
supabase link --project-ref auvtsvmtfrbpvgyvfqlx --password 'vzp4pkg-pvp.AMC6yhc'

# Apply all pending migrations
supabase db push
```

### Verification After Migration

```sql
-- Check ocr_results table
SELECT * FROM ocr_results LIMIT 1;

-- Check index
SELECT indexname FROM pg_indexes 
WHERE tablename = 'transactions' 
AND indexname = 'idx_transactions_duplicate_check';

-- Check view
SELECT * FROM user_statement_count_hourly LIMIT 1;

-- Check correlation_id column
SELECT correlation_id FROM statement_imports LIMIT 1;
```

## Risk Assessment

- ✅ **Low Risk**: All migrations use `IF NOT EXISTS` patterns
- ✅ **Idempotent**: Safe to run multiple times
- ✅ **No Data Loss**: All changes are additive
- ⚠️ **Note**: Some migrations may have already been partially applied

## Estimated Time

- Migration execution: 5-10 minutes
- Verification: 5 minutes
- **Total**: ~10-15 minutes

## Success Criteria

- [ ] `ocr_results` table exists and is accessible
- [ ] All indexes created successfully
- [ ] View created successfully
- [ ] `correlation_id` column exists
- [ ] No errors in migration logs
- [ ] Statement processing works end-to-end

## Next Steps

1. **Apply migrations** using one of the methods above
2. **Verify** all objects created successfully
3. **Test** statement upload/processing functionality
4. **Monitor** Edge Function logs for any issues

## Documentation

- Full analysis: `docs/MIGRATION_ANALYSIS_DEV_TO_PROD.md`
- Migration files: `supabase/migrations/`

