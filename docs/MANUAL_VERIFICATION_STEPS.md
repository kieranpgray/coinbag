# Manual Verification Steps for Production Deployment

## Step 1: Verify Vercel Environment Variables

**Location**: [Vercel Dashboard](https://vercel.com/dashboard) → Your Project → Settings → Environment Variables

**Verify these 4 variables have the correct values**:

1. **VITE_SUPABASE_URL**
   - **Should be**: `https://auvtsvmtfrbpvgyvfqlx.supabase.co`
   - **Current**: Check in Vercel Dashboard
   - **Action**: Update if different

2. **VITE_SUPABASE_ANON_KEY**
   - **Should be**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF1dnRzdm10ZnJicHZneXZmcWx4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY5NzAwMTcsImV4cCI6MjA4MjU0NjAxN30.OLKiOD4K2nt8u5OFTNiFJc8UzzrkI6SllbscJMaEpBQ`
   - **Current**: Check in Vercel Dashboard
   - **Action**: Update if different

3. **VITE_CLERK_PUBLISHABLE_KEY**
   - **Should be**: `pk_live_Y2xlcmsuY29pbmJhZy5hcHAk`
   - **Current**: Check in Vercel Dashboard
   - **Action**: Update if different

4. **VITE_DATA_SOURCE**
   - **Should be**: `supabase`
   - **Current**: Check in Vercel Dashboard
   - **Action**: Update if different

**After updating**: Redeploy the application (push to main branch or use Vercel Dashboard redeploy)

---

## Step 2: Set Edge Function Environment Variables

**Location**: [Supabase Dashboard](https://app.supabase.com/project/auvtsvmtfrbpvgyvfqlx) → Edge Functions → process-statement → Settings → Environment Variables

**Set these 3 variables**:

1. **MISTRAL_API_KEY**
   - **Value**: `jJnyzvYcruSTj50bTqAEXlGl0rmxiXDm`

2. **SUPABASE_ANON_KEY**
   - **Value**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF1dnRzdm10ZnJicHZneXZmcWx4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY5NzAwMTcsImV4cCI6MjA4MjU0NjAxN30.OLKiOD4K2nt8u5OFTNiFJc8UzzrkI6SllbscJMaEpBQ`

3. **SUPABASE_URL**
   - **Value**: `https://auvtsvmtfrbpvgyvfqlx.supabase.co`

**Note**: These must be set AFTER deploying the Edge Function (see Step 3)

---

## Step 3: Deploy Edge Function

**Option A: Using Script** (Recommended):
```bash
chmod +x scripts/deploy-edge-function.sh
./scripts/deploy-edge-function.sh
```

**Option B: Manual CLI**:
```bash
# Link to project (if not already linked)
supabase link --project-ref auvtsvmtfrbpvgyvfqlx

# Deploy function
supabase functions deploy process-statement
```

**After deployment**: Set environment variables (Step 2)

---

## Step 4: Verify Clerk JWT Template

**Location**: [Clerk Dashboard](https://dashboard.clerk.com) → JWT Templates

**Check if template exists**:
- Template name: `supabase` (lowercase, exactly)
- Algorithm: `HS256`
- Signing Key: Should match Supabase JWT Secret

**If template doesn't exist**, create it:
1. Click "New template"
2. Name: `supabase`
3. Algorithm: `HS256`
4. Signing Key: Get from Supabase Dashboard → Project Settings → API → JWT Secret
5. Lifetime: `3600` seconds
6. Claims:
   ```json
   {
     "sub": "{{user.id}}",
     "role": "authenticated",
     "aud": "ins_37VAGQw0JVza01qpTa6yUt8iVLY",
     "iss": "https://clerk.supafolio.app",
     "exp": "{{date.now_plus_seconds(3600)}}",
     "iat": "{{date.now}}"
   }
   ```

---

## Step 5: Verify Supabase JWT Validation

**Location**: [Supabase Dashboard](https://app.supabase.com/project/auvtsvmtfrbpvgyvfqlx) → Authentication → Settings

**Check configuration**:
- **JWKS URL**: `https://clerk.supafolio.app/.well-known/jwks.json`
- **Issuer**: `https://clerk.supafolio.app`
- **Audience**: `ins_37VAGQw0JVza01qpTa6yUt8iVLY`
- JWT verification: Enabled

**If not configured**, set these values and save.

---

## Step 6: Check Migration Status

**Using Supabase CLI**:
```bash
supabase link --project-ref auvtsvmtfrbpvgyvfqlx
supabase migration list
```

**Or check in Dashboard**:
- Go to Supabase Dashboard → Table Editor
- Verify these tables exist:
  - `expenses`
  - `categories`
  - `assets`
  - `liabilities`
  - `accounts`
  - `income`
  - `goals`
  - `user_preferences`
  - `transactions`
  - `statement_imports`
  - `ocr_results`

**If migrations are missing**: Run `./scripts/run-migrations-via-cli.sh`

---

## Summary Checklist

- [ ] Vercel environment variables verified/updated
- [ ] Edge Function deployed
- [ ] Edge Function environment variables set
- [ ] Clerk JWT template verified/created
- [ ] Supabase JWT validation verified/configured
- [ ] Migrations verified/applied
- [ ] Test application in production

