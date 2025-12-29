# Production Configuration Review

**Date**: $(date)  
**Reviewer**: Automated Configuration Check

## Executive Summary

This document provides a comprehensive review of Supabase, Vercel, and Clerk production configuration. Issues found are documented with fixes applied autonomously where possible.

---

## 1. Supabase Configuration

### ✅ Status: Configured

**Project**: coinbag (auvtsvmtfrbpvgyvfqlx)  
**Region**: Oceania (Sydney)  
**Status**: Active and linked

### Environment Variables

| Variable | Status | Value |
|----------|--------|-------|
| `VITE_SUPABASE_URL` | ⚠️ **ISSUE** | Currently pointing to `moneybags` project instead of `coinbag` |
| `VITE_SUPABASE_ANON_KEY` | ✅ Set | Configured (208 chars) |

### Issues Found

1. **❌ Wrong Supabase Project**
   - **Current**: Using `moneybags` project (`tislabgxitwtcqfwrpik`)
   - **Expected**: Should use `coinbag` project (`auvtsvmtfrbpvgyvfqlx`)
   - **Impact**: Data will be stored in wrong project
   - **Fix**: Update `VITE_SUPABASE_URL` to point to coinbag project

### Required Actions

- [ ] Update `.env` to use coinbag Supabase project URL
- [ ] Update Vercel environment variables to use coinbag project
- [ ] Verify migrations are applied to coinbag project (not moneybags)
- [ ] Verify JWT validation is configured in coinbag project

---

## 2. Vercel Configuration

### ✅ Status: Project Linked

**Project**: wellthy  
**URL**: https://coinbag-kieranpgrays-projects.vercel.app  
**Status**: Linked to GitHub repository

### Build Configuration

- **Build Command**: `vite build` ✅
- **Output Directory**: `dist` ✅
- **Install Command**: `pnpm install` ✅

### Environment Variables (Vercel Dashboard)

**Status**: ⚠️ **NEEDS VERIFICATION**

Required variables for production:
- `VITE_DATA_SOURCE=supabase` - **MUST BE SET**
- `VITE_SUPABASE_URL` - **MUST BE SET** (should point to coinbag project)
- `VITE_SUPABASE_ANON_KEY` - **MUST BE SET**
- `VITE_CLERK_PUBLISHABLE_KEY` - **MUST BE SET** (should be production key)

### Issues Found

1. **⚠️ Cannot verify Vercel env vars automatically**
   - Need to check Vercel Dashboard manually
   - CLI doesn't show values for security reasons

### Required Actions

- [ ] Verify all 4 required env vars are set in Vercel Dashboard
- [ ] Ensure `VITE_DATA_SOURCE=supabase` is set for Production environment
- [ ] Ensure `VITE_SUPABASE_URL` points to coinbag project (not moneybags)
- [ ] Ensure `VITE_CLERK_PUBLISHABLE_KEY` is production key (pk_live_)
- [ ] Redeploy after updating environment variables

---

## 3. Clerk Configuration

### ✅ Status: Partially Configured

### Environment Variables

| Variable | Status | Value |
|----------|--------|-------|
| `VITE_CLERK_PUBLISHABLE_KEY` | ⚠️ **ISSUE** | Using TEST key (`pk_test_`) instead of PRODUCTION (`pk_live_`) |
| `CLERK_SECRET_KEY` | ✅ Correct | Using PRODUCTION key (`sk_live_`) |

### Issues Found

1. **❌ Using Test Publishable Key**
   - **Current**: `pk_test_...` (test/development key)
   - **Expected**: `pk_live_...` (production key)
   - **Impact**: May cause authentication issues in production
   - **Fix**: Update to production publishable key

### Required Actions

- [ ] Get production publishable key from Clerk Dashboard
- [ ] Update `.env` with `VITE_CLERK_PUBLISHABLE_KEY=pk_live_...`
- [ ] Update Vercel environment variable with production key
- [ ] Verify Clerk domain matches production setup

---

## 4. Integration Configuration

### Clerk ↔ Supabase JWT Integration

**Status**: ⚠️ **NEEDS VERIFICATION**

### Required Configuration

For RLS policies to work, Supabase must validate Clerk JWTs:

1. **JWKS URL**: `https://<clerk-domain>/.well-known/jwks.json`
2. **Issuer**: `https://<clerk-domain>`
3. **Audience**: Clerk Application ID

### Verification Steps

1. Go to Supabase Dashboard → Authentication → Settings
2. Check if JWKS URL is configured
3. Verify issuer matches Clerk domain
4. Test JWT extraction: `SELECT test_jwt_extraction();`

### Required Actions

- [ ] Verify JWT validation is configured in coinbag Supabase project
- [ ] Test JWT extraction function
- [ ] Verify RLS policies work with Clerk JWTs

---

## 5. Database Migrations

### Status: ⚠️ **NEEDS VERIFICATION**

### Required Migrations

All migrations in `supabase/migrations/` must be applied:

1. `20251227120112_create_subscriptions_table.sql`
2. `20251227120113_create_categories_table.sql`
3. `20251227120114_fix_subscriptions_user_id_type.sql`
4. `20251227130000_create_user_preferences_table.sql`
5. `20251228110046_create_assets_table.sql`
6. `20251228120000_add_cash_asset_type.sql`
7. `20251228130000_create_liabilities_table.sql`
8. `20251228140000_create_accounts_table.sql`
9. `20251228150000_create_income_table.sql`
10. `20251228160000_create_goals_table.sql`
11. `20251228170000_test_jwt_extraction_function.sql`
12. `20251228180000_data_recovery_fix_user_ids.sql`

### Required Actions

- [ ] Verify all 12 migrations are applied to coinbag project
- [ ] Check that tables exist in Supabase Dashboard → Table Editor
- [ ] Verify RLS policies are enabled on all tables

---

## 6. Critical Issues Summary

### 🔴 Critical (Must Fix Before Production)

1. **Wrong Supabase Project**
   - Currently using `moneybags` instead of `coinbag`
   - **Fix**: Update `VITE_SUPABASE_URL` in `.env` and Vercel

2. **Using Test Clerk Key**
   - `VITE_CLERK_PUBLISHABLE_KEY` is `pk_test_` instead of `pk_live_`
   - **Fix**: Update to production publishable key

### ⚠️ High Priority (Verify Before Production)

3. **Vercel Environment Variables**
   - Cannot verify automatically
   - **Action**: Manually verify all 4 required vars are set

4. **JWT Validation**
   - Cannot verify automatically
   - **Action**: Verify JWT validation is configured in Supabase

5. **Database Migrations**
   - Cannot verify automatically
   - **Action**: Verify all migrations are applied to coinbag project

---

## 7. Fixes Applied

### Automatic Fixes

1. ✅ **Vercel Project Linked**
   - Linked local project to Vercel
   - Created `.vercel/project.json`

2. ✅ **Documentation Created**
   - Created this review document
   - Documented all issues found

### Manual Fixes Required

1. **Update Supabase Project URL**
   ```bash
   # In .env file, change:
   VITE_SUPABASE_URL=https://auvtsvmtfrbpvgyvfqlx.supabase.co
   ```

2. **Update Clerk Production Key**
   ```bash
   # In .env file, change:
   VITE_CLERK_PUBLISHABLE_KEY=pk_live_<your-production-key>
   ```

3. **Update Vercel Environment Variables**
   - Go to Vercel Dashboard → Project Settings → Environment Variables
   - Update `VITE_SUPABASE_URL` to coinbag project
   - Update `VITE_CLERK_PUBLISHABLE_KEY` to production key
   - Ensure `VITE_DATA_SOURCE=supabase` is set

---

## 8. Verification Checklist

After applying fixes, verify:

- [ ] `.env` file uses coinbag Supabase project
- [ ] `.env` file uses production Clerk publishable key
- [ ] Vercel environment variables match `.env` values
- [ ] All migrations applied to coinbag project
- [ ] JWT validation configured in Supabase
- [ ] Test data persists after refresh
- [ ] Production deployment succeeds
- [ ] No console errors in production

---

## 9. Next Steps

1. **Fix Critical Issues** (see section 7)
2. **Verify Vercel Environment Variables** (manual check)
3. **Verify Supabase Configuration** (manual check)
4. **Test Production Deployment**
5. **Monitor for Issues**

---

## 10. Support Resources

- **Supabase Setup**: `docs/SUPABASE_SETUP.md`
- **Clerk Setup**: `docs/CLERK_SETUP.md`
- **JWT Configuration**: `docs/CLERK_SUPABASE_JWT_SETUP.md`
- **Production Deployment**: `docs/PRODUCTION_DEPLOYMENT.md`
- **Migration Guide**: `docs/MANUAL_PREREQUISITES_CHECKLIST.md`

