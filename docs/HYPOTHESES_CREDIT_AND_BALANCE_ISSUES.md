# Hypotheses: Credit Transaction & Balance Update Issues

## Problem 1: Credit Transactions Displayed as Negative

### Hypothesis A: OCR Extracts "payment" Instead of "credit" (HIGH PROBABILITY)
**Why:** OCR prompt instructs to extract "PAYMENT - THANKYOU" as `transaction_type: "credit"`, but LLM may still extract `"payment"`. Payment classification logic (lines 2677-2699) only triggers credit classification if description contains exact keywords ("thankyou", "payment received"). If description doesn't match patterns, defaults to `'expense'`.

**Evidence to Collect:**
- `ocrTransactionType` value from OCR extraction
- `description` value from OCR extraction
- Whether `isPaymentReceived` logic was triggered
- Final `determinedType` value

**Instrumentation Points:**
- After OCR extraction: log raw `transaction_type` and `description`
- In `determineTransactionType`: log `ocrTransactionType`, `description`, `isPaymentReceived` calculation, and final return value
- Before database insert: log final `type` and `amount` values

### Hypothesis B: Payment Classification Logic Too Strict (MEDIUM PROBABILITY)
**Why:** Payment transactions with positive amounts should default to `'income'` unless clearly a payment made. Current logic requires exact description matches. Missing patterns or variations might cause false negatives.

**Evidence to Collect:**
- Description text that failed to match patterns
- Whether `rawAmount > 0` but still classified as `'expense'`
- All description patterns checked vs. actual description

**Instrumentation Points:**
- In payment classification: log each pattern check result
- Log when payment with positive amount is classified as expense
- Log description variations that don't match

### Hypothesis C: Amount Sign Correction Not Applied (LOW PROBABILITY)
**Why:** Amount normalization (lines 2775-2805) only corrects sign if `transactionType === 'income'` or `transactionType === 'expense'`. If transaction was misclassified as `'expense'` incorrectly, amount correction happens on wrong type.

**Evidence to Collect:**
- `rawAmount` vs `normalizedAmount` values
- `correctionApplied` flag
- Whether amount sign matches final type

**Instrumentation Points:**
- Before normalization: log `rawAmount` and `transactionType`
- After normalization: log `normalizedAmount` and `correctionApplied`
- After database insert: verify stored `amount` and `type` match intended values

## Problem 2: Balance Update Fails with "account_id does not exist"

### Hypothesis D: Database Trigger References Non-Existent `account_id` Column (HIGH PROBABILITY)
**Why:** Error code 42703 = column does not exist. `updateAccountBalanceWithRetry` correctly uses `id` and `user_id`. A trigger, function, or RLS policy on `accounts` table might reference `accounts.account_id` (should be `accounts.id`). The `sync_goal_from_account()` trigger function uses `WHERE account_id = NEW.id` which is correct (querying `goals.account_id`), but there might be another trigger that incorrectly references `accounts.account_id`.

**Evidence to Collect:**
- Exact error message and error code
- Error details and hint from Supabase
- All triggers on `accounts` table
- All functions that reference `account_id` in context of `accounts` table
- RLS policies on `accounts` table

**Instrumentation Points:**
- Before update: log `updateData` keys and values
- On error: log full error object including `details` and `hint`
- Log all database objects (triggers, functions, RLS policies) that might cause this

### Hypothesis E: RLS Policy References `account_id` Column (MEDIUM PROBABILITY)
**Why:** RLS policies on `accounts` table might have a `WITH CHECK` or `USING` clause that references `account_id` instead of `id`.

**Evidence to Collect:**
- All RLS policies on `accounts` table
- Policy definitions that reference `account_id`
- Whether error occurs during policy evaluation

**Instrumentation Points:**
- Log RLS policy evaluation (if possible)
- Check policy definitions for `account_id` references

### Hypothesis F: Balance Update Logic Skips Update Due to "Most Recent Statement" Check (LOW PROBABILITY)
**Why:** Balance update only occurs if statement is "most recent" (lines 2941-2965). If `statementEndDate` is null or another statement has later date, update is skipped silently.

**Evidence to Collect:**
- `statementEndDate` value
- Whether update was attempted or skipped
- Other statements for same account and their end dates

**Instrumentation Points:**
- Log when balance update is skipped due to "most recent" check
- Log `statementEndDate` and comparison results
- Log all statements for account to see which is most recent

