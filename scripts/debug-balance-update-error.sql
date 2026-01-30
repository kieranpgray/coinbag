-- Debug script: Investigate balance update errors
-- This script helps identify why balance updates fail with "account_id does not exist" error

-- Step 1: Check accounts table structure
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'accounts'
ORDER BY ordinal_position;

-- Step 2: List all triggers on accounts table
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement,
  action_timing,
  action_condition
FROM information_schema.triggers
WHERE event_object_table = 'accounts'
ORDER BY trigger_name;

-- Step 3: Show trigger function definitions (check for account_id references)
SELECT 
  p.proname as function_name,
  pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND (
    pg_get_functiondef(p.oid) ILIKE '%account_id%'
    OR pg_get_functiondef(p.oid) ILIKE '%accounts%'
  )
ORDER BY p.proname;

-- Step 4: Check RLS policies on accounts table
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'accounts'
ORDER BY policyname;

-- Step 5: Check for any views that reference accounts.account_id
SELECT 
  table_name,
  view_definition
FROM information_schema.views
WHERE table_schema = 'public'
  AND view_definition ILIKE '%accounts%account_id%';

-- Step 6: Check for any materialized views
SELECT 
  schemaname,
  matviewname,
  definition
FROM pg_matviews
WHERE schemaname = 'public'
  AND definition ILIKE '%accounts%account_id%';

-- Step 7: Check for any indexes that might reference account_id
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'accounts'
  AND indexdef ILIKE '%account_id%';

-- Step 8: Check recent statement imports and their balance update attempts
SELECT 
  si.id,
  si.account_id,
  si.user_id,
  si.status,
  si.completed_at,
  si.correlation_id,
  a.balance,
  a.balance_owed,
  a.last_updated
FROM statement_imports si
LEFT JOIN accounts a ON a.id = si.account_id
WHERE si.status = 'completed'
  AND si.completed_at > NOW() - INTERVAL '7 days'
ORDER BY si.completed_at DESC
LIMIT 10;

-- Step 9: Check if sync_goal_from_account trigger function has issues
SELECT 
  p.proname as function_name,
  pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname = 'sync_goal_from_account';

-- Step 10: Test query to see if account_id column exists (should fail if it doesn't)
-- This is just for verification - comment out if you want to run other queries
-- SELECT account_id FROM accounts LIMIT 1;

