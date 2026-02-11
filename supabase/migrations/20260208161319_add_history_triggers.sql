-- Migration: Add database triggers to automatically log asset and liability changes
-- Description: Creates triggers that automatically log value/balance changes to history tables
-- Prerequisites: Requires asset_value_history and liability_balance_history tables
-- Rollback: Drop triggers and functions

-- Create trigger function for asset value history
CREATE OR REPLACE FUNCTION log_asset_value_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only log if value actually changed
  IF (TG_OP = 'UPDATE' AND OLD.value IS DISTINCT FROM NEW.value) THEN
    INSERT INTO asset_value_history (
      asset_id,
      previous_value,
      new_value,
      user_id
    ) VALUES (
      NEW.id,
      OLD.value,
      NEW.value,
      NEW.user_id
    );
  ELSIF (TG_OP = 'INSERT') THEN
    -- Log initial value on creation
    INSERT INTO asset_value_history (
      asset_id,
      previous_value,
      new_value,
      user_id
    ) VALUES (
      NEW.id,
      NULL,
      NEW.value,
      NEW.user_id
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for assets table
DROP TRIGGER IF EXISTS trigger_log_asset_value_change ON assets;
CREATE TRIGGER trigger_log_asset_value_change
  AFTER INSERT OR UPDATE OF value ON assets
  FOR EACH ROW
  EXECUTE FUNCTION log_asset_value_change();

-- Create trigger function for liability balance history
CREATE OR REPLACE FUNCTION log_liability_balance_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only log if balance actually changed
  IF (TG_OP = 'UPDATE' AND OLD.balance IS DISTINCT FROM NEW.balance) THEN
    INSERT INTO liability_balance_history (
      liability_id,
      previous_balance,
      new_balance,
      user_id
    ) VALUES (
      NEW.id,
      OLD.balance,
      NEW.balance,
      NEW.user_id
    );
  ELSIF (TG_OP = 'INSERT') THEN
    -- Log initial balance on creation
    INSERT INTO liability_balance_history (
      liability_id,
      previous_balance,
      new_balance,
      user_id
    ) VALUES (
      NEW.id,
      NULL,
      NEW.balance,
      NEW.user_id
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for liabilities table
DROP TRIGGER IF EXISTS trigger_log_liability_balance_change ON liabilities;
CREATE TRIGGER trigger_log_liability_balance_change
  AFTER INSERT OR UPDATE OF balance ON liabilities
  FOR EACH ROW
  EXECUTE FUNCTION log_liability_balance_change();

-- Add comments
COMMENT ON FUNCTION log_asset_value_change() IS 'Automatically logs asset value changes to asset_value_history table';
COMMENT ON FUNCTION log_liability_balance_change() IS 'Automatically logs liability balance changes to liability_balance_history table';

-- Create rollback function
CREATE OR REPLACE FUNCTION rollback_history_triggers_migration()
RETURNS void AS $$
BEGIN
  -- Drop triggers
  DROP TRIGGER IF EXISTS trigger_log_asset_value_change ON assets;
  DROP TRIGGER IF EXISTS trigger_log_liability_balance_change ON liabilities;

  -- Drop functions
  DROP FUNCTION IF EXISTS log_asset_value_change();
  DROP FUNCTION IF EXISTS log_liability_balance_change();

  RAISE NOTICE 'Successfully rolled back history triggers migration';
END;
$$ language 'plpgsql';

-- Add migration metadata comment
COMMENT ON FUNCTION rollback_history_triggers_migration() IS 'Rollback function for history triggers migration - call with SELECT rollback_history_triggers_migration();';
