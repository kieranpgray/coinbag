# Statement Extraction Investigation Results

## Investigation Summary

This document summarizes the findings from the root cause analysis investigation for statement extraction and ingestion failures.

## Code Review Findings

### Stage 2: Extraction Schema Definition ✅

**Location:** `supabase/functions/process-statement/index.ts` lines 730-777

**Findings:**
- ✅ `transaction_type` enum includes: `["credit", "debit", "transfer", "fee", "interest", "payment"]`
- ✅ `amount` field defined as: `{ type: "number" }` (no sign constraint - this is expected, sign is handled in normalization)
- ✅ Schema requires: `["date", "description", "amount", "transaction_type"]` - all critical fields are required

**Status:** Schema definition is correct. The issue is in the extraction prompt and normalization logic, which have been fixed.

### Stage 3: Normalization Logic ✅

**Location:** `supabase/functions/process-statement/index.ts` lines 2546-2569

**Previous Logic (BROKEN):**
- Used amount sign as PRIMARY determinant
- Credits with negative amounts were misclassified as expenses

**Current Logic (FIXED):**
- ✅ Prioritizes `transaction_type` from OCR
- ✅ Credits always classified as income, regardless of amount sign
- ✅ Debits always classified as expenses
- ✅ Falls back to amount sign only if `transaction_type` is missing

**Status:** Fixed in implementation.

### Stage 3: Most Recent Statement Logic ✅

**Location:** `supabase/functions/process-statement/index.ts` lines 2941-2965

**Findings:**
- ✅ Logic checks `statement_period.to_date` from extracted data
- ✅ Compares with other completed statements for the same account
- ✅ Only updates balance if this statement's end date is >= all other statements' end dates
- ✅ Handles null `statementEndDate` gracefully (treats as most recent)

**Status:** Logic is correct. Balance updates only occur for the most recent statement, which is the intended behavior.

### Stage 4: Transaction Query Fields ✅

**Location:** `src/data/transactions/supabaseRepo.ts` lines 22-23

**Findings:**
- ✅ SELECT includes: `id, userId:user_id, accountId:account_id, date, description, amount, type, category, transactionReference:transaction_reference, statementImportId:statement_import_id, createdAt:created_at, updatedAt:updated_at`
- ✅ Both `type` and `amount` fields are included in the query
- ✅ Query respects RLS policies via authenticated Supabase client

**Status:** Query includes all required fields.

### Stage 4: UI Display Logic ✅

**Location:** `src/features/transactions/components/TransactionList.tsx` lines 268-310

**Findings:**
- ✅ `isCredit` logic: `transaction.type === 'income' || transaction.type === 'credit'`
- ✅ `displayAmount` calculation: `Math.abs(transaction.amount)` - correctly uses absolute value
- ✅ Display sign: `isCredit ? '+' : '-'` - correctly shows + for income, - for expense
- ✅ Color logic: `isCredit ? 'text-[#059669]' : 'text-gray-900'` - correctly shows green for income

**Status:** UI logic is correct. If database stores credits as `type: 'income'` with positive amounts, UI will display correctly.

### Stage 4: Balance Display ✅

**Location:** `src/features/accounts/AccountsPage.tsx` lines 800-820

**Findings:**
- ✅ Displays `selectedAccountData.balance` from `useAccount()` hook
- ✅ Hook queries `accounts.balance` field correctly
- ✅ Uses `formatCurrency()` for proper formatting

**Status:** Balance display is correct.

### Stage 4: Cache Invalidation ✅

**Location:** Multiple files handle cache invalidation:

1. **`src/features/statements/watchStatementImport.ts`** lines 222-227:
   - ✅ Invalidates `['transactions', accountId]`
   - ✅ Invalidates `['transactions']`
   - ✅ Invalidates `['accounts']`
   - ✅ Invalidates `['dashboard']`

2. **`src/features/accounts/AccountsPage.tsx`** lines 654-661:
   - ✅ Invalidates same queries when statement import completes
   - ✅ Calls `refetchAccount()` and `refetchAccounts()` explicitly

3. **`src/features/accounts/components/StatementUploadStep.tsx`** lines 251-254:
   - ✅ Invalidates queries on completion

**Status:** Cache invalidation is properly implemented. Accounts and transactions will refresh after statement import completes.

## Database Investigation Queries

A comprehensive SQL script has been created at `scripts/investigate-statement-extraction.sql` with queries for:

1. **OCR Output Validation:**
   - Query OCR cache table
   - Search markdown for balance patterns
   - Verify transaction rows in markdown

2. **Extraction Logic Validation:**
   - Query structured data from OCR cache
   - Analyze credit transaction amount signs
   - Count transactions with wrong signs

3. **Storage/Ingestion Validation:**
   - Query recent transactions
   - Identify misclassified credits
   - Query balance updates
   - Compare extracted vs stored balances

## Implementation Fixes Applied

### Fix 1: Updated Extraction Prompts ✅
- Added explicit transaction amount sign instructions
- Credits must be positive, debits must be negative
- Added examples for common transaction types

### Fix 2: Updated Normalization Logic ✅
- Prioritizes `transaction_type` over amount sign
- Credits always classified as income
- Debits always classified as expenses

### Fix 3: Added Amount Validation ✅
- Automatically corrects credit transactions with negative amounts
- Logs warnings when corrections are made
- Ensures income is always positive, expenses always negative

### Fix 4: Enhanced Balance Extraction Prompt ✅
- Added explicit instructions to check headers, footers, summary sections
- Added more examples of balance formats
- Enhanced CR/DR annotation recognition

## Remaining Tasks

### Manual Investigation Required (Database Queries)
These require running SQL queries against the live database:
- Stage 1: OCR cache queries (4 tasks)
- Stage 2: Structured data analysis (3 tasks)
- Stage 3: Transaction and balance queries (5 tasks)

**Action:** Run queries from `scripts/investigate-statement-extraction.sql` in Supabase SQL Editor

### Manual Testing Required
These require uploading test statements:
- verify1-test-credit-extraction
- verify2-test-normalization
- verify3-test-balance-update
- verify4-test-ui-display

**Action:** Upload test statements with known credit transactions and verify:
1. Credits are extracted with positive amounts
2. Credits are stored as `type: 'income'` with positive amounts
3. Account balances update correctly
4. UI displays credits as green (+)

## Expected Outcomes After Fixes

1. **Credit Transactions:**
   - ✅ Extracted with positive amounts (prompt fix)
   - ✅ Classified as income even if extracted negative (normalization fix)
   - ✅ Corrected to positive before storage (validation fix)
   - ✅ Displayed as green (+) in UI (UI logic already correct)

2. **Account Balances:**
   - ✅ Extracted from all statement sections (enhanced prompt)
   - ✅ Updated only for most recent statement (logic already correct)
   - ✅ Displayed correctly in UI (UI logic already correct)

## Conclusion

All code-level fixes have been implemented. The remaining investigation tasks require:
1. Running SQL queries against the database (script provided)
2. Manual testing with real statement uploads

The code is ready for testing and should resolve both issues:
- Credit transactions will be correctly identified and displayed as positive/green
- Account balances will be extracted and updated correctly

