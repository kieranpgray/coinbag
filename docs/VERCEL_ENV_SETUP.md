# Vercel Environment Variables Setup Guide

## ⚠️ CRITICAL: No Environment Variables Found

**Status**: Vercel project has **ZERO** environment variables configured.

This means production builds will **FAIL** or use **MOCK** data repository, causing **DATA LOSS**.

## Required Environment Variables

You **MUST** set these 4 variables in Vercel Dashboard:

### 1. VITE_DATA_SOURCE
```
Key: VITE_DATA_SOURCE
Value: supabase
Environment: Production, Preview, Development
```

**Why**: Without this, the app uses mock repository and data is lost on every refresh.

### 2. VITE_SUPABASE_URL
```
Key: VITE_SUPABASE_URL
Value: https://auvtsvmtfrbpvgyvfqlx.supabase.co
Environment: Production, Preview, Development
```

**Why**: Points to your coinbag Supabase project. Currently `.env` points to wrong project (moneybags).

### 3. VITE_SUPABASE_ANON_KEY
```
Key: VITE_SUPABASE_ANON_KEY
Value: <your-coinbag-project-anon-key>
Environment: Production, Preview, Development
```

**Why**: Required for Supabase authentication. Get from Supabase Dashboard → Project Settings → API.

**⚠️ Important**: Use the anon/public key from the **coinbag** project, not moneybags.

### 4. VITE_CLERK_PUBLISHABLE_KEY
```
Key: VITE_CLERK_PUBLISHABLE_KEY
Value: pk_live_<your-production-key>
Environment: Production, Preview, Development
```

**Why**: Required for Clerk authentication. Currently using test key (`pk_test_`), must use production (`pk_live_`).

**⚠️ Important**: Get production key from Clerk Dashboard → API Keys → Production tab.

## How to Set in Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project: **wellthy**
3. Go to **Settings** → **Environment Variables**
4. Click **Add New**
5. For each variable:
   - Enter the **Key**
   - Enter the **Value**
   - Select **Production**, **Preview**, and **Development** environments
   - Click **Save**
6. **Redeploy** after adding variables (or push to main branch)

## Quick Setup Commands

After setting variables in Vercel Dashboard, trigger a redeploy:

```bash
# Option 1: Push to main branch
git push origin main

# Option 2: Deploy via CLI
vercel --prod
```

## Verification

After setting variables and redeploying:

1. Check build logs in Vercel Dashboard
2. Verify no "mock repository" warnings
3. Test data persistence in production
4. Check browser console for errors

## Current Issues

1. ❌ **No environment variables set in Vercel**
2. ❌ **Wrong Supabase project in .env** (moneybags instead of coinbag)
3. ❌ **Using test Clerk key** (pk_test_ instead of pk_live_)

## Fix Priority

1. **CRITICAL**: Set all 4 variables in Vercel Dashboard
2. **HIGH**: Update `.env` to use coinbag project
3. **HIGH**: Update `.env` to use production Clerk key
4. **MEDIUM**: Verify Supabase migrations are applied to coinbag project
5. **MEDIUM**: Verify JWT validation is configured in coinbag project

