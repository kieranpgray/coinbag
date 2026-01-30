# Log Analysis Instructions

## Updated Instrumentation

I've updated all instrumentation to use the existing `logger` (which outputs to Supabase edge function logs via `console.log`) instead of fetch calls. This ensures logs are visible in Supabase Dashboard.

## How to Access Logs

### Option 1: Supabase Dashboard (Recommended)
1. Go to Supabase Dashboard → Edge Functions → `process-statement` → Logs
2. Filter by time range around when you uploaded the statement
3. Look for log entries with `DEBUG:HYPOTHESIS_*` prefix
4. Copy the relevant log entries and share them

### Option 2: Reproduce with Updated Code
1. Deploy the updated edge function (with logger-based instrumentation)
2. Upload a statement with a credit transaction
3. Check Supabase Dashboard → Edge Functions → Logs
4. Look for `DEBUG:HYPOTHESIS_*` entries

## What to Look For

### For Credit Transaction Issue (Hypotheses A, B, C)
Look for these log entries:
- `DEBUG:HYPOTHESIS_A: OCR extraction raw data` - Check `transaction_type` values
- `DEBUG:HYPOTHESIS_A: determineTransactionType entry` - Check `ocrTransactionType` and `description`
- `DEBUG:HYPOTHESIS_B: determineTransactionType payment classification` - Check `isPaymentReceived` calculation
- `DEBUG:HYPOTHESIS_C: before amount normalization` - Check `rawAmount` and `transactionType`
- `DEBUG:HYPOTHESIS_C: after amount normalization` - Check `normalizedAmount` and `amountSignMatchesType`

### For Balance Update Issue (Hypotheses D, F)
Look for these log entries:
- `DEBUG:HYPOTHESIS_D: before balance update query` - Check `updateDataKeys` and `cleanUpdateData`
- `DEBUG:HYPOTHESIS_D: after balance update query` - Check `errorMessage`, `errorCode`, `errorDetails`, `errorHint`
- `DEBUG:HYPOTHESIS_F: most recent statement check` - Check `isMostRecent` and `willUpdateBalance`

## Expected Log Format

Logs will appear in Supabase edge function logs like:
```
[2024-01-25T10:30:00.000Z] INFO DEBUG:HYPOTHESIS_A: determineTransactionType entry { location: 'process-statement/index.ts:2665', rawAmount: 5778.94, ocrTransactionType: 'payment', description: 'PAYMENT - THANKYOU', statementImportId: '...', hypothesisId: 'A' }
```

