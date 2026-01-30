-- Script to trace how a transaction was created
-- Usage: Run this query in Supabase SQL editor to find transaction processing details
-- Replace 'PAYMENT THANKYOU 443794' with the actual description

-- Step 1: Find the transaction and its statement import
SELECT 
  t.id as transaction_id,
  t.date,
  t.description,
  t.amount,
  t.type,
  t.transaction_reference,
  t.statement_import_id,
  t.created_at as transaction_created_at,
  si.id as statement_import_id,
  si.file_name,
  si.status,
  si.parsing_method,
  si.metadata,
  si.correlation_id,
  si.created_at as import_created_at,
  -- Show if amount matches expected sign for type
  CASE 
    WHEN t.type = 'income' AND t.amount < 0 THEN '❌ ERROR: Income should be positive'
    WHEN t.type = 'expense' AND t.amount > 0 THEN '❌ ERROR: Expense should be negative'
    ELSE '✅ OK'
  END as amount_validation
FROM transactions t
LEFT JOIN statement_imports si ON t.statement_import_id = si.id
WHERE t.description ILIKE '%PAYMENT THANKYOU%'
  AND ABS(t.amount) = 5779
ORDER BY t.created_at DESC
LIMIT 10;

-- Step 2: Get detailed metadata from the statement import
-- Replace <statement_import_id> with the actual UUID from Step 1
/*
SELECT 
  id,
  file_name,
  status,
  parsing_method,
  correlation_id,
  metadata->'extraction_method' as extraction_method,
  metadata->'account_number' as account_number,
  metadata->'bank_name' as bank_name,
  metadata->'statement_period' as statement_period,
  created_at,
  updated_at,
  completed_at
FROM statement_imports
WHERE id = '<statement_import_id>';
*/

-- Step 3: Check server logs for this correlation_id
-- The correlation_id from Step 1 can be used to search server logs for:
-- - STATEMENT:AMOUNT_NORMALIZATION logs (shows original OCR data and normalization decisions)
-- - STATEMENT:DB_INSERT_PREP logs (shows final amounts before insertion)
-- - STATEMENT:DB_INSERT_VERIFY logs (shows what was actually inserted)
--
-- The normalization log will show:
--   - originalAmount: What OCR extracted
--   - ocrTransactionType: What OCR classified it as (credit/debit/payment/etc)
--   - normalizedType: What we classified it as (income/expense)
--   - normalizedAmount: The final amount stored
--   - reasoning: Why it was classified that way

-- Step 4: To fix an existing transaction, update it directly:
/*
UPDATE transactions
SET 
  amount = ABS(amount),  -- Make positive
  type = 'income'         -- Change to income
WHERE id = '<transaction_id>'
  AND type = 'expense'    -- Only update if currently expense
  AND amount < 0;         -- Only update if currently negative
*/

