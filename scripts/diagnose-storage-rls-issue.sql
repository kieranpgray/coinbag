-- Diagnostic SQL to check storage RLS policy issue
-- Run this in Supabase SQL Editor while signed in to your app

-- Step 1: Check if auth.jwt() is working
SELECT 
  auth.jwt() IS NOT NULL as jwt_exists,
  auth.jwt() ->> 'sub' as user_id_from_jwt,
  CASE 
    WHEN auth.jwt() IS NULL THEN '❌ JWT NOT CONFIGURED - Clerk JWT validation missing'
    WHEN auth.jwt() ->> 'sub' IS NULL THEN '⚠️ JWT EXISTS BUT NO SUB CLAIM'
    ELSE '✅ JWT WORKING'
  END as jwt_status;

-- Step 2: Check current storage policies
SELECT 
  policyname,
  cmd,
  CASE 
    WHEN pg_get_expr(polqual, polrelid) LIKE '%storage.foldername%' THEN '❌ BROKEN (uses storage.foldername)'
    WHEN pg_get_expr(polqual, polrelid) LIKE '%split_part%' THEN '✅ FIXED (uses split_part)'
    ELSE '⚠️ UNKNOWN'
  END as policy_status,
  pg_get_expr(polqual, polrelid) as policy_expression
FROM pg_policies 
WHERE schemaname = 'storage' 
  AND tablename = 'objects'
  AND policyname LIKE '%statement%'
ORDER BY policyname, cmd;

-- Step 3: Test path extraction (simulate what the policy does)
SELECT 
  'user_37Q7p6jNwGDnBiCzIrBd7m9dXtq/84acf939-bd41-4242-9bda-dc1a5d11961f/1768658378710-anz-statement.pdf' as test_path,
  split_part('user_37Q7p6jNwGDnBiCzIrBd7m9dXtq/84acf939-bd41-4242-9bda-dc1a5d11961f/1768658378710-anz-statement.pdf', '/', 1) as extracted_user_id,
  auth.jwt() ->> 'sub' as jwt_user_id,
  CASE 
    WHEN auth.jwt() ->> 'sub' = split_part('user_37Q7p6jNwGDnBiCzIrBd7m9dXtq/84acf939-bd41-4242-9bda-dc1a5d11961f/1768658378710-anz-statement.pdf', '/', 1) 
    THEN '✅ MATCH - Policy should work'
    ELSE '❌ MISMATCH - Policy will fail'
  END as match_status;


