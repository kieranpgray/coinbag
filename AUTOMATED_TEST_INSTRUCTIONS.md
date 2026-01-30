# Automated Test Execution Instructions

## Current Status

✅ **All 7 checkpoints are implemented and logging**
✅ **Checkpoints 6 & 7 are already working** (visible in browser console)
❌ **File upload requires manual user interaction** (browser security restriction)

## What We Can See Now

From the browser console, we can already see:
- **Checkpoint 6**: Returns 6 transactions (should be 43)
- **Checkpoint 7**: Renders 6 transactions (should be 43)

**This confirms the loss is happening BEFORE checkpoint 6** (likely in checkpoints 1-5).

## Manual Upload Required

Due to browser security restrictions, file uploads require user interaction. Please follow these steps:

### Step 1: Locate the PDF File

The `anz-statement.pdf` file needs to be on your computer. If you have it:
- Note the file path
- Or move it to an easily accessible location (e.g., Desktop, Downloads)

### Step 2: Upload Through UI

1. **You're already on the account page**: `https://localhost:5174/app/accounts/e265a35b-0f83-4e60-b42a-3f7828f9be3e`
2. **Click "Upload Statement" button** (already visible on the page)
3. **Select `anz-statement.pdf`** from your file system
4. **Wait for processing** to complete

### Step 3: Collect All Checkpoint Logs

#### Checkpoints 1-5: Edge Function Logs
**Location**: Supabase Dashboard → Edge Functions → process-statement → Logs

**Look for**:
```
=== CHECKPOINT 1: OCR OUTPUT ===
=== CHECKPOINT 2: EXTRACTION REQUEST ===
=== CHECKPOINT 3: EXTRACTION RESPONSE ===
=== CHECKPOINT 4: PRE-STORAGE ===
=== CHECKPOINT 5: DATABASE INSERT ===
```

**Filter by**:
- Timestamp (around upload time)
- Correlation ID (from upload logs)
- Search for "CHECKPOINT"

#### Checkpoints 6-7: Browser Console
**Location**: Browser DevTools → Console tab (already visible)

**You'll see**:
```
=== CHECKPOINT 6: API RESPONSE ===
=== CHECKPOINT 7: UI RENDER ===
```

## Expected Results

After uploading, you should see a count audit trail:

| Checkpoint | Location | Expected Count | Actual Count |
|------------|----------|---------------|--------------|
| 1. OCR Output | Edge Function Logs | ~43 lines | ? |
| 2. Extraction Request | Edge Function Logs | Full text | ? |
| 3. Extraction Response | Edge Function Logs | 43 | ? |
| 4. Pre-Storage | Edge Function Logs | 43 | ? |
| 5. DB Insert | Edge Function Logs | 43 | ? |
| 6. API Response | Browser Console | 43 | **6** ❌ |
| 7. UI Render | Browser Console | 43 | **6** ❌ |

**The first checkpoint showing 6 instead of 43 is where the loss occurs.**

## Next Steps

1. **Upload the PDF manually** (click Upload Statement button, select file)
2. **Monitor browser console** for checkpoints 6-7
3. **Check Supabase Edge Function logs** for checkpoints 1-5
4. **Identify the loss point** (first checkpoint with count = 6)
5. **Share the logs** from that checkpoint and the previous one

## Quick Reference

- **Test File**: anz-statement.pdf
- **Expected**: 43 transactions
- **Current UI**: 6 transactions
- **Loss**: 37 transactions (86% data loss)
- **Account ID**: e265a35b-0f83-4e60-b42a-3f7828f9be3e


