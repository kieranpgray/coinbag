# Environment variables and secrets

## Rules

1. **Never commit** `.env`, `.env.production`, `.env.local`, or any file containing real keys. They are in `.gitignore`. Use `.env.example` as the only committed reference.
2. **VITE_ prefix** = exposed to the client bundle. Use only for non-secrets: `VITE_CLERK_PUBLISHABLE_KEY`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_DATA_SOURCE`. Never use `VITE_` for secret keys.
3. **Server-only** (no VITE_): `CLERK_SECRET_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `MISTRAL_API_KEY`. Use only in server-side code, scripts, or hosting secrets (e.g. Vercel env, Supabase Edge Function secrets).
4. **Pre-commit** blocks staging of `.env` and `.env.production`. If you accidentally stage them, run `git reset HEAD -- .env .env.production`.

## If a secret was committed

1. **Rotate the key immediately** in the provider (Clerk, Supabase, Mistral).
2. Remove the secret from the repo (redact in docs, rewrite history if the key is in git history and high-impact).
3. Update deployment/hosting env vars with the new key.

## Local vs production

- **Local dev**: Copy `.env.example` to `.env` and fill in values. Use Clerk **test** key (`pk_test_...`) and dev Supabase anon key.
- **Production**: Set variables in Vercel (or your host) and in Supabase Dashboard for Edge Function secrets. Do not rely on committed `.env.production` for deployment.
