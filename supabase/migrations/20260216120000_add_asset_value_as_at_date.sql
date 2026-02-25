-- Migration: Add value_as_at_date to asset_value_history
-- Description: Stores the "as at" date for each value change; displayed in change history.
-- Prerequisites: asset_value_history table and log_asset_value_change trigger exist.
-- Plan: specs/asset-fields-update

-- Add column (nullable for existing rows; new rows get default)
ALTER TABLE asset_value_history
  ADD COLUMN IF NOT EXISTS value_as_at_date date;

COMMENT ON COLUMN asset_value_history.value_as_at_date IS 'Date the value is recorded as at (default: date of creation)';

-- Default for new inserts: use current date (trigger cannot receive as_at from app; app will write history with value_as_at_date when needed via repo)
-- For trigger-inserted rows we use CURRENT_DATE
CREATE OR REPLACE FUNCTION log_asset_value_change()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'UPDATE' AND OLD.value IS DISTINCT FROM NEW.value) THEN
    INSERT INTO asset_value_history (
      asset_id,
      previous_value,
      new_value,
      user_id,
      value_as_at_date
    ) VALUES (
      NEW.id,
      OLD.value,
      NEW.value,
      NEW.user_id,
      CURRENT_DATE
    );
  ELSIF (TG_OP = 'INSERT') THEN
    INSERT INTO asset_value_history (
      asset_id,
      previous_value,
      new_value,
      user_id,
      value_as_at_date
    ) VALUES (
      NEW.id,
      NULL,
      NEW.value,
      NEW.user_id,
      CURRENT_DATE
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
