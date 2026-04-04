-- Migration: Add linked_repayment_account_id to expenses table
-- Description: Adds an optional destination account reference for repayment expenses
-- Rollback: ALTER TABLE expenses DROP COLUMN IF EXISTS linked_repayment_account_id;

ALTER TABLE expenses
ADD COLUMN IF NOT EXISTS linked_repayment_account_id uuid REFERENCES accounts(id) ON DELETE SET NULL;

COMMENT ON COLUMN expenses.linked_repayment_account_id IS
  'Optional destination account for repayment expenses (e.g., credit card/loan account being repaid)';

CREATE INDEX IF NOT EXISTS idx_expenses_linked_repayment_account_id
  ON expenses(linked_repayment_account_id);

