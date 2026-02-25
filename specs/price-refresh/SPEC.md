# Price Refresh — Technical Specification

This specification defines the price caching and refresh feature for portfolio assets. It incorporates clarifications from the plan update (auth, schema alignment, cron auth, rate limits, UI, and failure handling).

---

## 1. Auth: Clerk integrated with Supabase

- **Identity:** Clerk is the auth provider, integrated in Supabase.
- **user_price_refreshes.user_id:** `text NOT NULL` storing the Clerk `sub` claim. **No** foreign key to `auth.users`.
- **RLS:** All policies on `user_price_refreshes` and `symbol_prices` use `(auth.jwt() ->> 'sub') = user_id`, not `auth.uid()`.
- **Documentation:** Identity is provided by Clerk; Supabase is configured to accept Clerk JWTs and RLS uses the JWT `sub` claim for user_id.

---

## 2. Schema alignment

- **DB (assets):** Use existing `ticker` and `type` columns. Add `last_price_fetched_at`, `price_source`. Index on `(ticker, type)` WHERE ticker IS NOT NULL.
- **Price cache:** `symbol_prices.symbol` and `symbol_prices.asset_class` remain as-is (global cache is separate from assets).
- **Mapping:** In app/API, derive **symbol** = `asset.ticker` (normalized, e.g. uppercase) and **asset_class** from `asset.type` via a single mapping:

| Asset type      | asset_class |
|-----------------|-------------|
| Stock, RSU      | stock       |
| Crypto          | crypto      |
| Superannuation  | super       |
| Investments     | stock       |
| (ETF 24h if spec)| etf         |
| forex, 401k     | (future)    |

---

## 3. Cron / Edge Function auth

- **Do not** send `SUPABASE_SERVICE_ROLE_KEY` in any client-facing header.
- **CRON_SECRET:** Require `Authorization: Bearer <PRICE_REFRESH_CRON_SECRET>` or `x-cron-secret: <PRICE_REFRESH_CRON_SECRET>`.
- Store `PRICE_REFRESH_CRON_SECRET` in Supabase Edge Function secrets. Generate a long random value (e.g. 32 bytes, base64).
- At function start: read header; compare with `Deno.env.get('PRICE_REFRESH_CRON_SECRET')` using constant-time comparison if available; if missing or wrong, return 401.
- Internally, create Supabase client with `SUPABASE_SERVICE_ROLE_KEY` (from env) only for server-side reads/writes.
- **Spec wording:** "Require Authorization Bearer CRON_SECRET or x-cron-secret. CRON_SECRET is stored in Edge Function secrets; never send the service role key in requests."

---

## 4. Rate limit: rolling 24 hours

- **Rule:** 3 manual refreshes per rolling 24-hour window.
- **Implementation:** When checking availability:
  - Query `user_price_refreshes` where `user_id = userId` and `refresh_type = 'manual'` and `created_at >= (now() - interval '24 hours')`.
  - Count rows; `remainingRefreshes = max(0, 3 - count)`.
  - **Cooldown:** 6 hours after the most recent manual refresh.
- **canRefresh:** `remainingRefreshes > 0` and `(lastRefreshAt is null or (now() - lastRefreshAt) >= 6 hours)`.
- **Spec wording:** "Daily limit is a rolling 24-hour window: count manual refreshes where created_at >= now() - 24 hours. Cooldown: 6 hours after the most recent manual refresh."

---

## 5. UI: no refresh count; disable when unavailable

- **Do not show** "X/3", "remaining refreshes", or "next available at".
- Button label: "Refresh" or "Refresh prices" only.
- **Disabled when:** `!availability?.canRefresh`, or availability load failed (network error), or `isPending`.
- **Tooltip when disabled:** Optional brief text (e.g. "Refresh unavailable; try again later" or "You can refresh again in X hours") without exposing the limit number.
- No numeric display of remaining refreshes; optional short tooltip when disabled.

---

## 6. Job failure: log only; manual generic toast

- **Background job (cron):** On failure, log to Edge Function logs (e.g. `console.error` with correlation id, symbol count, error). Do **not** expose a user-facing "price refresh failed" message or banner.
- **Manual refresh failure:** Show a generic toast (e.g. "Refresh didn't complete; try again later") so the user knows the action did not succeed, without exposing internal details.
- **Spec wording:** "Scheduled refresh failures are logged only (console / Edge Function logs). No user-facing alert or banner for background job failures. Manual refresh failures: generic toast only."

---

## 7. Tables and migrations

### symbol_prices
- Columns: id, symbol, asset_class, price, currency, source, market, fetched_at, created_at
- UNIQUE(symbol, asset_class); indexes on symbol, fetched_at, asset_class
- RLS: SELECT for authenticated; policy uses `auth.jwt() ->> 'sub'` (for authenticated check)

### user_price_refreshes
- Columns: id, user_id (text NOT NULL), refresh_type, symbols_refreshed (text[]), created_at
- No FK to auth.users
- Indexes on user_id, created_at
- RLS: SELECT and INSERT with `(auth.jwt() ->> 'sub') = user_id`

### assets (additions)
- last_price_fetched_at, price_source
- Index: `idx_assets_ticker_type ON assets(ticker, type) WHERE ticker IS NOT NULL`
