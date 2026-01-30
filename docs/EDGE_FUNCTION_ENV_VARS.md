# Edge Function Environment Variables

## Important Note

Supabase **automatically provides** the following environment variables to all Edge Functions:
- `SUPABASE_URL` - Automatically set
- `SUPABASE_ANON_KEY` - Automatically set

**You cannot and do not need to manually set these variables.**

## Required Manual Configuration

Only **one** environment variable needs to be set manually:

### MISTRAL_API_KEY

**Location**: Supabase Dashboard → Edge Functions → process-statement → Settings → Environment Variables

**Value**: `jJnyzvYcruSTj50bTqAEXlGl0rmxiXDm`

**How to Set**:
1. Go to [Supabase Dashboard](https://app.supabase.com/project/auvtsvmtfrbpvgyvfqlx/functions/process-statement/settings)
2. Navigate to **Environment Variables** section
3. Click **Add new variable**
4. Name: `MISTRAL_API_KEY`
5. Value: `jJnyzvYcruSTj50bTqAEXlGl0rmxiXDm`
6. Click **Save**

## Verification

The Edge Function code uses:
- `Deno.env.get('MISTRAL_API_KEY')` - Must be set manually
- `Deno.env.get('SUPABASE_URL')` - Automatically provided by Supabase
- `Deno.env.get('SUPABASE_ANON_KEY')` - Automatically provided by Supabase

## Why This Works

Supabase Edge Functions run in a managed environment where Supabase automatically injects:
- The project's Supabase URL
- The project's anon key
- Other system-level variables

This is why you see the error "Name must not start with the SUPABASE_ prefix" - Supabase reserves these prefixes for system-managed variables.

