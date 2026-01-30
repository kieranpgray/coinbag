-- Migration Script: Fix Misclassified Credit Transactions
-- Description: Corrects existing transactions that were misclassified as expenses but should be income
-- This fixes transactions where credits were extracted with negative amounts and incorrectly stored as expenses
-- 
-- SAFETY: This script includes WHERE clauses to only update transactions that:
-- 1. Are from statement imports (not manually created)
-- 2. Have expense type with negative amounts
-- 3. Have descriptions suggesting they are credits (deposits, payments, etc.)
--
-- Usage: Review the SELECT query first to see what will be updated, then uncomment the UPDATE

-- Step 1: Preview transactions that will be fixed
SELECT 
  t.id,
  t.date,
  t.description,
  t.amount as current_amount,
  t.type as current_type,
  ABS(t.amount) as corrected_amount,
  'income' as corrected_type,
  si.file_name,
  si.created_at as import_created_at,
  CASE 
    WHEN t.description ILIKE '%DEPOSIT%' THEN 'Deposit'
    WHEN t.description ILIKE '%CREDIT%' THEN 'Credit'
    WHEN t.description ILIKE '%PAYMENT THANK%' THEN 'Payment Received'
    WHEN t.description ILIKE '%TRANSFER IN%' THEN 'Transfer In'
    WHEN t.description ILIKE '%INTEREST%' THEN 'Interest'
    ELSE 'Other Credit'
  END as credit_indicator
FROM transactions t
JOIN statement_imports si ON t.statement_import_id = si.id
WHERE t.statement_import_id IS NOT NULL
  AND t.type = 'expense'
  AND t.amount < 0
  AND (
    t.description ILIKE '%DEPOSIT%'
    OR t.description ILIKE '%CREDIT%'
    OR t.description ILIKE '%PAYMENT THANK%'
    OR t.description ILIKE '%PAYMENT RECEIVED%'
    OR t.description ILIKE '%TRANSFER IN%'
    OR t.description ILIKE '%INTEREST%'
    OR t.description ILIKE '%REFUND%'
    OR t.description ILIKE '%REVERSAL%'
  )
ORDER BY t.created_at DESC;

-- Step 2: Count how many transactions will be affected
SELECT 
  COUNT(*) as transactions_to_fix,
  COUNT(DISTINCT t.account_id) as affected_accounts,
  COUNT(DISTINCT t.statement_import_id) as affected_imports,
  SUM(ABS(t.amount)) as total_amount_to_correct
FROM transactions t
WHERE t.statement_import_id IS NOT NULL
  AND t.type = 'expense'
  AND t.amount < 0
  AND (
    t.description ILIKE '%DEPOSIT%'
    OR t.description ILIKE '%CREDIT%'
    OR t.description ILIKE '%PAYMENT THANK%'
    OR t.description ILIKE '%PAYMENT RECEIVED%'
    OR t.description ILIKE '%TRANSFER IN%'
    OR t.description ILIKE '%INTEREST%'
    OR t.description ILIKE '%REFUND%'
    OR t.description ILIKE '%REVERSAL%'
  );

-- Step 3: UPDATE transactions (UNCOMMENT TO RUN)
-- WARNING: Review the SELECT queries above before running this UPDATE
/*
UPDATE transactions
SET 
  type = 'income',
  amount = ABS(amount),
  updated_at = NOW()
WHERE statement_import_id IS NOT NULL
  AND type = 'expense'
  AND amount < 0
  AND (
    description ILIKE '%DEPOSIT%'
    OR description ILIKE '%CREDIT%'
    OR description ILIKE '%PAYMENT THANK%'
    OR description ILIKE '%PAYMENT RECEIVED%'
    OR description ILIKE '%TRANSFER IN%'
    OR description ILIKE '%INTEREST%'
    OR description ILIKE '%REFUND%'
    OR description ILIKE '%REVERSAL%'
  );
*/

-- Step 4: Verify the fix (run after UPDATE)
/*
SELECT 
  COUNT(*) as fixed_transactions,
  COUNT(*) FILTER (WHERE type = 'income' AND amount > 0) as correctly_classified,
  COUNT(*) FILTER (WHERE type = 'expense' AND amount < 0) as correctly_classified_expenses
FROM transactions
WHERE statement_import_id IS NOT NULL
  AND (
    description ILIKE '%DEPOSIT%'
    OR description ILIKE '%CREDIT%'
    OR description ILIKE '%PAYMENT THANK%'
  );
*/

-- Step 5: Update account balances if needed
-- After fixing transactions, you may want to recalculate account balances
-- This is optional and depends on whether balances were calculated from transactions
/*
-- Example: Recalculate balance for a specific account
-- (Adjust based on your balance calculation logic)
SELECT 
  account_id,
  SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as total_income,
  SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as total_expenses,
  SUM(amount) as net_balance
FROM transactions
WHERE account_id = '<account_id>'
GROUP BY account_id;
*/

