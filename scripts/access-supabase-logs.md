# Accessing Supabase Edge Function Logs Automatically

## Method 1: Supabase Dashboard (Browser Access)

I can navigate to the Supabase dashboard logs page using the browser automation tools:

**URL**: `https://supabase.com/dashboard/project/tislabgxitwtcqfwrpik/functions/process-statement/logs`

This will allow me to:
1. View logs in real-time
2. Filter for "CHECKPOINT" keyword
3. Extract checkpoint data automatically

## Method 2: Supabase Management API

To use the API, you need an access token:

1. **Get Access Token**:
   - Go to: https://supabase.com/dashboard/account/tokens
   - Create a new access token
   - Set it as environment variable: `export SUPABASE_ACCESS_TOKEN=your_token`

2. **Then run**:
   ```bash
   tsx scripts/fetch-supabase-logs.ts
   ```

## Method 3: Database Query (Indirect)

Since logs are stored, we can query the database for recent statement imports and correlate with processing:

```sql
SELECT 
  id,
  file_name,
  status,
  total_transactions,
  imported_transactions,
  correlation_id,
  created_at,
  updated_at
FROM statement_imports
ORDER BY created_at DESC
LIMIT 5;
```

Then use the correlation_id to filter logs.

## Current Setup

- ✅ Project linked: `tislabgxitwtcqfwrpik` (supafolio-dev)
- ✅ Supabase CLI installed
- ❌ Access token needed for API access
- ✅ Browser automation available for dashboard access

## Recommended Approach

**Use browser automation to access dashboard logs** - this is the most reliable method and doesn't require API tokens.


