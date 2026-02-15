# Vite Environment Variable Mode Behavior

## Overview

Vite loads environment variables from different files based on the **mode** (development vs production). Understanding this behavior is critical for proper dev/prod key segregation.

## Vite Environment File Precedence

Vite loads environment files in this order (highest to lowest priority):

1. `.env.[mode].local` (e.g., `.env.development.local`, `.env.production.local`)
2. `.env.local`
3. `.env.[mode]` (e.g., `.env.development`, `.env.production`)
4. `.env`

**Important**: Files with `.local` suffix are gitignored and take highest precedence.

## Mode Detection

### Development Mode
- **Trigger**: Running `vite dev` or `vite dev --mode development`
- **Loads**: `.env`, `.env.local`, `.env.development`, `.env.development.local`
- **Default**: When running `pnpm dev`

### Production Mode
- **Trigger**: Running `vite build` (default) OR `vite build --mode production`
- **Loads**: `.env`, `.env.local`, `.env.production`, `.env.production.local`
- **Default**: When running `pnpm build` or `pnpm build:prod`

**Critical**: `vite build` (without `--mode`) **automatically loads `.env.production`** because build is considered production by default.

## Current Build Scripts

### `pnpm build`
```bash
node scripts/validate-build-env.js && tsc --noEmit && vite build
```
- Uses `vite build` (default mode)
- ✅ **Loads `.env.production`** automatically
- Safe for production builds

### `pnpm build:prod`
```bash
VITE_DATA_SOURCE=supabase vite build --mode production
```
- Uses `vite build --mode production` (explicit mode)
- ✅ **Loads `.env.production`** explicitly
- More explicit, also safe for production builds

**Both scripts are safe** - they both load `.env.production` for production builds.

## Development Server

### `pnpm dev`
```bash
vite
```
- Uses development mode
- ✅ **Loads `.env`** (not `.env.production`)
- Correct for local development

## Environment File Strategy

### Recommended Structure

**For Development-First Approach** (current setup):
- `.env` - Development values (test Clerk key, DEV Supabase)
- `.env.production` - Production values (production Clerk key, PROD Supabase)
- `.env.local` - Optional local overrides (gitignored)

**For Production-First Approach**:
- `.env` - Production values (production Clerk key, PROD Supabase)
- `.env.development` - Development values (test Clerk key, DEV Supabase)
- `.env.local` - Optional local overrides (gitignored)

## Common Mistakes

### ❌ Mistake 1: Using Production Key in `.env`
**Problem**: Production keys don't work on localhost
**Error**: `Clerk: Production Keys are only allowed for domain "supafolio.app"`
**Fix**: Use test key (`pk_test_...`) in `.env`

### ❌ Mistake 2: Using Test Key in `.env.production`
**Problem**: Test keys shouldn't be used in production
**Error**: Build validation will fail
**Fix**: Use production key (`pk_live_...`) in `.env.production`

### ❌ Mistake 3: Relying on `.env.local` Override
**Problem**: `.env.local` can override `.env.production` during builds
**Fix**: Ensure `.env.local` doesn't contain production keys, or remove it

### ❌ Mistake 4: Not Understanding Mode Behavior
**Problem**: Expecting `.env.production` to load during `vite dev`
**Reality**: `.env.production` only loads during `vite build`
**Fix**: Use `.env` for development, `.env.production` for builds

## Vercel Environment Variables

**Important**: Vercel sets environment variables at **build time**, which **override** file-based config.

**Precedence** (highest to lowest):
1. Vercel Dashboard environment variables
2. `.env.production.local` (if exists)
3. `.env.production`
4. `.env.local`
5. `.env`

**Implication**: If Vercel has environment variables set, they take precedence over `.env.production`.

**Required Action**: Verify Vercel Dashboard has correct keys:
- Production builds: Production Clerk key (`pk_live_...`)
- Preview builds: Test Clerk key (`pk_test_...`) if applicable

## Verification

### Check Which Files Are Loaded

Run validation scripts:
```bash
# Check development environment
npx tsx scripts/validate-dev-env.ts

# Check build environment (simulates production)
NODE_ENV=production npx tsx scripts/validate-build-env.js
```

### Check Current Mode

In your code:
```typescript
console.log('Mode:', import.meta.env.MODE);
console.log('Is Production:', import.meta.env.PROD);
```

## Best Practices

1. **Never commit secrets**: Use `.env.local` for secrets (gitignored)
2. **Use mode-specific files**: `.env` for dev, `.env.production` for prod
3. **Validate at build time**: Use `scripts/validate-build-env.js`
4. **Validate at runtime**: Use `src/lib/env.ts` validation
5. **Document key locations**: Make it clear where to get keys
6. **Test both modes**: Verify dev and prod builds work correctly

## Troubleshooting

### Issue: Production key in development
**Symptom**: `Clerk: Production Keys are only allowed for domain "supafolio.app"`
**Fix**: Update `.env` with test key from Clerk Dashboard → Test tab

### Issue: Test key in production build
**Symptom**: Build validation fails with "Test Clerk key detected in production"
**Fix**: Update `.env.production` with production key from Clerk Dashboard → Production tab

### Issue: Wrong keys loaded
**Symptom**: App uses wrong environment
**Check**: 
1. Which mode is running? (`import.meta.env.MODE`)
2. Which files exist? (`.env`, `.env.production`, `.env.local`)
3. Vercel env vars? (Check Vercel Dashboard)

