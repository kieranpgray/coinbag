-- Migration: Add pay cycle configuration to user_preferences table
-- Description: Adds pay_cycle (JSONB) and transfer_view_mode columns for transfers feature
-- Safe to run multiple times (IF NOT EXISTS)

-- Step 1: Add pay_cycle column (JSONB)
ALTER TABLE user_preferences 
ADD COLUMN IF NOT EXISTS pay_cycle jsonb DEFAULT NULL;

-- Step 2: Add transfer_view_mode column
ALTER TABLE user_preferences 
ADD COLUMN IF NOT EXISTS transfer_view_mode text 
CHECK (transfer_view_mode IN ('weekly', 'fortnightly', 'monthly')) 
DEFAULT 'monthly';

-- Step 3: Add comments
COMMENT ON COLUMN user_preferences.pay_cycle IS 'Pay cycle configuration for transfer calculations (frequency, nextPayDate, primaryIncomeAccountId, savingsAccountId)';
COMMENT ON COLUMN user_preferences.transfer_view_mode IS 'User preference for viewing transfer amounts (weekly/fortnightly/monthly)';

-- Note: No RLS policy changes needed - existing policies cover all columns
-- Note: Rollback strategy:
--   ALTER TABLE user_preferences DROP COLUMN IF EXISTS pay_cycle;
--   ALTER TABLE user_preferences DROP COLUMN IF EXISTS transfer_view_mode;
