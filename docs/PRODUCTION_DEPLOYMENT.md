# Production Deployment Guide

## Critical: Data Persistence Configuration

**⚠️ IMPORTANT**: This application **REQUIRES** Supabase to be configured in production. Without proper configuration, user data will be lost on every deployment.

## Required Environment Variables

The following environment variables **MUST** be set in your production environment:

```bash
# CRITICAL: Must be "supabase" in production
VITE_DATA_SOURCE=supabase

# Supabase Configuration (Required)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here

# Clerk Authentication (Required)
VITE_CLERK_PUBLISHABLE_KEY=pk_live_...
```

## Build-Time Environment Variables

**CRITICAL**: Vite replaces `VITE_*` environment variables at **build time**, not runtime. This means environment variables must be available during the build process, not just at runtime.

### Why This Matters

If `VITE_DATA_SOURCE` is not set during `pnpm build`, it defaults to `'mock'` and gets baked into the production bundle. The application will then use the mock repository (browser memory storage), causing all data to be lost on every page refresh or deployment.

### Local Production Build

When building locally for production, set all environment variables before running the build:

```bash
VITE_DATA_SOURCE=supabase \
VITE_SUPABASE_URL=https://your-project.supabase.co \
VITE_SUPABASE_ANON_KEY=your-anon-key \
VITE_CLERK_PUBLISHABLE_KEY=pk_live_... \
pnpm build
```

Or use the convenience script:

```bash
pnpm build:prod
```

### CI/CD Build

Set environment variables in your CI/CD platform **before** the build step:

#### GitHub Actions

```yaml
env:
  VITE_DATA_SOURCE: supabase
  VITE_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
  VITE_SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
  VITE_CLERK_PUBLISHABLE_KEY: ${{ secrets.CLERK_PUBLISHABLE_KEY }}

steps:
  - name: Build
    run: pnpm build
```

#### Vercel

1. Go to **Project Settings** → **Environment Variables**
2. Add all required variables
3. Ensure they're set for **Production**, **Preview**, and **Development** environments
4. Variables are automatically available during the build step

#### Netlify

1. Go to **Site Settings** → **Environment Variables**
2. Add all required variables
3. Ensure they're set for **Production** and **Deploy Previews**
4. Variables are automatically available during the build step

### Build Validation

The build script includes automatic validation that will fail if `VITE_DATA_SOURCE` is not set to `'supabase'` in production mode. This prevents accidentally deploying with mock repository.

If the build fails with:
```
❌ BUILD FAILED: VITE_DATA_SOURCE must be "supabase" in production
```

This means environment variables are not set correctly. Fix the environment variables and rebuild.

## Pre-Deployment Checklist

Before deploying to production, ensure:

- [ ] `VITE_DATA_SOURCE=supabase` is set in production environment
- [ ] `VITE_SUPABASE_URL` is set and points to your production Supabase project
- [ ] `VITE_SUPABASE_ANON_KEY` is set (use the **anon/public** key, not the service role key)
- [ ] All database migrations have been run on your production Supabase instance
- [ ] Supabase JWT validation is configured for Clerk (see `docs/CLERK_SUPABASE_JWT_SETUP.md`)
- [ ] Row Level Security (RLS) policies are enabled and tested
- [ ] Test data persistence: create data, logout, login, verify data persists

## Database Migrations

All migrations in `supabase/migrations/` must be applied to your production Supabase database:

1. Connect to your Supabase project dashboard
2. Navigate to SQL Editor
3. Run each migration file in order (by timestamp)
4. Verify tables exist: `assets`, `liabilities`, `accounts`, `income`, `subscriptions`, `goals`, `categories`

## Supabase JWT Configuration

For Clerk authentication to work with Supabase RLS:

1. Go to Supabase Dashboard → Authentication → URL Configuration
2. Set **JWKS URL**: `https://your-clerk-domain.clerk.accounts.dev/.well-known/jwks.json`
3. Set **Issuer**: `https://your-clerk-domain.clerk.accounts.dev`
4. Set **Audience**: Your Clerk application ID (found in Clerk Dashboard)

See `docs/CLERK_SUPABASE_JWT_SETUP.md` for detailed instructions.

## Platform-Specific Setup

### Vercel

1. Go to your project settings → Environment Variables
2. Add all required variables
3. Redeploy after adding variables

### Netlify

1. Go to Site settings → Environment variables
2. Add all required variables
3. Redeploy after adding variables

### Docker / Self-Hosted

Set environment variables in your container/hosting configuration:

```bash
export VITE_DATA_SOURCE=supabase
export VITE_SUPABASE_URL=https://your-project.supabase.co
export VITE_SUPABASE_ANON_KEY=your-anon-key
export VITE_CLERK_PUBLISHABLE_KEY=pk_live_...
```

## Verification

After deployment, verify:

1. **Application loads**: No error screen about configuration
2. **Data persists**: Create test data, refresh page, verify it's still there
3. **User isolation**: Logout, login with different user, verify data is separate
4. **Console logs**: Check browser console for any Supabase connection errors

## Troubleshooting

### Error: "CRITICAL: Cannot use mock repository in production"

**Cause**: `VITE_DATA_SOURCE` is not set to `supabase` in production.

**Fix**: Set `VITE_DATA_SOURCE=supabase` in your production environment variables and redeploy.

### Error: "VITE_SUPABASE_URL is required in production"

**Cause**: Supabase URL is not configured.

**Fix**: Add `VITE_SUPABASE_URL` to your production environment variables.

### Data Lost After Deployment

**Possible Causes**:
1. Using mock repository (check `VITE_DATA_SOURCE`)
2. Supabase credentials incorrect
3. Database migrations not run
4. RLS policies blocking access
5. JWT validation not configured

**Diagnosis**:
- Check browser console for errors
- Check Supabase logs in dashboard
- Run `scripts/diagnose-persistence.ts` (if available)
- Verify environment variables are set correctly

### Data Not Persisting Across Sessions

**Possible Causes**:
1. RLS policies not configured correctly
2. JWT validation failing
3. User ID not being extracted correctly

**Fix**: See `docs/CLERK_SUPABASE_JWT_SETUP.md` and `docs/E2E_VERIFICATION_GUIDE.md`

## Security Notes

- **Never** commit `.env` files with production credentials
- Use environment variables in your hosting platform
- The `VITE_SUPABASE_ANON_KEY` is safe to expose in client-side code (it's public)
- Never expose the Supabase service role key in client-side code
- Ensure RLS policies are properly configured to prevent unauthorized access

## Support

If data persistence issues persist:

1. Check Supabase dashboard logs
2. Review browser console errors
3. Verify all migrations are applied
4. Test JWT validation (see `scripts/test-jwt-validation.ts`)
5. Review `docs/E2E_VERIFICATION_GUIDE.md` for comprehensive testing

