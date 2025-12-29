# Manual Prerequisites Checklist

This is a step-by-step checklist of manual actions you need to complete before production deployment.

## Step 1: Get Clerk Production Credentials

### 1.1 Access Clerk Dashboard
- Go to [dashboard.clerk.com](https://dashboard.clerk.com)
- Sign in and select your application

### 1.2 Get Production Publishable Key
- Navigate to **API Keys** section
- Find the **Production** publishable key (starts with `pk_live_...`)
- Copy this key - you'll need it for Vercel

### 1.3 Get Clerk Domain
- Go to **Settings** → **Domains**
- Note your Clerk domain (e.g., `secure-tapir-36.clerk.accounts.dev`)
- You'll need this for Supabase JWT configuration

### 1.4 Get Clerk Application ID
- Go to **API Keys** section
- Find your **Application ID** (e.g., `clerk_xxxxxxxxxxxxx`)
- Copy this - you'll need it for Supabase JWT configuration

**✅ You should now have**:
- Clerk production publishable key: `pk_live_...`
- Clerk domain: `https://xxxxx.clerk.accounts.dev`
- Clerk application ID: `clerk_xxxxx`

---

## Step 2: Create Supabase Production Project

### 2.1 Create New Project
- Go to [app.supabase.com](https://app.supabase.com)
- Click **New Project**
- Name: `coinbag-production` (or your preferred name)
- Choose region (closest to your users or Vercel deployment region)
- Set a strong database password (save it securely)
- Click **Create new project**
- Wait for project to be created (2-3 minutes)

### 2.2 Get Production Credentials
- Once project is ready, go to **Project Settings** → **API**
- Copy **Project URL** (e.g., `https://xxxxx.supabase.co`)
- Copy **anon public** key (NOT the service role key)
- Save these securely

**✅ You should now have**:
- Supabase production URL: `https://xxxxx.supabase.co`
- Supabase production anon key: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

**⚠️ Important**: This is a **separate project** from your dev Supabase project.

---

## Step 3: Run Migrations on Production Supabase

### 3.1 Access SQL Editor
- In your production Supabase project, go to **SQL Editor**
- Click **New query**

### 3.2 Run Migrations in Order
Run each migration file from `supabase/migrations/` in this exact order:

1. Open `supabase/migrations/20251227120112_create_subscriptions_table.sql`
   - Copy all SQL content
   - Paste into Supabase SQL Editor
   - Click **Run** (or press Cmd/Ctrl + Enter)
   - Verify success message

2. Open `supabase/migrations/20251227120113_create_categories_table.sql`
   - Copy, paste, run
   - Verify success

3. Open `supabase/migrations/20251227120114_fix_subscriptions_user_id_type.sql`
   - Copy, paste, run
   - Verify success
   - ⚠️ **Critical**: This fixes RLS policies

4. Open `supabase/migrations/20251227130000_create_user_preferences_table.sql`
   - Copy, paste, run
   - Verify success

5. Open `supabase/migrations/20251228110046_create_assets_table.sql`
   - Copy, paste, run
   - Verify success

6. Open `supabase/migrations/20251228120000_add_cash_asset_type.sql`
   - Copy, paste, run
   - Verify success

7. Open `supabase/migrations/20251228130000_create_liabilities_table.sql`
   - Copy, paste, run
   - Verify success

8. Open `supabase/migrations/20251228140000_create_accounts_table.sql`
   - Copy, paste, run
   - Verify success

9. Open `supabase/migrations/20251228150000_create_income_table.sql`
   - Copy, paste, run
   - Verify success

10. Open `supabase/migrations/20251228160000_create_goals_table.sql`
    - Copy, paste, run
    - Verify success

11. Open `supabase/migrations/20251228170000_test_jwt_extraction_function.sql`
    - Copy, paste, run
    - Verify success

12. Open `supabase/migrations/20251228180000_data_recovery_fix_user_ids.sql`
    - Copy, paste, run
    - Verify success

### 3.3 Verify Tables Created
- Go to **Table Editor** in Supabase Dashboard
- Verify these tables exist:
  - `subscriptions`
  - `categories`
  - `user_preferences`
  - `assets`
  - `liabilities`
  - `accounts`
  - `income`
  - `goals`

**✅ All 12 migrations should be complete**

---

## Step 4: Configure Clerk JWT Validation in Supabase

### 4.1 Get Clerk JWKS URL
- Format: `https://<your-clerk-domain>/.well-known/jwks.json`
- Example: `https://secure-tapir-36.clerk.accounts.dev/.well-known/jwks.json`
- Use the Clerk domain from Step 1.3

### 4.2 Configure in Supabase Dashboard
- In your **production** Supabase project, go to **Authentication** → **Settings**
- Scroll down to **JWT Settings** or **JWKS URL** section
- Set **JWKS URL**: `https://<your-clerk-domain>/.well-known/jwks.json`
- Set **Issuer**: `https://<your-clerk-domain>`
- Set **Audience**: Your Clerk Application ID (from Step 1.4)
- Enable **JWT verification** (toggle should be ON)
- Click **Save**

**✅ JWT validation should now be configured**

---

## Step 5: Set Environment Variables in Vercel

### 5.1 Access Vercel Dashboard
- Go to [vercel.com](https://vercel.com)
- Sign in and select your project (or create new project if needed)

### 5.2 Add Production Environment Variables
- Go to **Project Settings** → **Environment Variables**
- Add each variable below, making sure to select **Production** environment:

#### Variable 1: `VITE_DATA_SOURCE`
- **Key**: `VITE_DATA_SOURCE`
- **Value**: `supabase`
- **Environment**: ✅ Production only
- Click **Save**

#### Variable 2: `VITE_SUPABASE_URL`
- **Key**: `VITE_SUPABASE_URL`
- **Value**: Your Supabase production URL from Step 2.2
  - Example: `https://xxxxx.supabase.co`
- **Environment**: ✅ Production only
- Click **Save**

#### Variable 3: `VITE_SUPABASE_ANON_KEY`
- **Key**: `VITE_SUPABASE_ANON_KEY`
- **Value**: Your Supabase production anon key from Step 2.2
  - Example: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
- **Environment**: ✅ Production only
- Click **Save**

#### Variable 4: `VITE_CLERK_PUBLISHABLE_KEY`
- **Key**: `VITE_CLERK_PUBLISHABLE_KEY`
- **Value**: Your Clerk production publishable key from Step 1.2
  - Example: `pk_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
- **Environment**: ✅ Production only
- Click **Save**

### 5.3 Verify Environment Variables
- Confirm all 4 variables are listed
- Confirm all are set for **Production** environment
- **Important**: Do NOT set these for Development or Preview (unless you want to use production Supabase for previews)

**✅ All 4 environment variables should be set in Vercel**

---

## Step 6: Verify Vercel Project Configuration

### 6.1 Check Build Settings
- Go to **Project Settings** → **General**
- Verify **Build Command**: `pnpm build` (or `npm run build`)
- Verify **Output Directory**: `dist`
- Verify **Install Command**: `pnpm install` (or `npm install`)

### 6.2 Check Deployment Settings
- Go to **Project Settings** → **Git**
- Verify **Production Branch**: `main` (or your production branch)
- Verify **Preview Deployments**: Enabled (optional but recommended)

**✅ Vercel project should be configured**

---

## Summary: What You've Completed

After completing all steps above, you should have:

✅ **Clerk Production**:
- Production publishable key (`pk_live_...`)
- Clerk domain
- Clerk application ID

✅ **Supabase Production**:
- Production project created
- All 12 migrations applied
- JWT validation configured
- Production URL and anon key

✅ **Vercel**:
- 4 environment variables set (Production scope)
- Project configured correctly

---

## Next Steps

Once all prerequisites are complete:

1. **I can create**:
   - Migration verification scripts
   - CRUD test checklists
   - Security headers configuration (`vercel.json`)
   - Build validation enhancements

2. **You can then**:
   - Deploy to Vercel (push to `main` branch or trigger deployment)
   - Run comprehensive CRUD tests
   - Verify security headers
   - Monitor for issues

---

## Troubleshooting

### Issue: Can't find Clerk production key
- **Solution**: Make sure you're looking at the **Production** tab in API Keys section, not Test

### Issue: Supabase migrations fail
- **Solution**: Run migrations one at a time, check error messages, verify previous migrations succeeded

### Issue: JWT validation not working
- **Solution**: Double-check JWKS URL format, issuer, and audience match exactly. Wait 2-5 minutes after saving for propagation.

### Issue: Environment variables not working in Vercel
- **Solution**: Make sure variables are set for **Production** environment, redeploy after adding variables

---

## Quick Reference: Environment Variables for Vercel

Copy-paste ready list:

```bash
# Set these in Vercel Dashboard → Project Settings → Environment Variables
# Make sure to select "Production" environment for each

VITE_DATA_SOURCE=supabase
VITE_SUPABASE_URL=https://your-production-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-production-anon-key-here
VITE_CLERK_PUBLISHABLE_KEY=pk_live_your-production-key-here
```

**Replace**:
- `your-production-project.supabase.co` with your actual Supabase URL
- `your-production-anon-key-here` with your actual Supabase anon key
- `pk_live_your-production-key-here` with your actual Clerk production key

