-- Migration: Remove available_balance column and make institution optional
-- Description: Removes available_balance column from accounts table, makes institution nullable, and updates goals sync trigger
-- Rollback: See rollback instructions at end of file

-- Step 1: Update goals sync trigger to remove available_balance reference
-- First, recreate the trigger function without available_balance
CREATE OR REPLACE FUNCTION sync_goal_from_account()
RETURNS TRIGGER AS $$
BEGIN
  -- Update linked goals when account balance or balance_owed changes
  -- Only update if the value actually changed to prevent infinite loops
  IF (TG_OP = 'UPDATE' AND (OLD.balance IS DISTINCT FROM NEW.balance OR OLD.balance_owed IS DISTINCT FROM NEW.balance_owed)) THEN
    -- For credit cards and loans, use balance_owed if available, otherwise use balance
    -- For other accounts, use balance
    UPDATE goals
    SET current_amount = CASE 
      WHEN NEW.account_type IN ('Credit Card', 'Loan') AND NEW.balance_owed IS NOT NULL 
      THEN NEW.balance_owed
      ELSE NEW.balance
    END,
    updated_at = now()
    WHERE account_id = NEW.id
    AND user_id = NEW.user_id; -- Ensure same user for security
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate trigger without available_balance
DROP TRIGGER IF EXISTS trigger_sync_goal_from_account ON accounts;
CREATE TRIGGER trigger_sync_goal_from_account
  AFTER UPDATE OF balance, balance_owed ON accounts
  FOR EACH ROW
  EXECUTE FUNCTION sync_goal_from_account();

-- Step 2: Make institution column nullable
ALTER TABLE accounts 
ALTER COLUMN institution DROP NOT NULL;

-- Step 3: Remove available_balance column
ALTER TABLE accounts 
DROP COLUMN IF EXISTS available_balance;

-- Update column comment for institution
COMMENT ON COLUMN accounts.institution IS 'Bank or financial institution name (optional)';

-- Rollback instructions:
-- 1. ALTER TABLE accounts ADD COLUMN available_balance numeric(10,2) NOT NULL DEFAULT 0;
-- 2. ALTER TABLE accounts ALTER COLUMN institution SET NOT NULL;
-- 3. DROP TRIGGER trigger_sync_goal_from_account ON accounts;
-- 4. CREATE TRIGGER trigger_sync_goal_from_account AFTER UPDATE OF balance, available_balance, balance_owed ON accounts FOR EACH ROW EXECUTE FUNCTION sync_goal_from_account();
-- 5. Recreate sync_goal_from_account() function with available_balance reference

