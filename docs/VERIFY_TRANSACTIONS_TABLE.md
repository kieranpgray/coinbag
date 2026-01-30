# Verify Transactions Table Setup

## ✅ Table Created Successfully

The `transactions` table has been created. Verify the complete setup:

## Verification Queries

Run these in Supabase Dashboard → SQL Editor to verify everything is set up correctly:

### 1. Verify Table Structure

```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'transactions'
ORDER BY ordinal_position;
```

**Expected**: Should show all columns (id, user_id, account_id, date, description, amount, type, category, transaction_reference, statement_import_id, created_at, updated_at)

### 2. Verify RLS is Enabled

```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'transactions';
```

**Expected**: `rowsecurity` should be `true`

### 3. Verify RLS Policies Exist

```sql
SELECT policyname, cmd 
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'transactions'
ORDER BY cmd;
```

**Expected**: Should show 4 policies:
- SELECT: "Users can view their own transactions"
- INSERT: "Users can create their own transactions"
- UPDATE: "Users can update their own transactions"
- DELETE: "Users can delete their own transactions"

### 4. Verify Indexes Exist

```sql
SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public' 
AND tablename = 'transactions'
ORDER BY indexname;
```

**Expected**: Should show multiple indexes including:
- `idx_transactions_user_id`
- `idx_transactions_account_id`
- `idx_transactions_date`
- `idx_transactions_dedupe` (unique index)

## Next Steps

1. **Wait 1-2 minutes** for PostgREST's schema cache to refresh automatically
2. **Try uploading a statement** - the Edge Function should now work
3. **Check Edge Function logs** if there are any issues

## Troubleshooting

If you still get schema cache errors after 2 minutes:

1. The retry logic in the Edge Function will automatically retry (up to 3 times)
2. PostgREST cache usually refreshes within 1-2 minutes
3. If issues persist, check Edge Function logs for detailed error messages

