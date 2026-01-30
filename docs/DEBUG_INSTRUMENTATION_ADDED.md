# Debug Instrumentation Added

## Summary

I've added comprehensive instrumentation to test all 6 hypotheses about why credit transactions show as negative and balance updates fail. The instrumentation uses HTTP POST requests to the debug logging server and will write NDJSON logs to `/Users/kierangray/Projects/wellthy/.cursor/debug.log`.

## Hypotheses Being Tested

### Problem 1: Credit Transactions Displayed as Negative

**Hypothesis A:** OCR Extracts "payment" Instead of "credit" (HIGH PROBABILITY)
- **Instrumentation:** Logs OCR extraction results, transaction type determination logic, and payment classification patterns

**Hypothesis B:** Payment Classification Logic Too Strict (MEDIUM PROBABILITY)
- **Instrumentation:** Logs each pattern check in payment classification (thankyou, payment received, etc.)

**Hypothesis C:** Amount Sign Correction Not Applied (LOW PROBABILITY)
- **Instrumentation:** Logs before/after amount normalization, correction flags, and final amount/type matching

### Problem 2: Balance Update Fails with "account_id does not exist"

**Hypothesis D:** Database Trigger References Non-Existent `account_id` Column (HIGH PROBABILITY)
- **Instrumentation:** Logs before/after balance update query, full error details including `error.details` and `error.hint`

**Hypothesis E:** RLS Policy References `account_id` Column (MEDIUM PROBABILITY)
- **Instrumentation:** Covered by Hypothesis D instrumentation (error details will show if RLS is the issue)

**Hypothesis F:** Balance Update Logic Skips Update Due to "Most Recent Statement" Check (LOW PROBABILITY)
- **Instrumentation:** Logs statement end date, other statements query results, and most recent check logic

## Instrumentation Locations

### 1. OCR Extraction (Hypothesis A)
- **Location:** `supabase/functions/process-statement/index.ts:1579`
- **Logs:** Sample transactions from OCR extraction with `transaction_type`, `amount`, and `description`

### 2. Transaction Type Determination (Hypotheses A, B)
- **Location:** `supabase/functions/process-statement/index.ts:2665-2727`
- **Logs:**
  - Function entry with `rawAmount`, `ocrTransactionType`, `description`
  - Credit/debit branch execution
  - Payment classification with all pattern checks
  - Fallback to amount sign logic

### 3. Amount Normalization (Hypothesis C)
- **Location:** `supabase/functions/process-statement/index.ts:2768-2805`
- **Logs:**
  - Before normalization: `rawAmount`, `transactionType`
  - Income branch: `normalizedAmount`, `correctionApplied`
  - Expense branch: `normalizedAmount`, `correctionApplied`
  - After normalization: final `normalizedAmount`, `amountSignMatchesType`

### 4. Balance Update Query (Hypothesis D)
- **Location:** `supabase/functions/process-statement/index.ts:2130-2136`
- **Logs:**
  - Before query: `updateDataKeys`, `cleanUpdateData`, `accountId`, `userId`
  - After query: `hasError`, `errorMessage`, `errorCode`, `errorDetails`, `errorHint`

### 5. Most Recent Statement Check (Hypothesis F)
- **Location:** `supabase/functions/process-statement/index.ts:3298-3335`
- **Logs:**
  - Check start: `hasStatementEndDate`, `statementEndDate`
  - Query result: `otherStatementsCount`, `queryError`
  - Check result: `isMostRecent`, `laterStatementsCount`
  - Final decision: `willUpdateBalance`

## Log Format

All logs are written in NDJSON format to `/Users/kierangray/Projects/wellthy/.cursor/debug.log` with the following structure:

```json
{
  "location": "process-statement/index.ts:LINE",
  "message": "description",
  "data": { ... },
  "timestamp": 1234567890,
  "sessionId": "debug-session",
  "runId": "run1",
  "hypothesisId": "A|B|C|D|E|F"
}
```

## Next Steps

1. **Reproduce the issue** by uploading a statement with a credit transaction (e.g., "PAYMENT - THANKYOU")
2. **Check the logs** in `/Users/kierangray/Projects/wellthy/.cursor/debug.log`
3. **Analyze the logs** to evaluate each hypothesis:
   - **CONFIRMED:** Log evidence clearly shows the hypothesis is correct
   - **REJECTED:** Log evidence clearly shows the hypothesis is incorrect
   - **INCONCLUSIVE:** Log evidence is insufficient to determine

## Expected Log Entries

For a credit transaction that's being misclassified:
- `OCR extraction raw data` → Check `transaction_type` value
- `determineTransactionType entry` → Check `ocrTransactionType` and `description`
- `determineTransactionType payment classification` → Check `isPaymentReceived` calculation
- `before amount normalization` → Check `rawAmount` and `transactionType`
- `after amount normalization` → Check `normalizedAmount` and `amountSignMatchesType`

For a balance update failure:
- `before balance update query` → Check `updateDataKeys` and `cleanUpdateData`
- `after balance update query` → Check `errorMessage`, `errorCode`, `errorDetails`, `errorHint`
- `most recent statement check` → Check `isMostRecent` and `willUpdateBalance`

