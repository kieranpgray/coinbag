# Statement Processing End-to-End Verification Guide

## Overview

This guide helps verify the complete statement processing pipeline from upload → Mistral AI → database → UI.

## Processing Flow

```
1. User uploads PDF → Storage bucket ✅
2. Create statement_imports record → Database ✅
3. Trigger Edge Function → process-statement ❌ (CORS issue)
4. Edge Function downloads file → Storage ✅
5. Extract text → PDF.js or Mistral OCR ✅
6. Parse transactions → Deterministic parser ✅
7. Save transactions → Database ✅
8. Update status → statement_imports table ✅
9. Real-time update → UI via Supabase subscriptions ✅
```

## Current Status

### ✅ Working
- File upload to storage bucket
- Statement import record creation
- Real-time status subscription setup

### ❌ Blocked
- Edge Function trigger (CORS error)
- Statement processing pipeline

## Issue: CORS Error

**Error**: `Access to fetch at 'https://tislabgxitwtcqfwrpik.supabase.co/functions/v1/process-statement' from origin 'https://localhost:5175' has been blocked by CORS policy`

**Root Cause**: Edge Function not returning proper CORS headers for localhost development.

## Fix: Add CORS Headers to Edge Function

The Edge Function needs to return CORS headers. Update `supabase/functions/process-statement/index.ts`:

```typescript
// Add CORS helper function
const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // In production, use specific domain
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // ... existing code ...
    
    return new Response(
      JSON.stringify({ success: true, data }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
```

## Verification Steps

### 1. Verify Upload ✅

**Check**: File exists in storage
```bash
# In Supabase Dashboard
Storage → Buckets → statements → Check for uploaded file
```

**Expected**: File visible with path like `{userId}/{accountId}/{timestamp}-filename.pdf`

### 2. Verify Database Record ✅

**Check**: Statement import record created
```sql
-- In Supabase SQL Editor
SELECT * FROM statement_imports 
ORDER BY created_at DESC 
LIMIT 1;
```

**Expected**: Record with:
- `status = 'pending'`
- `file_path` matches storage path
- `file_hash` populated
- `account_id` references valid account

### 3. Verify Edge Function Trigger ❌

**Check**: Edge Function receives request
```bash
# Check Supabase Dashboard → Edge Functions → Logs
# Should see function invocation logs
```

**Current Issue**: CORS blocking the request

**Fix**: Add CORS headers (see above)

### 4. Verify Processing Pipeline

**After CORS fix**, check:

#### 4a. Edge Function Logs
```bash
# Supabase Dashboard → Edge Functions → process-statement → Logs
# Look for:
- "Processing statement import: {id}"
- "Downloaded file from storage"
- "Extracted text" or "Using Mistral OCR"
- "Parsed X transactions"
- "Saved transactions to database"
```

#### 4b. Database Status Updates
```sql
-- Check status progression
SELECT id, status, total_transactions, imported_transactions, error_message
FROM statement_imports
ORDER BY created_at DESC
LIMIT 5;
```

**Expected progression**:
1. `pending` → Initial state
2. `processing` → Edge Function started
3. `completed` → Success
   - `total_transactions > 0`
   - `imported_transactions > 0`
   - `error_message IS NULL`
4. `failed` → Error occurred
   - `error_message` contains details

#### 4c. Transactions Created
```sql
-- Check transactions were created
SELECT t.*, si.file_name as source_file
FROM transactions t
JOIN statement_imports si ON t.statement_import_id = si.id
ORDER BY t.created_at DESC
LIMIT 10;
```

**Expected**: Transactions with:
- `statement_import_id` linking to statement import
- `account_id` matching the uploaded account
- `amount`, `description`, `date` populated
- `type` set (income/expense)

### 5. Verify UI Updates ✅

**Check**: Real-time status updates in UI

**Expected**:
- Status changes from "pending" → "processing" → "completed"
- Progress indicators update
- Success message appears
- Transactions appear in account view

**Current**: Status subscription is set up, but processing never starts due to CORS.

## Debugging Tools

### 1. Check Statement Import Status

```typescript
// In browser console
import { getStatementImportStatus } from '@/lib/statementProcessing'

const status = await getStatementImportStatus(
  'your-statement-import-id',
  () => Promise.resolve('your-token')
)
console.log(status)
```

### 2. Monitor Real-time Updates

```typescript
// In browser console
import { subscribeToStatementImportStatus } from '@/lib/statementProcessing'

const unsubscribe = await subscribeToStatementImportStatus(
  'your-statement-import-id',
  (status) => {
    console.log('Status update:', status)
  },
  () => Promise.resolve('your-token')
)

// Later, cleanup
unsubscribe()
```

### 3. Check Edge Function Logs

```bash
# Supabase Dashboard → Edge Functions → process-statement → Logs
# Filter by time range around upload
# Look for errors or processing steps
```

### 4. Verify Mistral Integration

**Check**: Mistral API key configured
```bash
# Supabase Dashboard → Project Settings → Edge Functions → Secrets
# Should have: MISTRAL_API_KEY
```

**Test**: Edge Function should fall back to Mistral if PDF.js fails

## Manual Testing Checklist

- [ ] Upload PDF file
- [ ] Verify file in storage bucket
- [ ] Verify statement_imports record created
- [ ] Verify Edge Function triggered (after CORS fix)
- [ ] Verify processing status updates
- [ ] Verify transactions created
- [ ] Verify UI shows success message
- [ ] Verify transactions appear in account view
- [ ] Test with text-based PDF (should use PDF.js)
- [ ] Test with scanned PDF (should use Mistral OCR)
- [ ] Test error handling (invalid file, etc.)

## Common Issues

### CORS Error
**Symptom**: `Access-Control-Allow-Origin header is missing`
**Fix**: Add CORS headers to Edge Function (see above)

### Processing Never Starts
**Symptom**: Status stuck at "pending"
**Check**: 
- Edge Function logs for errors
- Mistral API key configured
- Storage bucket permissions

### Transactions Not Created
**Symptom**: Status is "completed" but no transactions
**Check**:
- Edge Function logs for parsing errors
- Transaction table RLS policies
- Foreign key constraints

### Status Updates Not Appearing
**Symptom**: UI doesn't reflect status changes
**Check**:
- Real-time subscription active
- WebSocket connection working
- Status field updates in database

## Next Steps

1. **Fix CORS** - Add headers to Edge Function
2. **Deploy Edge Function** - Ensure latest code is deployed
3. **Test Upload** - Upload a test PDF
4. **Monitor Logs** - Watch Edge Function logs for processing
5. **Verify Transactions** - Check database for created transactions
6. **Test UI** - Verify transactions appear in account view




