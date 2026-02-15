# Production Deployment Prerequisites

This document outlines what you need to provide to enable autonomous completion of the production deployment plan.

## What You Need to Provide (Manual Actions Required)

### 1. Clerk Production Credentials

**Action Required**: Get production publishable key from Clerk Dashboard

**Steps**:
1. Go to [dashboard.clerk.com](https://dashboard.clerk.com)
2. Select your application
3. Go to **API Keys** section
4. Copy the **Production** publishable key (starts with `pk_live_...`)

**Provide**:
- `CLERK_PRODUCTION_PUBLISHABLE_KEY`: `pk_live_...`
- `CLERK_PRODUCTION_DOMAIN`: Your Clerk domain (e.g., `secure-tapir-36.clerk.accounts.dev`)
- `CLERK_PRODUCTION_APPLICATION_ID`: Your Clerk application ID (for audience)

**Note**: Keep your test key (`pk_test_...`) - we'll continue using it for dev.

### 2. Supabase Production Project

**Action Required**: Create new Supabase project for production

**Steps**:
1. Go to [app.supabase.com](https://app.supabase.com)
2. Click **New Project**
3. Name: `supafolio-production` (or your preferred name)
4. Choose region (closest to your users or Vercel deployment region)
5. Set strong database password
6. Wait for project to be created

**Provide**:
- `SUPABASE_PRODUCTION_URL`: `https://xxxxx.supabase.co`
- `SUPABASE_PRODUCTION_ANON_KEY`: The anon/public key (NOT service role key)
- `SUPABASE_PRODUCTION_PASSWORD`: Database password (for reference, not code)

**Critical**: This must be a **separate project** from your dev Supabase project.

### 3. Vercel Project Access

**Action Required**: Ensure Vercel project exists and you have access

**Provide**:
- `VERCEL_PROJECT_NAME`: Your Vercel project name
- `VERCEL_DEPLOYMENT_URL`: Production URL (e.g., `supafolio.vercel.app`)

**Note**: If project doesn't exist yet, I can help create it, but you'll need Vercel account access.

## What I Can Do Automatically (Once Prerequisites Provided)

### Phase 1: Infrastructure Setup

**Can Automate**:
- ✅ Create migration runner script to apply all 12 migrations in order
- ✅ Create verification script to check all tables exist and RLS is enabled
- ✅ Create script to verify RLS policies use correct syntax (`auth.jwt() ->> 'sub'`)
- ✅ Create script to test JWT validation configuration
- ✅ Generate SQL verification queries for each table

**Requires Your Manual Action**:
- ❌ Run migrations in Supabase Dashboard SQL Editor (or provide Supabase API access)
- ❌ Configure Clerk JWT validation in Supabase Dashboard (requires dashboard access)

### Phase 2: Environment Variables

**Can Automate**:
- ✅ Create `.env.production.local` file with production variables
- ✅ Create script to validate environment variables before build
- ✅ Create script to verify dev environment unchanged
- ✅ Add Clerk key format validation to build script

**Requires Your Manual Action**:
- ❌ Set environment variables in Vercel Dashboard (or provide Vercel API token)

### Phase 3: CRUD & Permissions Verification

**Can Automate**:
- ✅ Create comprehensive CRUD test script
- ✅ Create RLS policy verification SQL queries
- ✅ Create user isolation test script
- ✅ Create automated test checklist document
- ✅ Create browser console test scripts

**Requires Your Manual Action**:
- ❌ Run CRUD tests manually in browser (can be semi-automated with Playwright if desired)
- ❌ Verify user isolation with two different accounts

### Phase 4: Deployment

**Can Automate**:
- ✅ Create deployment verification script
- ✅ Create post-deployment smoke test checklist
- ✅ Create rollback procedure documentation

**Requires Your Manual Action**:
- ❌ Trigger Vercel deployment (or provide Vercel API token for automation)
- ❌ Monitor deployment logs

## Prerequisites Summary

### Minimum Required (To Start)

1. **Clerk Production Key**: `pk_live_...`
2. **Clerk Production Domain**: Your Clerk domain
3. **Clerk Production Application ID**: For JWT audience
4. **Supabase Production URL**: `https://xxxxx.supabase.co`
5. **Supabase Production Anon Key**: Public anon key
6. **Vercel Project Name**: (or confirm it needs to be created)

### Optional But Helpful

- **Supabase API Access**: If you want me to run migrations programmatically
- **Vercel API Token**: If you want automated deployment
- **Two Test Accounts**: For user isolation testing

## What I'll Create (Automated)

Once prerequisites are provided, I will create:

1. **Migration Runner Script** (`scripts/run-production-migrations.ts`)
   - Applies all 12 migrations in order
   - Verifies each migration succeeded
   - Checks for errors

2. **Verification Scripts**:
   - `scripts/verify-production-setup.ts` - Checks all tables, RLS, policies
   - `scripts/test-production-crud.ts` - CRUD operation tests
   - `scripts/verify-rls-policies.ts` - RLS policy verification

3. **Environment Setup**:
   - `.env.production.local` template
   - Enhanced `scripts/validate-build-env.js` with Clerk key validation

4. **Documentation**:
   - `docs/PRODUCTION_CRUD_VERIFICATION.md` - Comprehensive test checklist
   - `docs/PRODUCTION_DEPLOYMENT.md` - Updated with Vercel instructions

5. **SQL Verification Queries**:
   - Pre-packaged SQL for testing JWT validation
   - SQL for verifying RLS policies
   - SQL for checking user isolation

## Quick Start Checklist

**Before I can proceed autonomously, please provide**:

- [ ] Clerk production publishable key (`pk_live_...`)
- [ ] Clerk production domain
- [ ] Clerk production application ID
- [ ] Supabase production project URL
- [ ] Supabase production anon key
- [ ] Confirmation: Vercel project exists (or needs creation)

**Once provided, I can**:
- ✅ Create all automation scripts
- ✅ Generate verification queries
- ✅ Set up local production testing
- ✅ Create comprehensive test checklists
- ✅ Prepare deployment documentation

**You'll still need to**:
- Run migrations in Supabase Dashboard (or provide API access)
- Configure Clerk JWT validation in Supabase Dashboard
- Set environment variables in Vercel Dashboard (or provide API token)
- Run final CRUD tests in browser

## Alternative: Full Automation

If you want **full automation** (no manual dashboard steps), provide:

1. **Supabase Service Role Key** (for programmatic migrations)
   - ⚠️ **Security Note**: This is powerful - use with caution
   - Allows me to run migrations via API
   - Never expose in client code

2. **Vercel API Token** (for automated deployment)
   - Allows me to trigger deployments
   - Set environment variables programmatically

3. **Clerk API Key** (optional, for user management)
   - Only if you want automated test user creation

**Recommendation**: Start with manual dashboard steps for safety, then automate later if desired.

## Next Steps

1. **Provide prerequisites** (see checklist above)
2. **I'll create all automation scripts and documentation**
3. **You run migrations and configure JWT validation** (or provide API access)
4. **I'll verify everything is set up correctly**
5. **You deploy to Vercel** (or I automate if token provided)
6. **We verify together** using the test checklists

## Questions?

If you're unsure about any prerequisite:
- **Clerk**: Check your Clerk Dashboard → API Keys
- **Supabase**: Check your Supabase Dashboard → Project Settings → API
- **Vercel**: Check your Vercel Dashboard → Project Settings

