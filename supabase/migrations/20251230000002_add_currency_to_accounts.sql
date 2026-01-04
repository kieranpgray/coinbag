-- Migration: Add currency field to accounts table
-- Description: Adds currency support for accounts (defaults to AUD)
-- Rollback: ALTER TABLE accounts DROP COLUMN currency;

-- Add currency column with default value
-- Using a simpler approach: add column first, then add constraint separately if needed
ALTER TABLE accounts 
ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'AUD';

-- Add a simple constraint for common currencies (can be extended later)
-- Note: PostgreSQL CHECK constraints have length limits, so we'll validate in application code
-- For now, just ensure it's a 3-character code
ALTER TABLE accounts 
DROP CONSTRAINT IF EXISTS accounts_currency_check;

ALTER TABLE accounts 
ADD CONSTRAINT accounts_currency_check 
CHECK (char_length(currency) = 3 OR currency = 'Other');

-- Add column comment
COMMENT ON COLUMN accounts.currency IS 'Currency code (ISO 4217) - defaults to AUD';

-- Create index for currency filtering
CREATE INDEX IF NOT EXISTS idx_accounts_currency ON accounts(currency);

