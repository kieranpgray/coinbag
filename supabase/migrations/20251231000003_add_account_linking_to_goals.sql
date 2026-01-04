-- Migration: Add account linking to goals and remove goal type
-- Description: Adds account_id column for linking goals to accounts, removes type column, and adds bidirectional sync triggers
-- Rollback: See rollback instructions at end of file

-- Step 1: Add account_id column with foreign key constraint
ALTER TABLE goals 
ADD COLUMN IF NOT EXISTS account_id uuid;

-- Add foreign key constraint with ON DELETE SET NULL (auto-unlink on account deletion)
ALTER TABLE goals 
DROP CONSTRAINT IF EXISTS goals_account_id_fkey;

ALTER TABLE goals 
ADD CONSTRAINT goals_account_id_fkey 
FOREIGN KEY (account_id) 
REFERENCES accounts(id) 
ON DELETE SET NULL;

-- Add index on account_id for performance
CREATE INDEX IF NOT EXISTS idx_goals_account_id ON goals(account_id);

-- Add column comment
COMMENT ON COLUMN goals.account_id IS 'Linked account ID - when set, goal syncs bidirectionally with account balance';

-- Step 2: Remove type column and its constraint
-- First drop the CHECK constraint
ALTER TABLE goals 
DROP CONSTRAINT IF EXISTS goals_type_check;

-- Drop the index on type if it exists
DROP INDEX IF EXISTS idx_goals_type;

-- Remove the type column
ALTER TABLE goals 
DROP COLUMN IF EXISTS type;

-- Step 3: Create trigger function to sync goal from account (Account → Goal)
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

-- Create trigger on accounts table
DROP TRIGGER IF EXISTS trigger_sync_goal_from_account ON accounts;
CREATE TRIGGER trigger_sync_goal_from_account
  AFTER UPDATE OF balance, balance_owed ON accounts
  FOR EACH ROW
  EXECUTE FUNCTION sync_goal_from_account();

-- Step 4: Create trigger function to sync account from goal (Goal → Account)
CREATE OR REPLACE FUNCTION sync_account_from_goal()
RETURNS TRIGGER AS $$
DECLARE
  linked_account accounts%ROWTYPE;
BEGIN
  -- Only sync if account_id is set
  IF NEW.account_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Only update if the value actually changed to prevent infinite loops
  IF (TG_OP = 'UPDATE' AND OLD.current_amount IS DISTINCT FROM NEW.current_amount) THEN
    -- Get the linked account
    SELECT * INTO linked_account
    FROM accounts
    WHERE id = NEW.account_id
    AND user_id = NEW.user_id; -- Ensure same user for security
    
    -- If account exists and belongs to same user, update it
    IF FOUND THEN
      -- For credit cards and loans, update balance_owed if available, otherwise balance
      -- For other accounts, update balance
      IF linked_account.account_type IN ('Credit Card', 'Loan') AND linked_account.balance_owed IS NOT NULL THEN
        UPDATE accounts
        SET balance_owed = NEW.current_amount,
            updated_at = now()
        WHERE id = NEW.account_id
        AND user_id = NEW.user_id;
      ELSE
        UPDATE accounts
        SET balance = NEW.current_amount,
            updated_at = now()
        WHERE id = NEW.account_id
        AND user_id = NEW.user_id;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on goals table
DROP TRIGGER IF EXISTS trigger_sync_account_from_goal ON goals;
CREATE TRIGGER trigger_sync_account_from_goal
  AFTER UPDATE OF current_amount ON goals
  FOR EACH ROW
  EXECUTE FUNCTION sync_account_from_goal();

-- Add comment
COMMENT ON FUNCTION sync_goal_from_account() IS 'Syncs goal current_amount from linked account balance when account updates';
COMMENT ON FUNCTION sync_account_from_goal() IS 'Syncs linked account balance from goal current_amount when goal updates';

-- Rollback instructions:
-- 1. DROP TRIGGER trigger_sync_account_from_goal ON goals;
-- 2. DROP TRIGGER trigger_sync_goal_from_account ON accounts;
-- 3. DROP FUNCTION sync_account_from_goal();
-- 4. DROP FUNCTION sync_goal_from_account();
-- 5. ALTER TABLE goals DROP COLUMN account_id;
-- 6. DROP INDEX idx_goals_account_id;
-- 7. ALTER TABLE goals ADD COLUMN type text NOT NULL DEFAULT 'Grow' CHECK (type IN ('Grow', 'Save', 'Pay Off', 'Invest'));
-- 8. CREATE INDEX idx_goals_type ON goals(type);

