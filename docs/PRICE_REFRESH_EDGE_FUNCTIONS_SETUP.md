# Price Refresh Edge Functions — Setup Guide

Step-by-step instructions for deploying and configuring the `refresh-prices` and `manual-refresh` Edge Functions. Based on [Supabase Edge Functions docs](https://supabase.com/docs/guides/functions/quickstart).

---

## Prerequisites

1. **Supabase CLI** — Install from [CLI installation guide](https://supabase.com/docs/guides/cli):

   ```bash
   npm install supabase --save-dev
   # or: brew install supabase/tap/supabase
   ```

2. **Linked project** — Your local project must be linked to your remote Supabase project.

---

## Step 1: Authenticate and link project

1. Log in to the Supabase CLI:

   ```bash
   supabase login
   ```

2. List your projects to get the project ID:

   ```bash
   supabase projects list
   ```

3. Link your local project (run from your project root):

   ```bash
   supabase link --project-ref YOUR_PROJECT_ID
   ```

   Replace `YOUR_PROJECT_ID` with the ID from step 2.

**Docs:** [Getting Started — Step 5](https://supabase.com/docs/guides/functions/quickstart#step-5-connect-to-your-supabase-project)

---

## Step 2: Set PRICE_REFRESH_CRON_SECRET

The `refresh-prices` function requires `PRICE_REFRESH_CRON_SECRET` in the request header. Generate a secure value and store it as a Supabase secret.

### Option A: Using the CLI

1. Generate a secure random value:

   ```bash
   openssl rand -base64 32
   ```

2. Set the secret (replace the value with your generated string):

   ```bash
   supabase secrets set PRICE_REFRESH_CRON_SECRET=your-generated-secret-here
   ```

3. Verify:

   ```bash
   supabase secrets list
   ```

### Option B: Using the Dashboard

1. Open [Edge Function Secrets Management](https://supabase.com/dashboard/project/_/functions/secrets) (replace `_` with your project ref if needed).
2. Add a new secret:
   - **Key:** `PRICE_REFRESH_CRON_SECRET`
   - **Value:** Output from `openssl rand -base64 32`
3. Save.

**Docs:** [Environment Variables — Production secrets](https://supabase.com/docs/guides/functions/secrets#production-secrets)

**Note:** No redeploy is needed after setting secrets; they are available immediately.

---

## Step 3: Deploy the Edge Functions

Deploy both functions from your project root:

```bash
# refresh-prices: MUST use --no-verify-jwt (gateway would otherwise require JWT; we use CRON_SECRET)
supabase functions deploy refresh-prices --no-verify-jwt

# manual-refresh: uses default JWT verification (Clerk JWT in x-clerk-token)
supabase functions deploy manual-refresh

# Or deploy individually with API fallback if Docker unavailable:
supabase functions deploy refresh-prices --no-verify-jwt --use-api
supabase functions deploy manual-refresh --use-api
```

**Why `--no-verify-jwt` for refresh-prices?**  
The Supabase gateway validates `Authorization: Bearer` as a JWT by default. `refresh-prices` uses `CRON_SECRET` in that header (or in `x-cron-secret`). Without `--no-verify-jwt`, the gateway rejects the request before it reaches the function.
- `--use-api` — Use API-based deployment if Docker is not available.

**Docs:** [Deploy to Production](https://supabase.com/docs/guides/functions/deploy)

---

## Step 4: Verify deployment

Your functions will be available at:

- `https://YOUR_PROJECT_ID.supabase.co/functions/v1/refresh-prices`
- `https://YOUR_PROJECT_ID.supabase.co/functions/v1/manual-refresh`

Get `YOUR_PROJECT_ID` and `ANON_KEY` from **Supabase Dashboard → Settings → API**.

---

## Step 5: Test the functions

### Test `manual-refresh` (user-initiated)

Requires a valid Clerk JWT in `x-clerk-token` and a `Content-Type: application/json` body with `{ "requests": [{ "symbol": "AAPL", "assetClass": "stock" }] }`:

```bash
curl -X POST 'https://YOUR_PROJECT_ID.supabase.co/functions/v1/manual-refresh' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -H 'x-clerk-token: YOUR_CLERK_JWT' \
  -d '{"requests":[{"symbol":"AAPL","assetClass":"stock"}]}'
```

- Success: `200` with `{"success":true}`
- Auth error: `401`

### Test `refresh-prices` (cron)

Requires `PRICE_REFRESH_CRON_SECRET` in `Authorization: Bearer` or `x-cron-secret`:

```bash
curl -X POST 'https://YOUR_PROJECT_ID.supabase.co/functions/v1/refresh-prices' \
  -H 'Authorization: Bearer YOUR_CRON_SECRET' \
  -H 'Content-Type: application/json'
```

- Success: `200` with `{"success":true,"total":0,"stale":0,"refreshed":0,"failed":0,"timestamp":"..."}`
- Wrong/missing secret: `401`

---

## Step 6: Configure cron / scheduler

### Option A: pg_cron + pg_net (inside Supabase) — recommended

Run the setup script in **Supabase Dashboard → SQL Editor**:

1. Go to [SQL Editor](https://supabase.com/dashboard/project/tislabgxitwtcqfwrpik/sql/new) (replace project ref if needed).
2. Paste the contents of `scripts/setup-refresh-prices-cron.sql`.
3. Click **Run**.

This will:
- Enable `pg_cron` and `pg_net` extensions
- Create `app_cron_config` table and store the CRON_SECRET
- Create `invoke_refresh_prices()` function
- Schedule a daily run at 00:00 UTC

**Alternative:** Use [Integrations → Cron](https://supabase.com/dashboard/project/_/integrations) in the Dashboard to create the job via the UI.

### Option B: External cron (e.g. Vercel Cron, GitHub Actions)

Configure a scheduled job that POSTs to:

- **URL:** `https://YOUR_PROJECT_ID.supabase.co/functions/v1/refresh-prices`
- **Method:** POST
- **Headers:** `x-cron-secret: PRICE_REFRESH_CRON_SECRET` (or `Authorization: Bearer PRICE_REFRESH_CRON_SECRET`)

---

## Summary checklist

- [ ] Supabase CLI installed and logged in
- [ ] Project linked (`supabase link --project-ref YOUR_PROJECT_ID`)
- [ ] `PRICE_REFRESH_CRON_SECRET` set (CLI or Dashboard)
- [ ] `refresh-prices` deployed
- [ ] `manual-refresh` deployed
- [ ] `manual-refresh` tested with Clerk JWT
- [ ] `refresh-prices` tested with CRON_SECRET
- [ ] Cron/scheduler configured for `refresh-prices`

---

## References

- [Getting Started with Edge Functions](https://supabase.com/docs/guides/functions/quickstart)
- [Deploy to Production](https://supabase.com/docs/guides/functions/deploy)
- [Environment Variables (Secrets)](https://supabase.com/docs/guides/functions/secrets)
- [Supabase CLI](https://supabase.com/docs/guides/cli)
