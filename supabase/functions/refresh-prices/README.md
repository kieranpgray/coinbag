# refresh-prices Edge Function

Cron-invoked function to refresh stale symbol prices in `symbol_prices`.

## Auth

- Requires `PRICE_REFRESH_CRON_SECRET` in `Authorization: Bearer <secret>` or `x-cron-secret: <secret>`.
- Do **not** send `SUPABASE_SERVICE_ROLE_KEY` in any request header.
- Uses `SUPABASE_SERVICE_ROLE_KEY` only inside the function for DB writes.

## Setup

1. Generate a long random secret (e.g. 32 bytes, base64): `openssl rand -base64 32`
2. Set in Supabase: Project Settings → Edge Functions → Secrets → `PRICE_REFRESH_CRON_SECRET`
3. Configure your scheduler (pg_cron + pg_net, or external) to POST with header `Authorization: Bearer <secret>` or `x-cron-secret: <secret>`

## Response

- 200: `{ success, total, stale, refreshed, failed, timestamp }`
- 401: Missing or invalid CRON_SECRET
- 500: Server error
