# Test Execution Guide: ANZ Statement Upload

## Overview
All 7 checkpoint logging has been implemented. This guide will help you execute the test and collect the logs to identify where transactions drop from 43 → 6.

## Prerequisites

1. **PDF File**: Ensure `anz-statement.pdf` is available on your computer
2. **App Running**: Dev server should be running on port 5174
3. **Authenticated**: You must be logged in to the app
4. **Edge Function Deployed**: The updated edge function with checkpoint logging must be deployed

## Step 1: Deploy Edge Function (Required)

The checkpoint logging is in the edge function code. You must deploy it first:

```bash
cd /Users/kierangray/Projects/supafolio
supabase functions deploy process-statement
```

**Verify deployment**:
- Go to Supabase Dashboard → Edge Functions → process-statement
- Check that the latest deployment timestamp is recent

## Step 2: Upload PDF Through UI

1. **Open the app**: Navigate to `http://localhost:5174`
2. **Log in** if needed
3. **Navigate to an account page** (or create one if needed)
4. **Click "Upload Statement"** button
5. **Select `anz-statement.pdf`** from your computer
6. **Wait for processing** to complete (watch the status indicator)

## Step 3: Collect Checkpoint Logs

### Checkpoints 1-5: Supabase Edge Function Logs

**Location**: Supabase Dashboard → Edge Functions → process-statement → Logs

**What to look for**:
```
=== CHECKPOINT 1: OCR OUTPUT ===
=== CHECKPOINT 2: EXTRACTION REQUEST ===
=== CHECKPOINT 3: EXTRACTION RESPONSE ===
=== CHECKPOINT 4: PRE-STORAGE ===
=== CHECKPOINT 5: DATABASE INSERT ===
```

**Filtering tips**:
- Filter by timestamp (around the upload time)
- Look for correlation ID in logs
- Search for "CHECKPOINT" keyword

### Checkpoint 6: Browser Console

**Location**: Browser DevTools → Console tab

**What to look for**:
```
=== CHECKPOINT 6: API RESPONSE ===
```

**How to access**:
1. Open DevTools (F12 or Cmd+Option+I)
2. Go to Console tab
3. Look for checkpoint logs

### Checkpoint 7: Browser Console

**Location**: Same browser console

**What to look for**:
```
=== CHECKPOINT 7: UI RENDER ===
```

## Step 4: Analyze the Results

Create a count audit trail table:

| Checkpoint | Location | Count | Status |
|------------|----------|-------|--------|
| 1. OCR Output | Edge Function Logs | ? | ✅/❌ |
| 2. Extraction Request | Edge Function Logs | ? | ✅/❌ |
| 3. Extraction Response | Edge Function Logs | ? | ✅/❌ |
| 4. Pre-Storage | Edge Function Logs | ? | ✅/❌ |
| 5. DB Insert | Edge Function Logs | ? | ✅/❌ |
| 6. API Response | Browser Console | ? | ✅/❌ |
| 7. UI Render | Browser Console | ? | ✅/❌ |

**Expected**: All checkpoints should show ~43 transactions
**Actual**: One checkpoint will show 6 transactions (the loss point)

## Step 5: Identify Loss Point

The **first checkpoint** where the count drops from 43 → 6 is where the loss occurs.

**Common loss points**:
- **Checkpoint 3**: Mistral extraction didn't get all transactions
- **Checkpoint 4**: Validation/normalization filtered out transactions
- **Checkpoint 5**: Database insert failed for some transactions
- **Checkpoint 6**: Query has filters limiting results
- **Checkpoint 7**: Client-side filtering removed transactions

## What Each Checkpoint Logs

### Checkpoint 1: OCR Output
- Raw OCR text length
- Potential transaction lines count
- Lines with "CR" suffix (credits)
- Multi-line entries

### Checkpoint 2: Extraction Request
- Markdown length sent to Chat API
- Whether text was truncated
- Reduction percentage

### Checkpoint 3: Extraction Response
- Transactions extracted by Mistral
- Credit/debit breakdown
- PAYMENT - THANKYOU count
- Sample transactions

### Checkpoint 4: Pre-Storage
- Transactions after validation/normalization
- Income/expense counts
- Filtered count
- Sample transactions

### Checkpoint 5: Database Insert
- Inserted count
- Query verification count
- Failed count
- Sample inserted transactions

### Checkpoint 6: API Response
- Transactions returned to UI
- Query parameters
- Sample transactions

### Checkpoint 7: UI Render
- Transactions received by component
- After client-side filters
- Rendered count

## Troubleshooting

### No logs appearing?
1. **Check edge function is deployed**: Verify in Supabase Dashboard
2. **Check browser console**: Make sure DevTools is open
3. **Check correlation ID**: Use the correlation ID from upload to filter logs

### Can't find specific checkpoint?
- Checkpoints 1-5 are in Edge Function logs
- Checkpoints 6-7 are in Browser Console
- All use the same format: `=== CHECKPOINT X: ... ===`

### Processing failed?
- Check Edge Function logs for errors
- Look for error messages before checkpoints
- Verify Mistral API key is configured

## Next Steps After Identifying Loss Point

Once you identify where the count drops:
1. **Share the logs** from that checkpoint and the previous one
2. **Note the file and line number** from the checkpoint log
3. **Check the code** at that location
4. **Analyze why** transactions were lost (filtering, validation, etc.)

## Quick Reference

**Expected Count**: 43 transactions
**Actual UI Count**: 6 transactions
**Loss**: 37 transactions (86% data loss)

**Test File**: anz-statement.pdf
**Statement Period**: 27/11/25 to 28/12/25
**Account Number**: 4564-6801-2120-1445


