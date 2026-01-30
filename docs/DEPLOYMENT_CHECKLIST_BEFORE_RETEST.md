# Deployment Checklist Before Retest

## ✅ Required: Deploy Edge Function

The instrumentation code has been updated in `supabase/functions/process-statement/index.ts`. You need to deploy it to Supabase for the changes to take effect.

### Deploy Command

```bash
# From project root directory
supabase functions deploy process-statement
```

**Note**: Make sure you're authenticated with Supabase CLI:
```bash
supabase login
supabase link --project-ref your-project-ref  # If not already linked
```

### Verify Deployment

After deployment, you can verify in Supabase Dashboard:
1. Go to **Edge Functions** → **process-statement**
2. Check that the function shows the latest deployment timestamp
3. The function should be active and ready to receive requests

## ❌ NOT Needed

### Frontend Dev Server
- **No restart needed** - The frontend code hasn't changed
- If you're running `pnpm dev` or similar, you can keep it running
- The instrumentation is only in the edge function, not the frontend

### Database Migrations
- **No migrations needed** - No database schema changes were made
- The instrumentation only adds logging, no database changes

### Environment Variables
- **No changes needed** - All existing environment variables remain the same
- The instrumentation uses the existing logger, no new env vars required

## What Happens After Deployment

Once deployed, the edge function will:
1. Log all hypothesis-related data to Supabase edge function logs
2. Use the `DEBUG:HYPOTHESIS_*` prefix for easy filtering
3. Capture all the data needed to identify root causes

## Next Steps After Deployment

1. Upload a statement with a credit transaction
2. Wait for processing to complete
3. Check Supabase Dashboard → Edge Functions → process-statement → Logs
4. Look for entries with `DEBUG:HYPOTHESIS_*` prefix
5. Share the logs for analysis

