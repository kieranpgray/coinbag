-- ============================================================================
-- MIGRATION: Make next_payment_date nullable
-- ============================================================================
-- Execute this SQL in your Supabase SQL Editor to fix the NOT NULL constraint error
-- 
-- How to run:
-- 1. Go to your Supabase Dashboard
-- 2. Navigate to SQL Editor
-- 3. Paste this entire script
-- 4. Click "Run" or press Cmd/Ctrl + Enter
-- ============================================================================

-- Make next_payment_date column nullable
ALTER TABLE income ALTER COLUMN next_payment_date DROP NOT NULL;

-- Add/update column comment
COMMENT ON COLUMN income.next_payment_date IS 'Next payment date (optional - NULL means no specific payment date set)';

-- Verification query (run separately to confirm)
-- SELECT column_name, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'income' AND column_name = 'next_payment_date';
-- Expected result: is_nullable should be 'YES'

-- ============================================================================
-- ROLLBACK (if needed):
-- ALTER TABLE income ALTER COLUMN next_payment_date SET NOT NULL;
-- ============================================================================




