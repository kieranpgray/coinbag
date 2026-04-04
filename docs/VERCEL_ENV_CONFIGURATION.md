# Vercel Environment Variables Configuration

## Overview

Vercel sets environment variables at **build time**, which override file-based configuration (`.env.production`). This document explains how to properly configure Clerk keys in Vercel.

## Production Source of Truth

- `main`/production builds must use Vercel Dashboard variables in the **Production** scope.
- `.env`, `.env.local`, and `.env.production` are not trusted for production deployments.
- Build validation enforces this contract during production Vercel builds (`VERCEL=1` + `VERCEL_ENV=production`).

## Vercel Environment Variable Precedence

**Highest to Lowest**:
1. Vercel Dashboard environment variables (set per environment)
2. `.env.production.local` (if exists locally)
3. `.env.production` (if exists locally)
4. `.env.local` (if exists locally)
5. `.env` (if exists locally)

**Critical**: Vercel Dashboard env vars **always win** during builds, even if `.env.production` has different values.

## Which project builds?

Production builds and env vars must come from the **supafolio** Vercel project. If the **wellthy** project is the one building (e.g. you see deployments under wellthy when you push), that project will not have your Production env vars and the build will fail with `VITE_DATA_SOURCE` missing.

**Ensure only supafolio builds (wellthy must not be used):**

1. **Disable wellthy builds:** In Vercel Dashboard, open the **wellthy** project → **Settings** → **Git** → **Ignored Build Step**. Set to `./scripts/check-build.sh` (recommended) or `exit 1`. Save. See [DISABLE_WELLTHY_DEPLOYMENT.md](DISABLE_WELLTHY_DEPLOYMENT.md).
2. **Supafolio builds:** Open the **supafolio** project → **Settings** → **Git**. Confirm it is linked to your repo. Leave **Ignored Build Step** empty (or `grep -q '"name": "supafolio"' package.json`).
3. **Env vars:** Set all required Production env vars in the **supafolio** project only (Settings → Environment Variables → Production).

If builds still fail, check which project is building: **Deployments** → open the failed deployment → confirm the project name is **supafolio**. If it shows **wellthy**, the wellthy project is still building; set its Ignored Build Step as in step 1.

## Required Configuration

### Production Environment

**Location**: Vercel Dashboard → Project Settings → Environment Variables → **Production**

**Required Variables**:
```bash
VITE_DATA_SOURCE=supabase
VITE_SUPABASE_URL=https://auvtsvmtfrbpvgyvfqlx.supabase.co
VITE_SUPABASE_ANON_KEY=<PROD-PUBLISHABLE-KEY>
VITE_CLERK_PUBLISHABLE_KEY=pk_live_<YOUR-PRODUCTION-KEY>
```

**Clerk Key**: Must be **production key** (`pk_live_...`)
- Get from: Clerk Dashboard → API Keys → **Production** tab
- Domain restriction: Only works on `supafolio.app` and subdomains

### Production Acceptance Matrix

When `VERCEL=1` and `VERCEL_ENV=production`, the build must fail if any of these checks are not met:

| Variable | Requirement |
| --- | --- |
| `VITE_DATA_SOURCE` | Must equal `supabase` |
| `VITE_SUPABASE_URL` | Must be present and match `https://<project-id>.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Must be present |
| `VITE_CLERK_PUBLISHABLE_KEY` | Must start with `pk_live_` |

Preview and local builds are allowed to use non-production keys/config unless explicitly forced into production mode.

### Preview Environment (Optional)

**Location**: Vercel Dashboard → Environment Variables → **Preview**

**Recommended Variables**:
```bash
VITE_DATA_SOURCE=supabase
VITE_SUPABASE_URL=https://tislabgxitwtcqfwrpik.supabase.co  # DEV project for previews
VITE_SUPABASE_ANON_KEY=<DEV-PUBLISHABLE-KEY>
VITE_CLERK_PUBLISHABLE_KEY=pk_test_<YOUR-TEST-KEY>  # Test key for previews
VITE_ENABLE_ACCOUNT_MENU_V2=true
```

**Clerk Key**: Can use **test key** (`pk_test_...`) for preview deployments
- Get from: Clerk Dashboard → API Keys → **Test** tab
- No domain restrictions (works on any domain)

### Account Menu V2 Feature Flag

This flag controls:
- account dropdown menu (`UserAccountMenu`)
- profile photo upload/remove UI in Settings
- team avatar enrichment via `workspace-member-profiles`

`VITE_ENABLE_ACCOUNT_MENU_V2` behavior:
- `true`: enable the new account menu/profile/team avatar flow
- `false` or unset: use legacy workspace switcher path and initials-only team list

Recommended rollout:
- **Preview**: set `VITE_ENABLE_ACCOUNT_MENU_V2=true` to test the full flow
- **Production**: leave unset/false until preview QA passes

If Preview should exercise team avatars, make sure `workspace-member-profiles` is deployed to the Supabase project configured by `VITE_SUPABASE_URL` for Preview.

### Development Environment (Optional)

**Location**: Vercel Dashboard → Environment Variables → **Development**

**Note**: Usually not needed if using local `.env` file for development.

## How to Set in Vercel Dashboard

1. **Go to Vercel Dashboard**:
   - Navigate to: https://vercel.com/dashboard
   - Select your project: **supafolio** (not wellthy — see "Which project builds?" below)

2. **Navigate to Environment Variables**:
   - Go to: **Settings** → **Environment Variables**

3. **Add/Update Variables**:
   - Click **Add New** or edit existing variable
   - Enter the **Key** (e.g., `VITE_CLERK_PUBLISHABLE_KEY`)
   - Enter the **Value** (e.g., `pk_live_...`)
   - Select environment(s):
     - ✅ **Production** (required)
     - ⚠️ **Preview** (optional, can use test key)
     - ⚠️ **Development** (optional, usually not needed)

4. **Save and Redeploy**:
   - Click **Save**
   - Trigger a new deployment (push to main or manually redeploy)

## Verification Steps

### Step 1: Check Vercel Dashboard

1. Go to: https://vercel.com/dashboard
2. Select project: **supafolio**
3. Go to: **Settings** → **Environment Variables**
4. Verify:
   - Production environment has `pk_live_...` key
   - Preview environment has `pk_test_...` key (if configured)

### Step 2: Check Build Logs

1. Go to: **Deployments** → Latest deployment → **Build Logs**
2. Look for validation messages:
   - `strictProductionGate=true` (production contract active)
   - ✅ `Clerk production key detected` (for production builds)
   - ✅ `Production environment contract validated`
   - ❌ `Test Clerk key detected in production` (indicates misconfiguration)

### Step 3: Test Production Deployment

1. Deploy to production
2. Check browser console for Clerk errors
3. Verify authentication works
4. Check for domain restriction errors

## Common Issues

### Issue: Production Build Uses Test Key

**Symptom**: Build validation fails or production uses test key
**Cause**: Vercel Production environment has test key set
**Fix**: 
1. Go to Vercel Dashboard → Environment Variables
2. Find `VITE_CLERK_PUBLISHABLE_KEY` in **Production** environment
3. Update to production key (`pk_live_...`)
4. Redeploy

### Issue: Preview Build Uses Production Key

**Symptom**: Preview deployments fail with domain restriction errors
**Cause**: Vercel Preview environment has production key set
**Fix**:
1. Go to Vercel Dashboard → Environment Variables
2. Find `VITE_CLERK_PUBLISHABLE_KEY` in **Preview** environment
3. Update to test key (`pk_test_...`) OR remove (will use `.env.production` if exists)
4. Redeploy

### Issue: Local Build Differs from Vercel

**Symptom**: Local production build works, but Vercel build fails
**Cause**: Vercel env vars override local `.env.production`
**Fix**: Ensure Vercel Dashboard has correct keys for each environment

### Issue: Missing Production Variables in Vercel

**Symptom**: Build fails with `Missing required Vercel Production environment variables`
**Cause**: One or more required keys are unset in Vercel Production scope
**Fix**:
1. Go to Vercel Dashboard → Project → Settings → Environment Variables
2. Filter by **Production**
3. Set missing keys exactly as listed in the acceptance matrix
4. Redeploy from `main`

## Best Practices

1. **Separate Environments**: Use different keys for Production vs Preview
2. **Document Keys**: Keep track of which keys are used where
3. **Verify Before Deploy**: Check Vercel env vars match expected values
4. **Test Previews**: Use test keys for preview deployments (safer)
5. **Monitor Build Logs**: Check validation messages in deployment logs

## Security Notes

- ✅ Vercel Dashboard env vars are encrypted at rest
- ✅ Only project members with access can view/edit
- ✅ Never commit production keys to git
- ✅ Rotate keys periodically
- ✅ Use test keys for preview/staging environments when possible

## Migration Checklist

When migrating from file-based to Vercel env vars:

- [ ] Get production Clerk key from Clerk Dashboard
- [ ] Set `VITE_CLERK_PUBLISHABLE_KEY` in Vercel Production environment
- [ ] Get test Clerk key from Clerk Dashboard (for previews)
- [ ] Set `VITE_CLERK_PUBLISHABLE_KEY` in Vercel Preview environment (optional)
- [ ] Verify all other required env vars are set
- [ ] Test production deployment
- [ ] Test preview deployment (if applicable)
- [ ] Document which keys are used where

## Incident Rollback Runbook

If a production deployment is blocked by env validation:

1. Confirm detected context in logs (`vercel=1`, `vercelEnv=production`, `strictProductionGate=true`)
2. Fix Production-scoped variables in Vercel Dashboard (do not patch `.env` files as a production workaround)
3. Redeploy `main`
4. Confirm logs show:
   - `Build validation passed: VITE_DATA_SOURCE=supabase`
   - `Clerk production key detected`
   - `Production environment contract validated`

