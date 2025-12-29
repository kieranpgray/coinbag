# Production Deployment Status

## ✅ Completed

1. **GitHub Repository**: Created `coinbag` repository and pushed code
2. **Vercel Project**: Connected GitHub repository to Vercel
3. **Domain**: `coinbag.app` associated with Vercel project
4. **Clerk Production**: Clerk production instance configured with `coinbag.app`

## 🔄 Next Steps

### Step 1: Set Environment Variables in Vercel

Go to **Vercel Dashboard** → Your Project → **Settings** → **Environment Variables**

Add these 4 variables (select **Production** environment for each):

```bash
VITE_DATA_SOURCE=supabase
VITE_SUPABASE_URL=https://your-production-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-production-anon-key
VITE_CLERK_PUBLISHABLE_KEY=pk_live_your-production-key
```

**Replace with your actual values**:
- `your-production-project.supabase.co` → Your Supabase production URL
- `your-production-anon-key` → Your Supabase production anon key
- `pk_live_your-production-key` → Your Clerk production publishable key

### Step 2: Run Migrations on Production Supabase

1. Go to your **production Supabase project** dashboard
2. Navigate to **SQL Editor**
3. Run all 12 migrations in order (from `supabase/migrations/`):
   - `20251227120112_create_subscriptions_table.sql`
   - `20251227120113_create_categories_table.sql`
   - `20251227120114_fix_subscriptions_user_id_type.sql`
   - `20251227130000_create_user_preferences_table.sql`
   - `20251228110046_create_assets_table.sql`
   - `20251228120000_add_cash_asset_type.sql`
   - `20251228130000_create_liabilities_table.sql`
   - `20251228140000_create_accounts_table.sql`
   - `20251228150000_create_income_table.sql`
   - `20251228160000_create_goals_table.sql`
   - `20251228170000_test_jwt_extraction_function.sql`
   - `20251228180000_data_recovery_fix_user_ids.sql`

4. Verify tables exist in **Table Editor**

### Step 3: Configure Clerk JWT Validation in Supabase

1. Get your Clerk production JWKS URL:
   - Format: `https://<your-clerk-domain>/.well-known/jwks.json`
   - Example: `https://xxxxx.clerk.accounts.dev/.well-known/jwks.json`

2. In **production Supabase** → **Authentication** → **Settings**:
   - Set **JWKS URL**: Your Clerk JWKS URL
   - Set **Issuer**: Your Clerk domain (`https://xxxxx.clerk.accounts.dev`)
   - Set **Audience**: Your Clerk Application ID
   - Enable **JWT verification**
   - Save

### Step 4: Deploy to Vercel

Once environment variables are set:
1. Push to `main` branch (or trigger deployment in Vercel)
2. Vercel will automatically build and deploy
3. Your app will be live at `https://coinbag.app`

### Step 5: Verify Deployment

After deployment, verify:
- [ ] App loads at `https://coinbag.app`
- [ ] Can sign in with Clerk
- [ ] Can create data (asset, liability, etc.)
- [ ] Data persists after refresh
- [ ] User isolation works (test with 2 accounts)

## Quick Reference

**Repository**: https://github.com/kieranpgray/coinbag
**Production URL**: https://coinbag.app
**Clerk Dashboard**: https://dashboard.clerk.com
**Supabase Dashboard**: https://app.supabase.com
**Vercel Dashboard**: https://vercel.com

## Need Help?

See detailed guides:
- `docs/MANUAL_PREREQUISITES_CHECKLIST.md` - Complete step-by-step guide
- `docs/PRODUCTION_DEPLOYMENT.md` - Production deployment guide
- `docs/SECURITY_HARDENING.md` - Security configuration

