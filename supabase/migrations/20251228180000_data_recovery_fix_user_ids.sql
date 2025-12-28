-- Migration: Data Recovery - Fix user_id values
-- Description: Fixes user_id values for data that may have been inserted without proper JWT validation
-- WARNING: Only run this if you have data with NULL or incorrect user_id values
-- Prerequisites: Supabase JWT validation must be configured before running this
-- 
-- This migration helps recover data that was inserted before JWT validation was configured.
-- It cannot automatically determine the correct user_id, so manual intervention may be required.

-- Step 1: Check for NULL user_id values
DO $$
DECLARE
  null_count integer;
BEGIN
  -- Check assets
  SELECT COUNT(*) INTO null_count FROM assets WHERE user_id IS NULL;
  IF null_count > 0 THEN
    RAISE NOTICE 'Found % assets with NULL user_id', null_count;
  END IF;
  
  -- Check liabilities
  SELECT COUNT(*) INTO null_count FROM liabilities WHERE user_id IS NULL;
  IF null_count > 0 THEN
    RAISE NOTICE 'Found % liabilities with NULL user_id', null_count;
  END IF;
  
  -- Check accounts
  SELECT COUNT(*) INTO null_count FROM accounts WHERE user_id IS NULL;
  IF null_count > 0 THEN
    RAISE NOTICE 'Found % accounts with NULL user_id', null_count;
  END IF;
  
  -- Check income
  SELECT COUNT(*) INTO null_count FROM income WHERE user_id IS NULL;
  IF null_count > 0 THEN
    RAISE NOTICE 'Found % income records with NULL user_id', null_count;
  END IF;
  
  -- Check subscriptions
  SELECT COUNT(*) INTO null_count FROM subscriptions WHERE user_id IS NULL;
  IF null_count > 0 THEN
    RAISE NOTICE 'Found % subscriptions with NULL user_id', null_count;
  END IF;
  
  -- Check goals
  SELECT COUNT(*) INTO null_count FROM goals WHERE user_id IS NULL;
  IF null_count > 0 THEN
    RAISE NOTICE 'Found % goals with NULL user_id', null_count;
  END IF;
END $$;

-- Step 2: Create helper function to check data state
CREATE OR REPLACE FUNCTION check_data_recovery_status()
RETURNS TABLE (
  table_name text,
  total_records bigint,
  null_user_id_count bigint,
  unique_user_ids bigint,
  sample_user_ids text[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    'assets'::text,
    COUNT(*)::bigint,
    COUNT(*) FILTER (WHERE user_id IS NULL)::bigint,
    COUNT(DISTINCT user_id)::bigint,
    ARRAY_AGG(DISTINCT user_id) FILTER (WHERE user_id IS NOT NULL)::text[]
  FROM assets
  UNION ALL
  SELECT 
    'liabilities'::text,
    COUNT(*)::bigint,
    COUNT(*) FILTER (WHERE user_id IS NULL)::bigint,
    COUNT(DISTINCT user_id)::bigint,
    ARRAY_AGG(DISTINCT user_id) FILTER (WHERE user_id IS NOT NULL)::text[]
  FROM liabilities
  UNION ALL
  SELECT 
    'accounts'::text,
    COUNT(*)::bigint,
    COUNT(*) FILTER (WHERE user_id IS NULL)::bigint,
    COUNT(DISTINCT user_id)::bigint,
    ARRAY_AGG(DISTINCT user_id) FILTER (WHERE user_id IS NOT NULL)::text[]
  FROM accounts
  UNION ALL
  SELECT 
    'income'::text,
    COUNT(*)::bigint,
    COUNT(*) FILTER (WHERE user_id IS NULL)::bigint,
    COUNT(DISTINCT user_id)::bigint,
    ARRAY_AGG(DISTINCT user_id) FILTER (WHERE user_id IS NOT NULL)::text[]
  FROM income
  UNION ALL
  SELECT 
    'subscriptions'::text,
    COUNT(*)::bigint,
    COUNT(*) FILTER (WHERE user_id IS NULL)::bigint,
    COUNT(DISTINCT user_id)::bigint,
    ARRAY_AGG(DISTINCT user_id) FILTER (WHERE user_id IS NOT NULL)::text[]
  FROM subscriptions
  UNION ALL
  SELECT 
    'goals'::text,
    COUNT(*)::bigint,
    COUNT(*) FILTER (WHERE user_id IS NULL)::bigint,
    COUNT(DISTINCT user_id)::bigint,
    ARRAY_AGG(DISTINCT user_id) FILTER (WHERE user_id IS NOT NULL)::text[]
  FROM goals;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment
COMMENT ON FUNCTION check_data_recovery_status() IS 'Check data recovery status - shows NULL user_id counts and sample user_ids for each table. Use this to diagnose data recovery needs.';

-- Grant execute
GRANT EXECUTE ON FUNCTION check_data_recovery_status() TO authenticated;
GRANT EXECUTE ON FUNCTION check_data_recovery_status() TO anon;

-- Step 3: Manual recovery instructions
-- 
-- If you have data with NULL user_id values, you have two options:
--
-- OPTION A: Delete NULL user_id data (if it's test data)
--   DELETE FROM assets WHERE user_id IS NULL;
--   DELETE FROM liabilities WHERE user_id IS NULL;
--   DELETE FROM accounts WHERE user_id IS NULL;
--   DELETE FROM income WHERE user_id IS NULL;
--   DELETE FROM subscriptions WHERE user_id IS NULL;
--   DELETE FROM goals WHERE user_id IS NULL;
--
-- OPTION B: Manually assign user_id (if you know which user owns the data)
--   UPDATE assets SET user_id = 'user_xxxxxxxxxxxxx' WHERE user_id IS NULL AND <condition>;
--   (Repeat for other tables)
--
-- IMPORTANT: After fixing user_id values, ensure Supabase JWT validation is configured
-- so new data is inserted with correct user_id values automatically.

