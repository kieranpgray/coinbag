# Deployment Checklist

Use this checklist before deploying to production to ensure a successful deployment.

## Pre-Deployment Validation

### 1. TypeScript Validation

```bash
# Run type check
pnpm type-check

# Expected: ✅ No errors
# If errors exist: Fix before deploying
```

**Check**: All TypeScript errors resolved

### 2. Linting

```bash
# Run linter
pnpm lint

# Expected: ✅ No warnings or errors
# If errors exist: Fix before deploying
```

**Check**: Code passes linting

### 3. Tests

```bash
# Run test suite
pnpm test --run

# Expected: ✅ All tests pass
# If tests fail: Fix before deploying
```

**Check**: All tests pass

### 4. Build Validation

```bash
# Run production build locally
VITE_DATA_SOURCE=supabase \
VITE_SUPABASE_URL=https://your-project.supabase.co \
VITE_SUPABASE_ANON_KEY=your-key \
VITE_CLERK_PUBLISHABLE_KEY=pk_live_your-key \
pnpm build

# Expected: ✅ Build succeeds
# If build fails: Fix errors before deploying
```

**Check**: Production build succeeds locally

### 5. Environment Variables

Verify all required environment variables are set in Vercel:

- [ ] `VITE_DATA_SOURCE=supabase` (Production)
- [ ] `VITE_SUPABASE_URL` (Production)
- [ ] `VITE_SUPABASE_ANON_KEY` (Production)
- [ ] `VITE_CLERK_PUBLISHABLE_KEY` (Production - must be `pk_live_`)

**Check**: All environment variables configured

### 6. CI/CD Status

- [ ] GitHub Actions CI passes
- [ ] All checks green
- [ ] No blocking errors

**Check**: CI/CD pipeline passes

## TypeScript Error Resolution Guide

If TypeScript errors are found, follow this guide:

### Step 1: Identify Error Type

Check error code (e.g., `TS6133`, `TS18048`):

- **TS6133**: Unused declaration - Remove or prefix with `_`
- **TS18048**: Possibly undefined - Add null check or default
- **TS2345**: Type incompatibility - Fix type mismatch
- **TS7030**: Missing return - Add return statement
- **TS2395**: Merged declaration - Rename component/type
- **TS2304**: Cannot find name - Add missing import
- **TS2322**: Type assignment error - Fix type definition

### Step 2: Review Error Location

1. **File path**: Note which file has the error
2. **Line number**: Check the specific line
3. **Error message**: Read the full error message

### Step 3: Apply Fix Pattern

Refer to `docs/TYPESCRIPT_PATTERNS.md` for:
- Common patterns for your error type
- Code examples
- Best practices

### Step 4: Verify Fix

```bash
# Re-run type check
pnpm type-check

# Verify error is resolved
# Check for new errors introduced
```

### Step 5: Test

```bash
# Run build to ensure fix works
pnpm build

# Run tests if applicable
pnpm test --run
```

## Build Troubleshooting

### Build Fails with TypeScript Errors

**Symptoms**: Build fails with TypeScript compilation errors

**Solution**:
1. Run `pnpm type-check` to see all errors
2. Fix errors following `docs/TYPESCRIPT_PATTERNS.md`
3. Re-run build: `pnpm build`

### Build Fails with Environment Variable Errors

**Symptoms**: Build fails with "VITE_DATA_SOURCE must be 'supabase'" error

**Solution**:
1. Check Vercel environment variables
2. Ensure `VITE_DATA_SOURCE=supabase` is set for Production
3. Verify all required variables are set
4. Redeploy after fixing

### Build Succeeds but App Fails at Runtime

**Symptoms**: Build completes but app shows errors in browser

**Possible Causes**:
1. Missing environment variables in Vercel
2. Wrong Supabase project URL/key
3. Wrong Clerk key (using test instead of production)
4. Database migrations not applied

**Solution**:
1. Check browser console for errors
2. Verify environment variables in Vercel
3. Check Supabase project configuration
4. Verify Clerk production key is set
5. Check database migrations are applied

## Deployment Steps

### 1. Pre-Deployment

- [ ] All checks pass locally
- [ ] CI/CD passes
- [ ] Environment variables configured
- [ ] Database migrations applied (if needed)

### 2. Deploy

```bash
# Push to main branch (triggers Vercel deployment)
git push origin main

# Or deploy via Vercel CLI
vercel --prod
```

### 3. Post-Deployment

- [ ] Verify deployment succeeded in Vercel dashboard
- [ ] Check build logs for warnings
- [ ] Test application in production
- [ ] Verify data persistence
- [ ] Check browser console for errors

## Quick Reference

### Common Commands

```bash
# Full validation
pnpm type-check && pnpm lint && pnpm test --run && pnpm build

# Type check only
pnpm type-check

# Build check
pnpm build:check

# Production build
pnpm build:prod
```

### Error Resolution

1. **Read error message** - Understand what's wrong
2. **Check file/line** - Locate the issue
3. **Review patterns** - See `docs/TYPESCRIPT_PATTERNS.md`
4. **Apply fix** - Use appropriate pattern
5. **Verify** - Re-run checks

### Emergency Rollback

If deployment causes issues:

1. **Revert commit** in Git
2. **Redeploy** previous version
3. **Fix issues** in development
4. **Test thoroughly** before redeploying

## Support

If you encounter issues:

1. **Check documentation**: `docs/TYPESCRIPT_PATTERNS.md`
2. **Review build logs**: Vercel dashboard → Deployments → Logs
3. **Check CI logs**: GitHub Actions → Workflow runs
4. **Review error messages**: They often provide solutions

## Checklist Summary

Before deploying, ensure:

- ✅ TypeScript type check passes
- ✅ Linting passes
- ✅ Tests pass (if applicable)
- ✅ Build succeeds locally
- ✅ Environment variables configured
- ✅ CI/CD passes
- ✅ Database migrations applied (if needed)
- ✅ Manual testing completed

