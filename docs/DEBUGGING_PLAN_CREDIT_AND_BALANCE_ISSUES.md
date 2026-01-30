# Debugging Plan: Credit Transaction Classification & Balance Update Issues

## Problem Statement

Two critical issues persist after multiple fixes:
1. **Credit transactions are displayed as negative/expense** - A transaction with `amount: 5778.94, type: 'expense'` should be displayed as a credit (positive/green)
2. **Account balance is not updating** - Balance updates fail with `column "account_id" does not exist` error

## Root Cause Hypotheses

### Hypothesis 1: OCR Extraction Returns "payment" Instead of "credit"
**Probability: HIGH**

**Evidence:**
- User reports transaction with `type: 'expense'` that should be credit
- OCR prompt instructs to extract "PAYMENT - THANKYOU" as `transaction_type: "credit"` (lines 1166-1169, 1373-1382)
- Normalization logic handles `transaction_type: 'payment'` with description-based heuristics (lines 2677-2699)
- If description doesn't match patterns (`'thankyou'`, `'payment received'`, etc.), it defaults to `'expense'`

**Why it fails:**
- OCR/LLM may extract `transaction_type: 'payment'` instead of `'credit'` despite prompt instructions
- Description may not contain exact keywords ("thankyou", "payment received") that trigger credit classification
- Description might be truncated or formatted differently (e.g., "PAYMENT THANKYOU 443794" vs "PAYMENT - THANKYOU")

**Verification Steps:**
1. Check edge function logs for `STATEMENT:OCR_EXTRACTION:RAW_DATA` to see what `transaction_type` OCR actually extracted
2. Check `STATEMENT:NORMALIZATION:TRANSACTION_DETAIL` logs to see:
   - `ocrTransactionType` value
   - `description` value
   - `determinedType` value
   - Whether `isPaymentReceived` logic was triggered

**Fix Strategy:**
- Strengthen OCR prompt with more explicit examples and negative examples
- Improve payment classification logic to be more lenient (check for positive amount + payment keyword)
- Add fallback: if `transaction_type: 'payment'` AND `amount > 0`, default to `'income'` unless description clearly indicates payment made

### Hypothesis 2: Amount Sign Correction Not Applied for Payment Type
**Probability: MEDIUM**

**Evidence:**
- User reports `amount: 5778.94, type: 'expense'` - amount is positive but type is expense
- Amount normalization logic (lines 2775-2805) only corrects sign if `transactionType === 'income'` or `transactionType === 'expense'`
- If `determineTransactionType` returns `'expense'` for a payment transaction, the amount stays positive (should be negative for expense)

**Why it fails:**
- Payment transactions with `transaction_type: 'payment'` that are misclassified as `'expense'` will have positive amounts
- The amount correction logic (line 2792) makes expenses negative, but if the transaction was already classified as expense incorrectly, the correction happens on the wrong type

**Verification Steps:**
1. Check `STATEMENT:NORMALIZATION:TRANSACTION_DETAIL` logs for:
   - `rawAmount` vs `normalizedAmount`
   - `correctionApplied` flag
   - `determinedType` value
2. Check `STATEMENT:DB_INSERT:VERIFIED` logs to see stored `amount` and `type` values

**Fix Strategy:**
- Ensure amount sign correction happens BEFORE type determination, or
- Add validation: if `type === 'expense'` AND `amount > 0`, log warning and investigate OCR extraction

### Hypothesis 3: Database Trigger or RLS Policy References Non-Existent `account_id` Column
**Probability: HIGH**

**Evidence:**
- Error: `column "account_id" does not exist` with error code `42703`
- `updateAccountBalanceWithRetry` correctly uses `id` and `user_id` in WHERE clauses (lines 2133-2134)
- `cleanUpdateData` explicitly removes `account_id` before update (lines 2101-2104)
- Database trigger `sync_goal_from_account()` exists on `accounts` table (migration 20251231000003)

**Why it fails:**
- A database trigger, function, or RLS policy might be referencing `account_id` column in the `accounts` table
- The `accounts` table uses `id` as primary key, not `account_id`
- The trigger function `sync_goal_from_account()` uses `WHERE account_id = NEW.id` - this is correct (it's querying `goals.account_id`, not `accounts.account_id`)
- However, there might be another trigger or function that incorrectly references `accounts.account_id`

**Verification Steps:**
1. Run `scripts/check-accounts-triggers.sql` to identify all triggers, functions, and RLS policies
2. Check edge function logs for `STATEMENT:BALANCE_UPDATE:RETRY:ERROR` to see:
   - `errorDetails` and `errorHint` fields
   - Full error message
3. Check if any migration or function was created that references `accounts.account_id`

**Fix Strategy:**
- Identify the exact trigger/function/RLS policy causing the error
- Fix the reference to use `id` instead of `account_id` in the `accounts` table context
- If it's a trigger on `accounts` table, ensure it only references `accounts.id`, not `accounts.account_id`

### Hypothesis 4: Balance Update Logic Skips Update Due to "Most Recent Statement" Check
**Probability: MEDIUM**

**Evidence:**
- Balance update only occurs if statement is "most recent" (lines 2941-2965)
- Logic compares `statement_period.to_date` with other completed statements
- If `statementEndDate` is null, it's treated as most recent (line 2944)

**Why it fails:**
- If statement period extraction fails, `statementEndDate` might be null
- If another statement has a later end date, balance update is skipped
- Balance update might be skipped silently without clear logging

**Verification Steps:**
1. Check `STATEMENT:BALANCE_EXTRACT:DETAILED` logs for:
   - `statementEndDate` value
   - `hasStatementPeriod` flag
2. Check `STATEMENT:BALANCE_UPDATE:DETAILED` logs to see if update was attempted or skipped
3. Query database to check if there are multiple statements for the same account and their end dates

**Fix Strategy:**
- Add explicit logging when balance update is skipped due to "most recent" check
- Consider updating balance even if not most recent, but with a warning log
- Ensure `statement_period.to_date` extraction is reliable

### Hypothesis 5: UI Rendering Logic Incorrectly Interprets Stored Data
**Probability: LOW**

**Evidence:**
- UI code (lines 268-310 in `TransactionList.tsx`) correctly checks `transaction.type === 'income'` for credit display
- User reports `type: 'expense'` in console logs, which matches database storage

**Why it fails:**
- If database stores `type: 'expense'` with positive amount, UI will correctly display it as negative
- The issue is in data storage, not UI rendering

**Verification Steps:**
1. Check `UI:TRANSACTION_RENDER:DETAIL` console logs to see:
   - `transaction.type` value
   - `transaction.amount` value
   - `isCredit` calculation
2. Verify these match database values from `STATEMENT:DB_INSERT:VERIFIED` logs

**Fix Strategy:**
- Fix data storage issue (Hypotheses 1-2), UI should then display correctly

## Debugging Plan

### Phase 1: Data Collection & Analysis

#### Step 1.1: Collect OCR Extraction Data
**Objective:** Verify what OCR actually extracted for the problematic transaction

**Actions:**
1. Query edge function logs for `STATEMENT:OCR_EXTRACTION:RAW_DATA` entries
2. Filter for the statement import that contains the problematic transaction (ID: `9ab9951e-247d-4c84-a914-8ecad4fe9869`)
3. Extract:
   - `transaction_type` value from OCR
   - `amount` value from OCR
   - `description` value from OCR
   - Full transaction object from structured data

**Expected Output:**
- JSON object showing raw OCR extraction for the problematic transaction
- Confirmation of whether OCR extracted `'credit'`, `'payment'`, or `'debit'`

**SQL Query:**
```sql
-- Query ocr_results table for the statement import
SELECT 
  id,
  statement_import_id,
  extraction_result->'transactions' as transactions,
  created_at
FROM ocr_results
WHERE statement_import_id = (
  SELECT statement_import_id 
  FROM transactions 
  WHERE id = '9ab9951e-247d-4c84-a914-8ecad4fe9869'
)
ORDER BY created_at DESC
LIMIT 1;
```

#### Step 1.2: Collect Normalization Data
**Objective:** Verify how the transaction was normalized

**Actions:**
1. Query edge function logs for `STATEMENT:NORMALIZATION:TRANSACTION_DETAIL` entries
2. Filter for transactions matching the problematic transaction description/amount
3. Extract:
   - `rawAmount` value
   - `ocrTransactionType` value
   - `determinedType` value
   - `normalizedAmount` value
   - `correctionApplied` flag

**Expected Output:**
- Before/after normalization comparison
- Confirmation of whether payment classification logic was triggered

#### Step 1.3: Collect Database Storage Data
**Objective:** Verify what was actually stored in the database

**Actions:**
1. Query `transactions` table for the problematic transaction
2. Extract:
   - `amount` value
   - `type` value
   - `description` value
   - `statement_import_id` value

**Expected Output:**
- Confirmation that database stores `type: 'expense'` with positive amount

**SQL Query:**
```sql
SELECT 
  id,
  amount,
  type,
  description,
  date,
  statement_import_id,
  account_id
FROM transactions
WHERE id = '9ab9951e-247d-4c84-a914-8ecad4fe9869';
```

#### Step 1.4: Collect Balance Update Error Data
**Objective:** Identify the exact source of the `account_id` column error

**Actions:**
1. Query edge function logs for `STATEMENT:BALANCE_UPDATE:RETRY:ERROR` entries
2. Extract:
   - `errorDetails` field
   - `errorHint` field
   - Full error message
   - `updateDataKeys` array
   - `updateData` object

**Expected Output:**
- Detailed error information pointing to the exact database object causing the issue

#### Step 1.5: Query Database Triggers and Functions
**Objective:** Identify all database objects that might reference `account_id`

**Actions:**
1. Run `scripts/check-accounts-triggers.sql` script
2. Review all triggers, functions, and RLS policies on `accounts` table
3. Search for any references to `account_id` in the context of `accounts` table

**Expected Output:**
- List of all triggers, functions, and RLS policies
- Identification of any that incorrectly reference `accounts.account_id`

### Phase 2: Root Cause Identification

#### Step 2.1: Analyze OCR Extraction Results
**Decision Point:** Did OCR extract `transaction_type: 'credit'` or `'payment'`?

- **If `'credit'`:** Issue is in normalization logic (Hypothesis 2)
- **If `'payment'`:** Issue is in OCR prompt or payment classification logic (Hypothesis 1)

#### Step 2.2: Analyze Normalization Results
**Decision Point:** Was payment classification logic triggered?

- **If yes:** Check if description matched expected patterns
- **If no:** Payment classification logic needs improvement

#### Step 2.3: Analyze Balance Update Error
**Decision Point:** What database object is causing the `account_id` error?

- **If trigger:** Fix trigger function to use `id` instead of `account_id`
- **If RLS policy:** Fix RLS policy to use `id` instead of `account_id`
- **If function:** Fix function to use `id` instead of `account_id`

### Phase 3: Targeted Fixes

#### Fix 1: Improve Payment Classification Logic
**If Hypothesis 1 is confirmed:**

**Changes:**
1. Make payment classification more lenient:
   - If `transaction_type: 'payment'` AND `amount > 0`, default to `'income'` unless description clearly indicates payment made
   - Add more description patterns: `'payment'`, `'received'`, `'deposit'`, etc.
   - Consider amount-based heuristics: large positive payments are likely credits

2. Strengthen OCR prompt:
   - Add more explicit examples of payment transactions that should be extracted as `'credit'`
   - Add negative examples (what NOT to extract as `'credit'`)
   - Emphasize that "PAYMENT - THANKYOU" MUST be extracted as `transaction_type: "credit"`

**Files to Modify:**
- `supabase/functions/process-statement/index.ts`:
  - Lines 1165-1177: OCR prompt for payment classification
  - Lines 1372-1384: OCR prompt for payment classification (duplicate)
  - Lines 2677-2699: Payment classification logic in `determineTransactionType`

#### Fix 2: Fix Database Trigger/Function/RLS Policy
**If Hypothesis 3 is confirmed:**

**Changes:**
1. Identify the exact database object causing the error
2. Fix the reference from `account_id` to `id` in the `accounts` table context
3. Test the fix with a balance update

**Files to Modify:**
- Create new migration file: `supabase/migrations/YYYYMMDDHHMMSS_fix_account_id_reference.sql`
- Or modify existing trigger/function if identified

#### Fix 3: Improve Balance Update Logging
**If Hypothesis 4 is confirmed:**

**Changes:**
1. Add explicit logging when balance update is skipped due to "most recent" check
2. Add logging for statement period extraction failures
3. Consider updating balance even if not most recent, but with warning

**Files to Modify:**
- `supabase/functions/process-statement/index.ts`:
  - Lines 2941-2965: "Most recent statement" check logic

### Phase 4: Verification & Testing

#### Step 4.1: Test Credit Transaction Classification
**Actions:**
1. Upload a statement with a known credit transaction (e.g., "PAYMENT - THANKYOU")
2. Monitor edge function logs for:
   - OCR extraction result
   - Normalization result
   - Database storage result
3. Verify UI displays transaction as positive/green

**Success Criteria:**
- Transaction stored with `type: 'income'` and positive `amount`
- UI displays transaction as positive/green

#### Step 4.2: Test Balance Update
**Actions:**
1. Upload a statement with a closing balance
2. Monitor edge function logs for:
   - Balance extraction result
   - Balance update attempt
   - Success/failure result
3. Verify account balance is updated in database

**Success Criteria:**
- Balance update succeeds without `account_id` error
- Account balance in database matches extracted closing balance

## Implementation Priority

1. **HIGH:** Fix database trigger/function/RLS policy causing `account_id` error (Hypothesis 3)
2. **HIGH:** Improve payment classification logic (Hypothesis 1)
3. **MEDIUM:** Improve balance update logging (Hypothesis 4)
4. **LOW:** Verify UI rendering (Hypothesis 5 - likely not the issue)

## Next Steps

1. Execute Phase 1 (Data Collection) to gather evidence
2. Analyze results to confirm which hypotheses are correct
3. Implement targeted fixes based on confirmed hypotheses
4. Test fixes with real statement uploads
5. Monitor production logs for any remaining issues

