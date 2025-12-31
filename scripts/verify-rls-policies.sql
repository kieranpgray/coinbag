-- RLS Policy Verification Script
-- Run this in Supabase SQL Editor to verify RLS is properly configured
-- This script checks:
-- 1. RLS is enabled on all tables
-- 2. Policies exist for all tables (SELECT, INSERT, UPDATE, DELETE)
-- 3. Policies use correct syntax (auth.jwt() ->> 'sub', not auth.uid())

-- Step 1: Check RLS is enabled on all tables
SELECT 
  tablename, 
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN (
    'assets', 
    'liabilities', 
    'accounts', 
    'income', 
    'subscriptions', 
    'goals', 
    'categories', 
    'user_preferences'
  )
ORDER BY tablename;

-- Expected: All tables should show rls_enabled = true

-- Step 2: Count policies per table
SELECT 
  tablename, 
  COUNT(*) as policy_count,
  COUNT(CASE WHEN cmd = 'SELECT' THEN 1 END) as select_policies,
  COUNT(CASE WHEN cmd = 'INSERT' THEN 1 END) as insert_policies,
  COUNT(CASE WHEN cmd = 'UPDATE' THEN 1 END) as update_policies,
  COUNT(CASE WHEN cmd = 'DELETE' THEN 1 END) as delete_policies
FROM pg_policies 
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;

-- Expected: Each table should have 4 policies (SELECT, INSERT, UPDATE, DELETE)

-- Step 3: Verify policies use correct syntax (auth.jwt() ->> 'sub')
-- This checks that policies use Clerk JWT syntax, not Supabase auth.uid()
SELECT 
  tablename,
  policyname,
  cmd,
  CASE 
    WHEN pg_get_expr(polqual, polrelid) LIKE '%auth.jwt()%' THEN '✅ Correct (auth.jwt())'
    WHEN pg_get_expr(polqual, polrelid) LIKE '%auth.uid()%' THEN '❌ Wrong (auth.uid())'
    ELSE '⚠️ Unknown syntax'
  END as syntax_check
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, cmd;

-- Expected: All policies should show "✅ Correct (auth.jwt())"

-- Step 4: Detailed policy expressions (for debugging)
-- Uncomment to see full policy expressions:
/*
SELECT 
  tablename,
  policyname,
  cmd,
  pg_get_expr(polqual, polrelid) as using_expression,
  pg_get_expr(polwithcheck, polrelid) as with_check_expression
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, cmd;
*/

-- Step 5: Summary report
DO $$
DECLARE
  table_count integer;
  policy_count integer;
  rls_disabled_count integer;
BEGIN
  -- Count tables
  SELECT COUNT(*) INTO table_count
  FROM pg_tables 
  WHERE schemaname = 'public' 
    AND tablename IN ('assets', 'liabilities', 'accounts', 'income', 'subscriptions', 'goals', 'categories', 'user_preferences');
  
  -- Count policies
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies 
  WHERE schemaname = 'public';
  
  -- Count tables with RLS disabled
  SELECT COUNT(*) INTO rls_disabled_count
  FROM pg_tables 
  WHERE schemaname = 'public' 
    AND tablename IN ('assets', 'liabilities', 'accounts', 'income', 'subscriptions', 'goals', 'categories', 'user_preferences')
    AND rowsecurity = false;
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'RLS Verification Summary';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Tables checked: %', table_count;
  RAISE NOTICE 'Total policies: %', policy_count;
  RAISE NOTICE 'Expected policies: % (8 tables × 4 operations)', table_count * 4;
  RAISE NOTICE 'Tables with RLS disabled: %', rls_disabled_count;
  
  IF rls_disabled_count > 0 THEN
    RAISE WARNING '⚠️  Some tables have RLS disabled!';
  ELSE
    RAISE NOTICE '✅ All tables have RLS enabled';
  END IF;
  
  IF policy_count < (table_count * 4) THEN
    RAISE WARNING '⚠️  Missing policies! Expected %, found %', table_count * 4, policy_count;
  ELSE
    RAISE NOTICE '✅ Policy count matches expected';
  END IF;
  
  RAISE NOTICE '========================================';
END $$;

