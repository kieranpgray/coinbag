-- Check for triggers and functions on accounts table that might reference account_id
-- This helps diagnose the "column account_id does not exist" error

-- 1. List all triggers on accounts table
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement,
  action_timing
FROM information_schema.triggers
WHERE event_object_table = 'accounts'
ORDER BY trigger_name;

-- 2. Show trigger function definitions
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

-- 3. Check RLS policies on accounts table
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
WHERE tablename = 'accounts';

-- 4. Check if sync_goal_from_account function references account_id incorrectly
SELECT 
  p.proname as function_name,
  pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname = 'sync_goal_from_account';

-- 5. Check accounts table columns
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'accounts'
ORDER BY ordinal_position;

