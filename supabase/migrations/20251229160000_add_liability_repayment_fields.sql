-- Migration: Add repayment fields to liabilities table
-- Description: Adds repayment_amount and repayment_frequency columns to support auto-creating subscriptions from liability repayments
-- Prerequisites: Requires existing liabilities table
-- Rollback: Remove columns and constraints

-- Add repayment_amount column
ALTER TABLE liabilities
  ADD COLUMN IF NOT EXISTS repayment_amount numeric(10,2) CHECK (repayment_amount >= 0);

-- Add repayment_frequency column
ALTER TABLE liabilities
  ADD COLUMN IF NOT EXISTS repayment_frequency text CHECK (repayment_frequency IN ('weekly', 'fortnightly', 'monthly', 'yearly'));

-- Add column comments
COMMENT ON COLUMN liabilities.repayment_amount IS 'Repayment amount in dollars (used to auto-create subscription)';
COMMENT ON COLUMN liabilities.repayment_frequency IS 'Repayment frequency: weekly, fortnightly, monthly, yearly (used to auto-create subscription)';

