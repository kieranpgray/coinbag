# Statement Processing Flow - End-to-End Verification

## Complete Flow Diagram

```
┌─────────────┐
│ User Upload │
│   PDF File  │
└──────┬──────┘
       │
       ▼
┌──────────────────┐
│ Storage Bucket   │ ✅ Working
│ (statements)     │
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│ statement_imports│ ✅ Working
│   Record Created │
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│ Edge Function    │ ❌ CORS Fixed (needs deploy)
│   Trigger        │
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│ Download File    │ ✅ Ready
│   from Storage   │
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│ Extract Text     │ ✅ Ready
│ PDF.js or Mistral│
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│ Parse            │ ✅ Ready
│ Transactions     │
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│ Save to DB       │ ✅ Ready
│   transactions   │
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│ Update Status    │ ✅ Ready
│   Real-time      │
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│ UI Updates       │ ✅ Ready
│   Show Results   │
└──────────────────┘
```

## Current Status

### ✅ Completed
1. **File Upload** - Files successfully upload to storage bucket
2. **Database Record** - `statement_imports` table created and records inserted
3. **CORS Fix** - Edge Function CORS headers added (needs deployment)

### ⏳ Pending Deployment
- Edge Function needs to be deployed with CORS fixes

### ✅ Ready (After Deployment)
- File download from storage
- Text extraction (PDF.js + Mistral OCR)
- Transaction parsing
- Database updates
- Real-time status updates

## Verification Steps

### Step 1: Verify Upload ✅

**Check Storage**:
```bash
# Supabase Dashboard → Storage → Buckets → statements
# Should see: {userId}/{accountId}/{timestamp}-filename.pdf
```

**Check Database**:
```sql
SELECT id, file_name, file_path, status, created_at
FROM statement_imports
ORDER BY created_at DESC
LIMIT 1;
```

**Expected**: Record with `status = 'pending'`

### Step 2: Deploy Edge Function

**Action Required**: Deploy the updated Edge Function with CORS headers

```bash
# From project root
supabase functions deploy process-statement
```

Or via Supabase Dashboard:
1. Go to Edge Functions → process-statement
2. Deploy latest code

### Step 3: Verify Edge Function Trigger

**After deployment**, upload a new file and check:

**Browser Console**:
- Should NOT see CORS error
- Should see successful function invocation

**Edge Function Logs**:
```bash
# Supabase Dashboard → Edge Functions → process-statement → Logs
# Look for:
- "Edge function invoked"
- "Processing statement import: {id}"
```

### Step 4: Monitor Processing

**Check Status Updates**:
```sql
-- Watch status change
SELECT id, status, total_transactions, imported_transactions, error_message, updated_at
FROM statement_imports
WHERE id = 'your-import-id'
ORDER BY updated_at DESC;
```

**Expected Progression**:
1. `pending` → Initial state
2. `processing` → Edge Function started
3. `completed` → Success
   - `total_transactions > 0`
   - `imported_transactions > 0`
4. `failed` → Error (check `error_message`)

### Step 5: Verify Transactions

**Check Transactions Created**:
```sql
SELECT 
  t.id,
  t.account_id,
  t.amount,
  t.description,
  t.date,
  t.type,
  si.file_name as source_file
FROM transactions t
JOIN statement_imports si ON t.statement_import_id = si.id
WHERE si.id = 'your-import-id'
ORDER BY t.date DESC;
```

**Expected**: Multiple transactions with:
- `statement_import_id` linking to import
- `account_id` matching uploaded account
- `amount`, `description`, `date` populated
- `type` set correctly

### Step 6: Verify UI Updates

**Check Real-time Updates**:
- Status should update in UI automatically
- Progress indicators should show
- Success message should appear
- Transactions should appear in account view

## Debugging Tools

### 1. Check Edge Function Logs

```bash
# Supabase Dashboard → Edge Functions → process-statement → Logs
# Filter by:
- Time range around upload
- Look for errors or processing steps
- Check Mistral API calls
```

### 2. Monitor Database Changes

```sql
-- Watch for status changes
SELECT 
  id,
  status,
  total_transactions,
  imported_transactions,
  failed_transactions,
  error_message,
  updated_at
FROM statement_imports
ORDER BY updated_at DESC
LIMIT 10;
```

### 3. Check Mistral Integration

**Verify API Key**:
```bash
# Supabase Dashboard → Project Settings → Edge Functions → Secrets
# Should have: MISTRAL_API_KEY
```

**Check Usage**:
- Edge Function logs will show "Using Mistral OCR" if PDF.js fails
- Mistral is used for scanned/complex PDFs

### 4. Test Real-time Subscription

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
```

## Common Issues & Solutions

### CORS Error (Fixed)
**Symptom**: `Access-Control-Allow-Origin header is missing`
**Solution**: CORS headers added to Edge Function (deploy needed)

### Processing Never Starts
**Symptom**: Status stuck at "pending"
**Check**:
- Edge Function deployed?
- Edge Function logs show invocation?
- Mistral API key configured?

### Transactions Not Created
**Symptom**: Status is "completed" but no transactions
**Check**:
- Edge Function logs for parsing errors
- Transaction table RLS policies
- Foreign key constraints

### Status Updates Not Appearing
**Symptom**: UI doesn't reflect status changes
**Check**:
- Real-time subscription active?
- WebSocket connection working?
- Status field updates in database?

## Next Actions

1. ✅ **CORS Fixed** - Headers added to Edge Function
2. ⏳ **Deploy Edge Function** - Deploy updated code
3. ⏳ **Test Upload** - Upload a test PDF
4. ⏳ **Monitor Processing** - Watch logs and database
5. ⏳ **Verify Transactions** - Check database for created transactions
6. ⏳ **Test UI** - Verify transactions appear in account view

## Testing Checklist

- [ ] Upload PDF file
- [ ] Verify file in storage
- [ ] Verify statement_imports record
- [ ] Deploy Edge Function (with CORS fix)
- [ ] Verify Edge Function triggered
- [ ] Monitor processing status
- [ ] Verify transactions created
- [ ] Verify UI updates
- [ ] Test with text-based PDF
- [ ] Test with scanned PDF (Mistral OCR)
- [ ] Test error handling




