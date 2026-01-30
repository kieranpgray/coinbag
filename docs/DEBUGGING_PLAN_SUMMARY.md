# Debugging Plan Summary: Quick Reference

## Two Critical Issues

1. **Credit transactions showing as negative** - Transaction `9ab9951e-247d-4c84-a914-8ecad4fe9869` with `amount: 5778.94, type: 'expense'` should be credit
2. **Balance updates failing** - Error: `column "account_id" does not exist` (error code: 42703)

## Top 3 Hypotheses (Most Likely)

### 1. OCR Extracts "payment" Instead of "credit" (HIGH PROBABILITY)
- OCR prompt instructs to extract "PAYMENT - THANKYOU" as `transaction_type: "credit"`
- But OCR may still extract `transaction_type: "payment"`
- Payment classification logic only triggers if description contains "thankyou" or "payment received"
- If description doesn't match, defaults to `'expense'`

**Quick Check:**
```bash
# Check edge function logs for OCR extraction
grep "STATEMENT:OCR_EXTRACTION:RAW_DATA" <edge-function-logs> | jq '.transactions[] | select(.description | contains("PAYMENT"))'
```

### 2. Database Trigger/Function References Non-Existent `account_id` Column (HIGH PROBABILITY)
- Error code 42703 = column does not exist
- `updateAccountBalanceWithRetry` correctly uses `id` and `user_id`
- A trigger, function, or RLS policy on `accounts` table might reference `accounts.account_id` (should be `accounts.id`)

**Quick Check:**
```bash
# Run the diagnostic SQL script
supabase db execute --file scripts/check-accounts-triggers.sql
```

### 3. Payment Classification Logic Too Strict (MEDIUM PROBABILITY)
- Payment transactions with positive amounts should default to `'income'` unless clearly a payment made
- Current logic requires exact description matches ("thankyou", "payment received")
- Missing patterns might cause false negatives

**Quick Check:**
```bash
# Check normalization logs
grep "STATEMENT:NORMALIZATION:TRANSACTION_DETAIL" <edge-function-logs> | jq 'select(.ocrTransactionType == "payment")'
```

## Immediate Actions

### Step 1: Collect Evidence (15 minutes)
1. Query database for problematic transaction:
   ```sql
   SELECT id, amount, type, description, statement_import_id 
   FROM transactions 
   WHERE id = '9ab9951e-247d-4c84-a914-8ecad4fe9869';
   ```

2. Check edge function logs for:
   - `STATEMENT:OCR_EXTRACTION:RAW_DATA` - What did OCR extract?
   - `STATEMENT:NORMALIZATION:TRANSACTION_DETAIL` - How was it normalized?
   - `STATEMENT:BALANCE_UPDATE:RETRY:ERROR` - What's the exact error?

3. Run database diagnostics:
   ```bash
   supabase db execute --file scripts/check-accounts-triggers.sql
   ```

### Step 2: Identify Root Cause (10 minutes)
- Compare OCR extraction vs. normalization vs. database storage
- Identify which hypothesis is correct
- Check error details for balance update failure

### Step 3: Apply Targeted Fix (30 minutes)
- **If Hypothesis 1:** Improve payment classification logic + strengthen OCR prompt
- **If Hypothesis 2:** Fix database trigger/function/RLS policy
- **If Hypothesis 3:** Make payment classification more lenient

## Files to Review

1. **OCR Extraction Prompt:**
   - `supabase/functions/process-statement/index.ts` lines 1165-1177, 1372-1384

2. **Payment Classification Logic:**
   - `supabase/functions/process-statement/index.ts` lines 2677-2699

3. **Balance Update Logic:**
   - `supabase/functions/process-statement/index.ts` lines 2092-2226, 3329-3356

4. **Database Triggers:**
   - `supabase/migrations/20251231000003_add_account_linking_to_goals.sql` lines 38-66

## Expected Fixes

### Fix 1: Payment Classification (if Hypothesis 1 or 3)
```typescript
// In determineTransactionType function
if (ocrTransactionType === 'payment') {
  // More lenient: if amount > 0, default to income unless clearly payment made
  if (rawAmount > 0) {
    const isPaymentMade = description.includes('payment to') || 
                          description.includes('payment for') ||
                          description.includes('autopay');
    return isPaymentMade ? 'expense' : 'income';
  }
  return 'expense';
}
```

### Fix 2: Database Trigger (if Hypothesis 2)
```sql
-- Find and fix any trigger/function that references accounts.account_id
-- Should use accounts.id instead
```

## Success Criteria

1. ✅ Credit transactions stored as `type: 'income'` with positive `amount`
2. ✅ UI displays credit transactions as positive/green
3. ✅ Balance updates succeed without `account_id` error
4. ✅ Account balance in database matches extracted closing balance

