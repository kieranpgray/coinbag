-- Migration: Create test function to verify JWT extraction
-- Description: Creates a test RPC function to verify if auth.jwt() works correctly
-- This helps diagnose JWT validation issues

-- Create function to test JWT extraction
CREATE OR REPLACE FUNCTION test_jwt_extraction()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  jwt_payload jsonb;
  sub_claim text;
BEGIN
  -- Get the JWT payload
  jwt_payload := auth.jwt();
  
  -- Extract sub claim
  sub_claim := jwt_payload ->> 'sub';
  
  -- Return diagnostic information
  RETURN jsonb_build_object(
    'jwt_exists', jwt_payload IS NOT NULL,
    'sub_claim', sub_claim,
    'has_sub', sub_claim IS NOT NULL,
    'full_jwt', jwt_payload,
    'status', CASE
      WHEN jwt_payload IS NULL THEN 'JWT validation NOT configured - auth.jwt() returns NULL'
      WHEN sub_claim IS NULL THEN 'JWT validated but missing sub claim'
      ELSE 'JWT validation working correctly'
    END
  );
END;
$$;

-- Add comment
COMMENT ON FUNCTION test_jwt_extraction() IS 'Test function to verify if Supabase can extract Clerk JWT sub claim. Returns diagnostic information about JWT validation status.';

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION test_jwt_extraction() TO authenticated;
GRANT EXECUTE ON FUNCTION test_jwt_extraction() TO anon;

