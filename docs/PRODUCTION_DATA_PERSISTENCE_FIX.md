# Production Data Persistence Fix

## Problem

User data was being lost on every production deployment because the application was defaulting to the mock repository, which stores data in memory and loses it on page refresh/build.

## Root Cause

The application defaults to `'mock'` repository when `VITE_DATA_SOURCE` environment variable is not set. In production builds, if this variable wasn't configured, the app would use mock storage, causing all data to be lost.

## Solution

Implemented comprehensive production guards to **prevent** the application from running in production without proper Supabase configuration:

### 1. Environment Validation (`src/lib/env.ts`)

- Added production mode detection
- Enhanced `validateEnvironment()` to:
  - **Block startup** in production if `VITE_DATA_SOURCE !== 'supabase'`
  - **Block startup** in production if Supabase credentials are missing
  - Show user-friendly error screen with configuration instructions
- Updated `getDataSource()` to throw error in production if Supabase not configured

### 2. Repository Factory Guards

Added production checks to **all** repository factories:
- `createAssetsRepository()`
- `createLiabilitiesRepository()`
- `createAccountsRepository()`
- `createIncomeRepository()`
- `createGoalsRepository()`
- `createSubscriptionsRepository()`
- `createCategoriesRepository()`

Each factory now:
- Detects production mode
- **Throws error** if trying to use mock repository in production
- Provides clear error message with fix instructions

### 3. Early Startup Validation (`src/main.tsx`)

- Added `validateEnvironment()` call before React mounts
- Blocks application startup if critical configuration errors detected
- Prevents React from rendering if configuration is invalid

### 4. Production Deployment Documentation

Created `docs/PRODUCTION_DEPLOYMENT.md` with:
- Required environment variables
- Pre-deployment checklist
- Platform-specific setup instructions
- Troubleshooting guide
- Security notes

## How It Works

### Development Mode
- Allows mock repository (for local development)
- Shows warnings but doesn't block
- Allows Supabase if configured

### Production Mode
- **REQUIRES** `VITE_DATA_SOURCE=supabase`
- **REQUIRES** `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- **BLOCKS** application startup if requirements not met
- Shows user-friendly error screen with instructions

## Required Production Environment Variables

```bash
VITE_DATA_SOURCE=supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_CLERK_PUBLISHABLE_KEY=pk_live_...
```

## Error Messages

If production configuration is invalid, users will see:

1. **Console errors** with specific missing configuration
2. **User-friendly error screen** with:
   - Clear explanation of the problem
   - List of required environment variables
   - Instructions for administrators

## Testing

To test production mode locally:

```bash
# Build in production mode
pnpm build

# Serve the production build
pnpm preview

# Should show error screen if Supabase not configured
```

## Migration Path

For existing deployments:

1. **Set environment variables** in your hosting platform:
   - `VITE_DATA_SOURCE=supabase`
   - `VITE_SUPABASE_URL=...`
   - `VITE_SUPABASE_ANON_KEY=...`

2. **Run database migrations** on your Supabase instance (if not already done)

3. **Configure Supabase JWT validation** for Clerk (see `docs/CLERK_SUPABASE_JWT_SETUP.md`)

4. **Redeploy** your application

5. **Verify** data persistence by creating test data and refreshing

## Benefits

- ✅ **Prevents data loss**: Application cannot run in production without persistence
- ✅ **Fail-fast**: Errors caught at startup, not after users lose data
- ✅ **Clear errors**: User-friendly error messages guide administrators
- ✅ **Comprehensive**: All repositories protected
- ✅ **Documentation**: Complete deployment guide provided

## Files Changed

- `src/lib/env.ts` - Enhanced validation with production checks
- `src/main.tsx` - Early validation before React mount
- `src/data/*/repo.ts` - Production guards in all repository factories
- `docs/PRODUCTION_DEPLOYMENT.md` - Complete deployment guide
- `src/lib/productionGuard.ts` - Helper utilities (created but not yet used everywhere)

## Next Steps

1. **Set environment variables** in your production hosting platform
2. **Verify Supabase configuration** (migrations, RLS, JWT)
3. **Test deployment** with production build
4. **Monitor** for any configuration errors

