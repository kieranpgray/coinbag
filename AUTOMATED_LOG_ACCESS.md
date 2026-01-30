# Automated Log Access Setup

I've set up automated access to Supabase edge function logs through multiple methods:

## ✅ Available Tools

### 1. Database Monitoring Script
**File**: `scripts/monitor-statement-processing.ts`

**Usage**:
```bash
# One-time check
tsx scripts/monitor-statement-processing.ts

# Continuous monitoring (watches for new uploads)
tsx scripts/monitor-statement-processing.ts --watch
```

**What it does**:
- Monitors `statement_imports` table for new uploads
- Extracts correlation IDs for log filtering
- Queries actual transaction counts from database
- Compares expected (43) vs actual counts
- Provides instructions for accessing logs

### 2. Quick Extraction Script
**File**: `scripts/extract-checkpoint-data.sh`

**Usage**:
```bash
./scripts/extract-checkpoint-data.sh
```

**What it does**:
- Checks database for latest statement import
- Shows transaction counts
- Provides instructions for accessing all checkpoints

### 3. Browser Console (Checkpoints 6-7)
The frontend code already logs checkpoints 6-7 to the browser console:
- **Checkpoint 6**: API response (in `supabaseRepo.ts`)
- **Checkpoint 7**: UI render (in `TransactionList.tsx`)

**To access**:
1. Open browser DevTools (F12)
2. Go to Console tab
3. Look for `=== CHECKPOINT 6: API RESPONSE ===`
4. Look for `=== CHECKPOINT 7: UI RENDER ===`

### 4. Supabase Dashboard (Checkpoints 1-5)
**URL**: `https://supabase.com/dashboard/project/tislabgxitwtcqfwrpik/functions/process-statement/logs`

**To access**:
1. Navigate to the URL above (requires login)
2. Filter by time range (last hour)
3. Search for "CHECKPOINT" keyword
4. Filter by correlation ID if available

## 🔄 Workflow

### After Uploading anz-statement.pdf:

1. **Run the monitoring script**:
   ```bash
   tsx scripts/monitor-statement-processing.ts --watch
   ```

2. **The script will**:
   - Detect the new upload
   - Show the correlation ID
   - Monitor processing status
   - Report transaction counts
   - Identify if loss occurred

3. **Check browser console** for checkpoints 6-7

4. **Check Supabase dashboard** for checkpoints 1-5 using the correlation ID

## 📊 Expected Output

When you upload the PDF, the monitoring script will show:

```
📄 New Statement Import Detected
────────────────────────────────────────────────────────────
ID: abc123...
File: anz-statement.pdf
Status: processing
Correlation ID: xyz789...

⏳ Waiting for processing to complete...

✅ Processing Complete
────────────────────────────────────────────────────────────
Status: completed
Total Transactions: 43
Imported Transactions: 6
Database Transaction Count: 6

📊 Checkpoint Analysis
────────────────────────────────────────────────────────────
Expected: 43 transactions
Database Count: 6 transactions

❌ LOSS CONFIRMED: Only 6 transactions in database

To find where the loss occurred:
1. Go to Supabase Dashboard → Edge Functions → process-statement → Logs
2. Filter by correlation ID: xyz789...
3. Search for "CHECKPOINT" keyword
4. Look for the first checkpoint showing count < 43
```

## 🎯 Next Steps

1. **Deploy the edge function** (if not already deployed):
   ```bash
   supabase functions deploy process-statement
   ```

2. **Upload the PDF** via the UI at `https://localhost:5174`

3. **Run the monitoring script**:
   ```bash
   tsx scripts/monitor-statement-processing.ts --watch
   ```

4. **Collect checkpoint data** from:
   - Database (via monitoring script)
   - Browser console (checkpoints 6-7)
   - Supabase dashboard (checkpoints 1-5)

5. **Generate the report** using the collected data

## 🔍 Troubleshooting

### If monitoring script fails:
- Check that `.env.local` exists with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- Verify database connection
- Check RLS policies allow reading `statement_imports` table

### If dashboard requires login:
- The browser automation can navigate to the dashboard
- You'll need to log in manually
- Then I can help extract the logs

### If no logs appear:
- Verify edge function is deployed with checkpoint logging
- Check that statement processing actually ran
- Verify correlation ID matches between database and logs


