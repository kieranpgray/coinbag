# Production Deployment Status & Next Steps

**Date**: January 27, 2025
**Project**: Wellthy (coinbag)
**Supabase Production**: `auvtsvmtfrbpvgyvfqlx`

## ✅ Completed Automatically

### 1. Local Environment Configuration
- ✅ Updated `.env` file with production values
- ✅ Backup created: `.env.backup.*`
- ✅ All required variables set:
  - `VITE_DATA_SOURCE=supabase`
  - `VITE_SUPABASE_URL=https://auvtsvmtfrbpvgyvfqlx.supabase.co`
  - `VITE_SUPABASE_ANON_KEY` (updated with provided key)
  - `VITE_CLERK_PUBLISHABLE_KEY` (updated with provided key)
  - `CLERK_DOMAIN=clerk.coinbag.app`
  - `CLERK_INSTANCE_ID=ins_37VAGQw0JVza01qpTa6yUt8iVLY`

### 2. Scripts Created
- ✅ `scripts/update-production-config.sh` - Updates local .env
- ✅ `scripts/deploy-edge-function.sh` - Deploys Edge Function
- ✅ Documentation created

## ⚠️ Manual Actions Required

### Step 1: Verify Vercel Environment Variables

**Location**: [Vercel Dashboard](https://vercel.com/dashboard) → Your Project → Settings → Environment Variables

**Verify these 4 variables match the provided values**:

| Variable | Expected Value | Action |
|----------|---------------|--------|
| `VITE_SUPABASE_URL` | `https://auvtsvmtfrbpvgyvfqlx.supabase.co` | Update if different |
| `VITE_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF1dnRzdm10ZnJicHZneXZmcWx4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY5NzAwMTcsImV4cCI6MjA4MjU0NjAxN30.OLKiOD4K2nt8u5OFTNiFJc8UzzrkI6SllbscJMaEpBQ` | Update if different |
| `VITE_CLERK_PUBLISHABLE_KEY` | `pk_live_Y2xlcmsuY29pbmJhZy5hcHAk` | Update if different |
| `VITE_DATA_SOURCE` | `supabase` | Update if different |

**After updating**: Redeploy the application (push to main or use Vercel Dashboard)

---

### Step 2: Deploy Edge Function

**Status**: ⚠️ **NOT YET DEPLOYED** - This is the main task

**Option A: Using Script** (Recommended):
```bash
./scripts/deploy-edge-function.sh
```

**Option B: Manual CLI**:
```bash
# Link to project (if not already linked)
supabase link --project-ref auvtsvmtfrbpvgyvfqlx

# Deploy function
supabase functions deploy process-statement
```

**After deployment**: Proceed to Step 3

---

### Step 3: Set Edge Function Environment Variables

**Location**: [Supabase Dashboard](https://app.supabase.com/project/auvtsvmtfrbpvgyvfqlx) → Edge Functions → process-statement → Settings → Environment Variables

**Set these 3 variables**:

| Variable | Value |
|----------|-------|
| `MISTRAL_API_KEY` | `jJnyzvYcruSTj50bTqAEXlGl0rmxiXDm` |
| `SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF1dnRzdm10ZnJicHZneXZmcWx4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY5NzAwMTcsImV4cCI6MjA4MjU0NjAxN30.OLKiOD4K2nt8u5OFTNiFJc8UzzrkI6SllbscJMaEpBQ` |
| `SUPABASE_URL` | `https://auvtsvmtfrbpvgyvfqlx.supabase.co` |

**Note**: These can only be set AFTER the function is deployed (Step 2)

---

### Step 4: Verify Clerk JWT Template

**Location**: [Clerk Dashboard](https://dashboard.clerk.com) → JWT Templates

**Check if template exists**:
- Template name: `supabase` (lowercase, exactly)
- Algorithm: `HS256`

**If template doesn't exist**, create it with:
- **Name**: `supabase`
- **Algorithm**: `HS256`
- **Signing Key**: Get from Supabase Dashboard → Project Settings → API → JWT Secret
- **Lifetime**: `3600` seconds
- **Claims**:
  ```json
  {
    "sub": "{{user.id}}",
    "role": "authenticated",
    "aud": "ins_37VAGQw0JVza01qpTa6yUt8iVLY",
    "iss": "https://clerk.coinbag.app",
    "exp": "{{date.now_plus_seconds(3600)}}",
    "iat": "{{date.now}}"
  }
  ```

---

### Step 5: Verify Supabase JWT Validation

**Location**: [Supabase Dashboard](https://app.supabase.com/project/auvtsvmtfrbpvgyvfqlx) → Authentication → Settings

**Verify/Set**:
- **JWKS URL**: `https://clerk.coinbag.app/.well-known/jwks.json`
- **Issuer**: `https://clerk.coinbag.app`
- **Audience**: `ins_37VAGQw0JVza01qpTa6yUt8iVLY`
- **JWT verification**: Enabled

---

### Step 6: Check Migration Status

**Using Supabase CLI**:
```bash
supabase link --project-ref auvtsvmtfrbpvgyvfqlx
supabase migration list
```

**Or check in Dashboard**:
- Go to [Supabase Dashboard](https://app.supabase.com/project/auvtsvmtfrbpvgyvfqlx) → Table Editor
- Verify these tables exist:
  - `expenses`, `categories`, `assets`, `liabilities`, `accounts`, `income`, `goals`, `user_preferences`, `transactions`, `statement_imports`, `ocr_results`

**If migrations are missing**: Run `./scripts/run-migrations-via-cli.sh`

---

## Summary Checklist

- [x] Local .env file updated with production values
- [ ] **Vercel environment variables verified/updated** (Manual - Step 1)
- [ ] **Edge Function deployed** (Can automate - Step 2)
- [ ] **Edge Function environment variables set** (Manual - Step 3)
- [ ] Clerk JWT template verified/created (Manual - Step 4)
- [ ] Supabase JWT validation verified/configured (Manual - Step 5)
- [ ] Migrations verified/applied (Can check - Step 6)
- [ ] Test application in production

## Quick Commands

```bash
# Update local .env (already done)
./scripts/update-production-config.sh

# Deploy Edge Function
./scripts/deploy-edge-function.sh

# Check migration status
supabase link --project-ref auvtsvmtfrbpvgyvfqlx
supabase migration list

# Apply migrations if needed
./scripts/run-migrations-via-cli.sh
```

## Documentation

- Full manual steps: `docs/MANUAL_VERIFICATION_STEPS.md`
- Configuration status: `docs/CONFIGURATION_STATUS.md`
- Production deployment plan: `.cursor/plans/production_deployment_plan_81f63c0b.plan.md`

