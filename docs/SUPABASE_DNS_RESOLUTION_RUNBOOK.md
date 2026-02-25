# Production Supabase DNS Resolution Failure Runbook

## Symptom
All Supabase REST API requests fail with `Failed to load resource: net::ERR_NAME_NOT_RESOLVED` in production. Local development works fine.

## Root Cause
DNS lookup failure for the production Supabase hostname (`<project-ref>.supabase.co`). Most commonly caused by the Supabase project being paused (free tier projects pause after inactivity).

## Verification Steps

### 1. Check if project is paused
- Open [Supabase Dashboard](https://supabase.com/dashboard)
- Select the production project (usually `auvtsvmtfrbpvgyvfqlx`)
- If it shows "Project paused", this is the cause

### 2. Verify DNS resolution
- Run: `nslookup auvtsvmtfrbpvgyvfqlx.supabase.co` (replace with actual project ref)
- Or: `dig auvtsvmtfrbpvgyvfqlx.supabase.co`
- If it fails or times out, DNS is not resolving

### 3. Confirm production environment variables
- In Vercel: Project Settings → Environment Variables
- Ensure Production environment has:
  - `VITE_SUPABASE_URL=https://auvtsvmtfrbpvgyvfqlx.supabase.co`
  - `VITE_SUPABASE_ANON_KEY=<production-anon-key>`

## Fix

### Primary: Restore Supabase project
1. In Supabase Dashboard → select project → click "Restore project" if paused
2. Wait 1-2 minutes for DNS to propagate
3. Test the app

### If project was deleted
1. Create new Supabase project
2. Update Vercel production env vars with new URL and anon key
3. Redeploy

## Post-Fix Steps

### Run pending migrations against production
After the project is reachable again, ensure the production database schema matches local development:

```bash
# Link to production project
supabase link --project-ref auvtsvmtfrbpvgyvfqlx

# Run pending migrations
pnpm db:migrate:pending
```

Or apply migrations manually via Supabase Dashboard → SQL Editor.

## Prevention
- Monitor Supabase project activity to avoid auto-pause
- Consider upgrading to paid tier for production projects
- Keep this runbook handy for quick resolution

## Related Issues
- ERR_NAME_NOT_RESOLVED
- Supabase project paused
- DNS resolution failure