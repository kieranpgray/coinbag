# Vercel Environment Variables Configuration

## Overview

Vercel sets environment variables at **build time**, which override file-based configuration (`.env.production`). This document explains how to properly configure Clerk keys in Vercel.

## Vercel Environment Variable Precedence

**Highest to Lowest**:
1. Vercel Dashboard environment variables (set per environment)
2. `.env.production.local` (if exists locally)
3. `.env.production` (if exists locally)
4. `.env.local` (if exists locally)
5. `.env` (if exists locally)

**Critical**: Vercel Dashboard env vars **always win** during builds, even if `.env.production` has different values.

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

### Preview Environment (Optional)

**Location**: Vercel Dashboard → Environment Variables → **Preview**

**Recommended Variables**:
```bash
VITE_DATA_SOURCE=supabase
VITE_SUPABASE_URL=https://tislabgxitwtcqfwrpik.supabase.co  # DEV project for previews
VITE_SUPABASE_ANON_KEY=<DEV-PUBLISHABLE-KEY>
VITE_CLERK_PUBLISHABLE_KEY=pk_test_<YOUR-TEST-KEY>  # Test key for previews
```

**Clerk Key**: Can use **test key** (`pk_test_...`) for preview deployments
- Get from: Clerk Dashboard → API Keys → **Test** tab
- No domain restrictions (works on any domain)

### Development Environment (Optional)

**Location**: Vercel Dashboard → Environment Variables → **Development**

**Note**: Usually not needed if using local `.env` file for development.

## How to Set in Vercel Dashboard

1. **Go to Vercel Dashboard**:
   - Navigate to: https://vercel.com/dashboard
   - Select your project: **wellthy**

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
2. Select project: **wellthy**
3. Go to: **Settings** → **Environment Variables**
4. Verify:
   - Production environment has `pk_live_...` key
   - Preview environment has `pk_test_...` key (if configured)

### Step 2: Check Build Logs

1. Go to: **Deployments** → Latest deployment → **Build Logs**
2. Look for validation messages:
   - ✅ `Clerk production key detected` (for production builds)
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

