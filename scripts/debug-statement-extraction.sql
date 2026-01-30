-- Debugging Script for Statement Extraction Issues
-- Use this script to trace data flow from OCR extraction through database storage to UI rendering
-- Run queries in Supabase SQL Editor

-- ============================================================================
-- 1. Find Recent Statement Imports with Correlation IDs
-- ============================================================================

SELECT 
  id as statement_import_id,
  correlation_id,
  file_name,
  account_id,
  status,
  created_at,
  completed_at,
  imported_transactions,
  failed_transactions,
  metadata->>'extracted_balance' as extracted_balance,
  metadata->>'extracted_balance_source' as balance_source,
  metadata->>'balance_updated' as balance_updated,
  metadata->>'statement_period' as statement_period
FROM statement_imports
WHERE created_at > NOW() - INTERVAL '7 days'
ORDER BY created_at DESC
LIMIT 10;

-- ============================================================================
-- 2. Query Transactions from Specific Statement Import
-- ============================================================================

-- Replace '<statement_import_id>' with actual ID from query above
SELECT 
  t.id,
  t.date,
  t.description,
  t.amount,
  t.type,
  t.statement_import_id,
  t.transaction_reference,
  t.created_at,
  -- Validation: Check if amount sign matches type
  CASE 
    WHEN t.type = 'income' AND t.amount > 0 THEN '✅ CORRECT'
    WHEN t.type = 'expense' AND t.amount < 0 THEN '✅ CORRECT'
    WHEN t.type = 'income' AND t.amount < 0 THEN '❌ ERROR: Income should be positive'
    WHEN t.type = 'expense' AND t.amount > 0 THEN '❌ ERROR: Expense should be negative'
    ELSE '⚠️ UNKNOWN'
  END as amount_validation,
  -- Check if description suggests credit but type is expense
  CASE 
    WHEN t.type = 'expense' 
         AND (t.description ILIKE '%DEPOSIT%' 
              OR t.description ILIKE '%CREDIT%' 
              OR t.description ILIKE '%PAYMENT THANK%'
              OR t.description ILIKE '%TRANSFER IN%')
    THEN '⚠️ WARNING: Possible misclassified credit'
    ELSE 'OK'
  END as classification_warning
FROM transactions t
WHERE t.statement_import_id = '<statement_import_id>'  -- Replace with actual ID
ORDER BY t.created_at DESC;

-- ============================================================================
-- 3. Summary Statistics for Statement Import
-- ============================================================================

SELECT 
  si.id as statement_import_id,
  si.file_name,
  si.correlation_id,
  COUNT(t.id) as total_transactions,
  COUNT(*) FILTER (WHERE t.type = 'income') as income_count,
  COUNT(*) FILTER (WHERE t.type = 'expense') as expense_count,
  COUNT(*) FILTER (WHERE t.amount > 0) as positive_amount_count,
  COUNT(*) FILTER (WHERE t.amount < 0) as negative_amount_count,
  -- Count validation issues
  COUNT(*) FILTER (WHERE t.type = 'income' AND t.amount < 0) as income_with_negative_amount,
  COUNT(*) FILTER (WHERE t.type = 'expense' AND t.amount > 0) as expense_with_positive_amount,
  -- Count possible misclassifications
  COUNT(*) FILTER (WHERE t.type = 'expense' 
                   AND (t.description ILIKE '%DEPOSIT%' 
                        OR t.description ILIKE '%CREDIT%' 
                        OR t.description ILIKE '%PAYMENT THANK%')) as possible_misclassified_credits
FROM statement_imports si
LEFT JOIN transactions t ON t.statement_import_id = si.id
WHERE si.created_at > NOW() - INTERVAL '7 days'
GROUP BY si.id, si.file_name, si.correlation_id
ORDER BY si.created_at DESC
LIMIT 10;

-- ============================================================================
-- 4. Account Balance Status
-- ============================================================================

SELECT 
  a.id as account_id,
  a.account_name,
  a.account_type,
  a.balance,
  a.balance_owed,
  a.last_updated,
  -- Find most recent statement import for this account
  (SELECT MAX(si.created_at) 
   FROM statement_imports si 
   WHERE si.account_id = a.id 
     AND si.status = 'completed') as last_statement_import,
  -- Get extracted balance from most recent statement
  (SELECT si.metadata->>'extracted_balance'
   FROM statement_imports si 
   WHERE si.account_id = a.id 
     AND si.status = 'completed'
   ORDER BY si.created_at DESC
   LIMIT 1) as last_extracted_balance,
  -- Check if balance was updated
  (SELECT si.metadata->>'balance_updated'
   FROM statement_imports si 
   WHERE si.account_id = a.id 
     AND si.status = 'completed'
   ORDER BY si.created_at DESC
   LIMIT 1) as balance_was_updated,
  -- Compare current balance with last extracted balance
  CASE 
    WHEN (SELECT si.metadata->>'extracted_balance'
          FROM statement_imports si 
          WHERE si.account_id = a.id 
            AND si.status = 'completed'
          ORDER BY si.created_at DESC
          LIMIT 1) IS NOT NULL
         AND a.balance::text != (SELECT si.metadata->>'extracted_balance'
                                 FROM statement_imports si 
                                 WHERE si.account_id = a.id 
                                   AND si.status = 'completed'
                                 ORDER BY si.created_at DESC
                                 LIMIT 1)
    THEN '⚠️ MISMATCH: Balance not updated'
    ELSE '✅ OK'
  END as balance_status
FROM accounts a
WHERE a.last_updated > NOW() - INTERVAL '30 days'
ORDER BY a.last_updated DESC;

-- ============================================================================
-- 5. Trace Single Transaction Through Pipeline
-- ============================================================================

-- Step 1: Find a specific transaction
SELECT 
  t.id,
  t.date,
  t.description,
  t.amount,
  t.type,
  t.statement_import_id,
  si.correlation_id,
  si.file_name,
  si.created_at as import_created_at
FROM transactions t
JOIN statement_imports si ON t.statement_import_id = si.id
WHERE t.id = '<transaction_id>'  -- Replace with actual transaction ID
LIMIT 1;

-- Step 2: Check OCR cache for this statement import
SELECT 
  file_hash,
  created_at,
  jsonb_array_length(structured_data->'transactions') as transaction_count,
  -- Find the specific transaction in OCR results
  jsonb_array_elements(structured_data->'transactions') as transaction_data
FROM ocr_results
WHERE file_hash = (
  SELECT file_hash 
  FROM statement_imports 
  WHERE id = '<statement_import_id>'  -- Replace with statement_import_id from Step 1
)
AND jsonb_array_elements(structured_data->'transactions')->>'description' ILIKE '%<description_part>%'  -- Replace with part of description
LIMIT 1;

-- ============================================================================
-- 6. Compare Extracted vs Stored Balance
-- ============================================================================

SELECT 
  si.id as statement_import_id,
  si.file_name,
  si.account_id,
  si.metadata->>'extracted_balance' as extracted_balance,
  si.metadata->>'extracted_balance_source' as balance_source,
  si.metadata->>'balance_updated' as balance_updated,
  si.metadata->>'previous_balance' as previous_balance,
  a.balance as current_account_balance,
  a.last_updated as account_last_updated,
  si.created_at as statement_imported_at,
  -- Calculate difference
  CASE 
    WHEN si.metadata->>'extracted_balance' IS NOT NULL 
         AND a.balance IS NOT NULL
    THEN (a.balance::numeric - (si.metadata->>'extracted_balance')::numeric)
    ELSE NULL
  END as balance_difference,
  -- Status
  CASE 
    WHEN si.metadata->>'balance_updated' = 'true' 
         AND a.last_updated >= si.created_at 
    THEN '✅ Balance updated'
    WHEN si.metadata->>'extracted_balance' IS NOT NULL 
         AND si.metadata->>'balance_updated' != 'true'
    THEN '❌ Balance extracted but not updated'
    WHEN si.metadata->>'extracted_balance' IS NULL
    THEN '⚠️ Balance not extracted'
    ELSE 'Unknown'
  END as balance_status
FROM statement_imports si
LEFT JOIN accounts a ON si.account_id = a.id
WHERE si.status = 'completed'
  AND si.created_at > NOW() - INTERVAL '7 days'
ORDER BY si.created_at DESC
LIMIT 20;

-- ============================================================================
-- 7. Find Transactions with Amount/Type Mismatches
-- ============================================================================

SELECT 
  t.id,
  t.date,
  t.description,
  t.amount,
  t.type,
  t.statement_import_id,
  si.file_name,
  si.correlation_id,
  CASE 
    WHEN t.type = 'income' AND t.amount < 0 THEN 'Income with negative amount'
    WHEN t.type = 'expense' AND t.amount > 0 THEN 'Expense with positive amount'
    ELSE 'OK'
  END as issue_type
FROM transactions t
JOIN statement_imports si ON t.statement_import_id = si.id
WHERE (t.type = 'income' AND t.amount < 0)
   OR (t.type = 'expense' AND t.amount > 0)
  AND t.created_at > NOW() - INTERVAL '7 days'
ORDER BY t.created_at DESC;

-- ============================================================================
-- 8. Quick Health Check
-- ============================================================================

SELECT 
  'Recent Statement Imports' as check_type,
  COUNT(*) as count,
  COUNT(*) FILTER (WHERE status = 'completed') as completed,
  COUNT(*) FILTER (WHERE status = 'failed') as failed
FROM statement_imports
WHERE created_at > NOW() - INTERVAL '7 days'

UNION ALL

SELECT 
  'Transactions with Amount/Type Mismatch' as check_type,
  COUNT(*) as count,
  COUNT(*) FILTER (WHERE type = 'income' AND amount < 0) as income_negative,
  COUNT(*) FILTER (WHERE type = 'expense' AND amount > 0) as expense_positive
FROM transactions
WHERE statement_import_id IS NOT NULL
  AND created_at > NOW() - INTERVAL '7 days'

UNION ALL

SELECT 
  'Accounts with Balance Mismatch' as check_type,
  COUNT(DISTINCT a.id) as count,
  COUNT(DISTINCT a.id) FILTER (WHERE a.balance::text != si.metadata->>'extracted_balance') as mismatched,
  0 as placeholder
FROM accounts a
JOIN statement_imports si ON si.account_id = a.id
WHERE si.status = 'completed'
  AND si.created_at > NOW() - INTERVAL '7 days'
  AND si.metadata->>'extracted_balance' IS NOT NULL
  AND si.metadata->>'balance_updated' = 'true';

