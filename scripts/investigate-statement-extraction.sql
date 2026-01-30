-- Investigation Scripts for Statement Extraction Root Cause Analysis
-- Run these queries in Supabase SQL Editor to investigate the issues

-- ============================================================================
-- STAGE 1: OCR Output Validation
-- ============================================================================

-- Step 1.1: Query OCR Cache Table
SELECT 
  file_hash,
  pages_count,
  LENGTH(markdown_text) as markdown_length,
  created_at,
  LEFT(markdown_text, 500) as markdown_preview
FROM ocr_results 
ORDER BY created_at DESC 
LIMIT 5;

-- Step 1.2: Search Markdown for Balance Patterns
SELECT 
  file_hash,
  CASE 
    WHEN markdown_text ILIKE '%closing balance%' THEN 'Has closing balance'
    ELSE 'Missing closing balance'
  END as closing_balance_status,
  CASE 
    WHEN markdown_text ILIKE '%opening balance%' THEN 'Has opening balance'
    ELSE 'Missing opening balance'
  END as opening_balance_status,
  CASE 
    WHEN markdown_text ILIKE '%CR%' OR markdown_text ILIKE '%(CR)%' THEN 'Has CR annotation'
    ELSE 'No CR annotation'
  END as cr_annotation_status,
  CASE 
    WHEN markdown_text ILIKE '%DR%' OR markdown_text ILIKE '%(DR)%' THEN 'Has DR annotation'
    ELSE 'No DR annotation'
  END as dr_annotation_status
FROM ocr_results 
WHERE created_at > NOW() - INTERVAL '7 days'
ORDER BY created_at DESC;

-- Step 1.3: Verify Transaction Rows in Markdown
SELECT 
  file_hash,
  (markdown_text ~ '\d{1,2}[/-]\d{1,2}[/-]\d{2,4}') as has_date_pattern,
  (markdown_text ~ '\$?\d+\.\d{2}') as has_amount_pattern,
  (markdown_text ~ '\|.*\|') as has_table_structure,
  created_at
FROM ocr_results 
WHERE created_at > NOW() - INTERVAL '7 days'
ORDER BY created_at DESC
LIMIT 5;

-- ============================================================================
-- STAGE 2: Extraction Logic Validation
-- ============================================================================

-- Step 2.3: Query Structured Data from OCR Cache
SELECT 
  file_hash,
  created_at,
  jsonb_array_length(structured_data->'transactions') as transaction_count,
  jsonb_array_elements(structured_data->'transactions') as transaction_sample
FROM ocr_results 
WHERE structured_data IS NOT NULL
  AND structured_data->'transactions' IS NOT NULL
  AND created_at > NOW() - INTERVAL '7 days'
ORDER BY created_at DESC
LIMIT 10;

-- Step 2.4: Analyze Credit Transaction Amount Signs
SELECT 
  file_hash,
  created_at,
  jsonb_array_elements(structured_data->'transactions')->>'transaction_type' as transaction_type,
  (jsonb_array_elements(structured_data->'transactions')->>'amount')::numeric as amount,
  jsonb_array_elements(structured_data->'transactions')->>'description' as description,
  CASE 
    WHEN (jsonb_array_elements(structured_data->'transactions')->>'transaction_type') = 'credit' 
         AND (jsonb_array_elements(structured_data->'transactions')->>'amount')::numeric < 0 
    THEN '❌ ERROR: Credit with negative amount'
    WHEN (jsonb_array_elements(structured_data->'transactions')->>'transaction_type') = 'debit' 
         AND (jsonb_array_elements(structured_data->'transactions')->>'amount')::numeric > 0 
    THEN '❌ ERROR: Debit with positive amount'
    ELSE '✅ OK'
  END as validation_status
FROM ocr_results
WHERE structured_data IS NOT NULL
  AND created_at > NOW() - INTERVAL '7 days'
  AND jsonb_array_elements(structured_data->'transactions')->>'transaction_type' IN ('credit', 'debit')
ORDER BY created_at DESC, amount DESC;

-- Step 2.5: Count Credit Transactions with Wrong Sign
SELECT 
  COUNT(*) FILTER (WHERE transaction_type = 'credit' AND amount < 0) as credits_with_negative_amount,
  COUNT(*) FILTER (WHERE transaction_type = 'credit' AND amount > 0) as credits_with_positive_amount,
  COUNT(*) FILTER (WHERE transaction_type = 'debit' AND amount > 0) as debits_with_positive_amount,
  COUNT(*) FILTER (WHERE transaction_type = 'debit' AND amount < 0) as debits_with_negative_amount,
  COUNT(*) as total_transactions
FROM (
  SELECT 
    jsonb_array_elements(structured_data->'transactions')->>'transaction_type' as transaction_type,
    (jsonb_array_elements(structured_data->'transactions')->>'amount')::numeric as amount
  FROM ocr_results 
  WHERE structured_data IS NOT NULL
    AND created_at > NOW() - INTERVAL '7 days'
) t
WHERE transaction_type IN ('credit', 'debit');

-- ============================================================================
-- STAGE 3: Storage/Ingestion Validation
-- ============================================================================

-- Step 3.1: Query Recent Transactions from Database
SELECT 
  t.id,
  t.date,
  t.description,
  t.amount,
  t.type,
  t.transaction_reference,
  t.statement_import_id,
  si.file_name,
  si.created_at as import_created_at,
  CASE 
    WHEN t.type = 'income' AND t.amount < 0 THEN '❌ ERROR: Income should be positive'
    WHEN t.type = 'expense' AND t.amount > 0 THEN '❌ ERROR: Expense should be negative'
    ELSE '✅ OK'
  END as amount_validation,
  CASE 
    WHEN t.type = 'expense' 
         AND (t.description ILIKE '%DEPOSIT%' 
              OR t.description ILIKE '%CREDIT%' 
              OR t.description ILIKE '%PAYMENT%'
              OR t.description ILIKE '%TRANSFER IN%')
    THEN '⚠️ WARNING: Possible misclassified credit'
    ELSE 'OK'
  END as classification_warning
FROM transactions t
LEFT JOIN statement_imports si ON t.statement_import_id = si.id
WHERE t.statement_import_id IS NOT NULL
  AND t.created_at > NOW() - INTERVAL '7 days'
ORDER BY t.created_at DESC
LIMIT 50;

-- Step 3.2: Identify Misclassified Credit Transactions
SELECT 
  t.id,
  t.date,
  t.description,
  t.amount,
  t.type,
  si.file_name,
  si.correlation_id,
  si.created_at as import_created_at
FROM transactions t
JOIN statement_imports si ON t.statement_import_id = si.id
WHERE t.type = 'expense'
  AND t.amount < 0
  AND (
    t.description ILIKE '%DEPOSIT%'
    OR t.description ILIKE '%CREDIT%'
    OR t.description ILIKE '%PAYMENT THANK%'
    OR t.description ILIKE '%TRANSFER IN%'
  )
  AND t.created_at > NOW() - INTERVAL '7 days'
ORDER BY t.created_at DESC;

-- Step 3.5: Query Account Balance Updates
SELECT 
  a.id,
  a.account_name,
  a.account_type,
  a.balance,
  a.last_updated,
  (SELECT MAX(si.created_at) 
   FROM statement_imports si 
   WHERE si.account_id = a.id 
     AND si.status = 'completed') as last_statement_import,
  CASE 
    WHEN a.last_updated > NOW() - INTERVAL '7 days' THEN 'Recently updated'
    ELSE 'Not updated recently'
  END as update_status
FROM accounts a
WHERE a.last_updated > NOW() - INTERVAL '30 days'
ORDER BY a.last_updated DESC;

-- Step 3.6: Compare Extracted Balance with Stored Balance
SELECT 
  si.id as statement_import_id,
  si.account_id,
  si.file_name,
  si.metadata->>'extracted_balance' as extracted_balance,
  si.metadata->>'extracted_balance_source' as balance_source,
  si.metadata->>'balance_updated' as balance_updated,
  a.balance as current_account_balance,
  a.last_updated as account_last_updated,
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
ORDER BY si.created_at DESC;

-- ============================================================================
-- QUICK REFERENCE QUERIES
-- ============================================================================

-- Find Misclassified Credit Transactions
SELECT t.*, si.file_name, si.correlation_id
FROM transactions t
JOIN statement_imports si ON t.statement_import_id = si.id
WHERE t.type = 'expense'
  AND t.amount < 0
  AND (t.description ILIKE '%DEPOSIT%' OR t.description ILIKE '%CREDIT%' OR t.description ILIKE '%PAYMENT THANK%')
ORDER BY t.created_at DESC;

-- Check Balance Extraction Status
SELECT 
  si.id,
  si.file_name,
  si.metadata->>'extracted_balance' as extracted_balance,
  si.metadata->>'balance_updated' as balance_updated,
  a.balance as current_balance,
  a.last_updated
FROM statement_imports si
LEFT JOIN accounts a ON si.account_id = a.id
WHERE si.status = 'completed'
ORDER BY si.created_at DESC
LIMIT 10;

-- Verify Transaction Amount Signs
SELECT 
  type,
  COUNT(*) FILTER (WHERE amount > 0) as positive_amounts,
  COUNT(*) FILTER (WHERE amount < 0) as negative_amounts,
  COUNT(*) FILTER (WHERE amount = 0) as zero_amounts,
  COUNT(*) as total
FROM transactions
WHERE statement_import_id IS NOT NULL
  AND created_at > NOW() - INTERVAL '7 days'
GROUP BY type;

-- Get OCR Extraction Details
SELECT 
  file_hash,
  created_at,
  jsonb_array_length(structured_data->'transactions') as transaction_count,
  structured_data->'balances'->>'closing_balance' as closing_balance,
  structured_data->'balances'->>'opening_balance' as opening_balance
FROM ocr_results
WHERE structured_data IS NOT NULL
ORDER BY created_at DESC
LIMIT 5;

