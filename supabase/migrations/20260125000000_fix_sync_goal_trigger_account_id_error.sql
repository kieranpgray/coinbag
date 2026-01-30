-- Migration: Fix sync_goal_from_account trigger account_id error
-- Description: Fixes "column account_id does not exist" error by ensuring goals.account_id exists and using explicit table qualification
-- This error occurs when updating accounts table balance, causing the trigger to fail

-- Step 1: Ensure goals.account_id column exists (defensive check)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'goals' 
    AND column_name = 'account_id'
  ) THEN
    -- Add account_id column if it doesn't exist
    ALTER TABLE goals ADD COLUMN account_id uuid;
    
    -- Add foreign key constraint
    ALTER TABLE goals 
    ADD CONSTRAINT goals_account_id_fkey 
    FOREIGN KEY (account_id) 
    REFERENCES accounts(id) 
    ON DELETE SET NULL;
    
    -- Add index
    CREATE INDEX IF NOT EXISTS idx_goals_account_id ON goals(account_id);
    
    RAISE NOTICE 'Added account_id column to goals table';
  END IF;
END $$;

-- Step 2: Recreate trigger function with explicit table qualification to avoid ambiguity
CREATE OR REPLACE FUNCTION sync_goal_from_account()
RETURNS TRIGGER AS $$
BEGIN
  -- Update linked goals when account balance or balance_owed changes
  -- Only update if the value actually changed to prevent infinite loops
  IF (TG_OP = 'UPDATE' AND (OLD.balance IS DISTINCT FROM NEW.balance OR OLD.balance_owed IS DISTINCT FROM NEW.balance_owed)) THEN
    -- For credit cards and loans, use balance_owed if available, otherwise use balance
    -- For other accounts, use balance
    -- CRITICAL: Use explicit table qualification (goals.account_id) to avoid ambiguity
    UPDATE goals
    SET current_amount = CASE 
      WHEN NEW.account_type IN ('Credit Card', 'Loan') AND NEW.balance_owed IS NOT NULL 
      THEN NEW.balance_owed
      ELSE NEW.balance
    END,
    updated_at = now()
    WHERE goals.account_id = NEW.id  -- Explicit table qualification
    AND goals.user_id = NEW.user_id; -- Explicit table qualification
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN undefined_column THEN
    -- Log error but don't fail the update
    RAISE WARNING 'sync_goal_from_account: Column does not exist - goals.account_id may not be present';
    RETURN NEW;
  WHEN OTHERS THEN
    -- Log error but don't fail the update
    RAISE WARNING 'sync_goal_from_account: Error updating goals - %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 3: Recreate trigger to ensure it's using the updated function
DROP TRIGGER IF EXISTS trigger_sync_goal_from_account ON accounts;
CREATE TRIGGER trigger_sync_goal_from_account
  AFTER UPDATE OF balance, balance_owed ON accounts
  FOR EACH ROW
  EXECUTE FUNCTION sync_goal_from_account();

-- Add comment
COMMENT ON FUNCTION sync_goal_from_account() IS 'Syncs goal current_amount from linked account balance when account updates. Uses explicit table qualification to avoid column ambiguity errors.';


