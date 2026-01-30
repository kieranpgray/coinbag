-- Debug script: Investigate a specific transaction by ID
-- Usage: Replace 'TRANSACTION_ID' with the actual transaction ID

-- Step 1: Get the transaction details
SELECT 
  t.id,
  t.amount,
  t.type,
  t.description,
  t.date,
  t.statement_import_id,
  t.account_id,
  t.created_at,
  -- Check if amount sign matches type
  CASE 
    WHEN t.type = 'income' AND t.amount > 0 THEN 'CORRECT'
    WHEN t.type = 'expense' AND t.amount < 0 THEN 'CORRECT'
    ELSE 'MISMATCH'
  END as amount_sign_check
FROM transactions t
WHERE t.id = 'TRANSACTION_ID'; -- Replace with actual ID

-- Step 2: Get the statement import details
SELECT 
  si.id,
  si.account_id,
  si.user_id,
  si.status,
  si.imported_transactions,
  si.failed_transactions,
  si.completed_at,
  si.correlation_id
FROM statement_imports si
WHERE si.id = (
  SELECT statement_import_id 
  FROM transactions 
  WHERE id = 'TRANSACTION_ID' -- Replace with actual ID
);

-- Step 3: Get OCR extraction results for this statement
SELECT 
  ocr.id,
  ocr.statement_import_id,
  ocr.extraction_result->'transactions' as transactions,
  ocr.created_at
FROM ocr_results ocr
WHERE ocr.statement_import_id = (
  SELECT statement_import_id 
  FROM transactions 
  WHERE id = 'TRANSACTION_ID' -- Replace with actual ID
)
ORDER BY ocr.created_at DESC
LIMIT 1;

-- Step 4: Find the specific transaction in OCR results
-- This query extracts the transaction from the JSON array
SELECT 
  jsonb_array_elements(ocr.extraction_result->'transactions') as transaction_data
FROM ocr_results ocr
WHERE ocr.statement_import_id = (
  SELECT statement_import_id 
  FROM transactions 
  WHERE id = 'TRANSACTION_ID' -- Replace with actual ID
)
ORDER BY ocr.created_at DESC
LIMIT 1;

-- Step 5: Check for similar transactions (same description, different type)
SELECT 
  t.id,
  t.amount,
  t.type,
  t.description,
  t.date,
  t.statement_import_id
FROM transactions t
WHERE t.description ILIKE (
  SELECT '%' || description || '%' 
  FROM transactions 
  WHERE id = 'TRANSACTION_ID' -- Replace with actual ID
)
AND t.id != 'TRANSACTION_ID' -- Replace with actual ID
ORDER BY t.date DESC
LIMIT 10;

-- Step 6: Check account balance
SELECT 
  a.id,
  a.name,
  a.account_type,
  a.balance,
  a.balance_owed,
  a.last_updated
FROM accounts a
WHERE a.id = (
  SELECT account_id 
  FROM transactions 
  WHERE id = 'TRANSACTION_ID' -- Replace with actual ID
);

