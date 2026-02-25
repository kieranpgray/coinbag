# Tasks: Price Refresh

Implementation tasks from the Price Refresh Technical Specification and the [spec plan update](.cursor/plans/price_refresh_spec_plan_update_a3b44d94.plan.md). Assumes Clerk auth, `ticker`/`type` schema alignment, CRON_SECRET for Edge Function, rolling 24h rate limit, minimal refresh UI (no count, disable when unavailable), and log-only background failures with generic toast on manual failure.

## Critical Path

Task 1 → Task 4 → Task 5 → Task 6 & 7 → Task 8 & 9. Task 2 and 3 have no dependencies. Task 10 depends only on Task 1 (and can run after Task 4 if desired).

**Sequence:** 1 (migration) → 2, 3 (constants + types, parallel) → 4 (service) → 5 (hooks) → 6, 7 (components, parallel) → 8, 9 (integration, parallel). Task 10 (Edge Function) after 1.

---

## Database

### Task 1: Add price-cache migration (tables, RLS, assets columns)

- **Depends on:** none
- **Creates/modifies:** `supabase/migrations/20260216000000_add_price_caching.sql` (or next available timestamp)
- **Acceptance criteria:**
  - [ ] Table `symbol_prices` exists with columns: id, symbol, asset_class, price, currency, source, market, fetched_at, created_at; UNIQUE(symbol, asset_class); indexes on symbol, fetched_at, asset_class
  - [ ] Table `user_price_refreshes` exists with: id, user_id (text NOT NULL), refresh_type, symbols_refreshed (text[]), created_at; **no FK to auth.users**; indexes on user_id, created_at
  - [ ] RLS on `symbol_prices`: SELECT for authenticated only; policy uses `auth.jwt() ->> 'sub'` not auth.uid()
  - [ ] RLS on `user_price_refreshes`: SELECT and INSERT with `(auth.jwt() ->> 'sub') = user_id`
  - [ ] Table `symbol_price_history` exists (optional Phase 2); RLS SELECT for authenticated
  - [ ] `assets` has `last_price_fetched_at`, `price_source`; index `idx_assets_ticker_type` on (ticker, type) WHERE ticker IS NOT NULL
  - [ ] Migration runs successfully on a fresh DB (or apply and verify no errors)
- **Notes:** Clerk identity: user_id is JWT `sub` (text). Do not add FK to auth.users. Match existing assets RLS pattern.
- **Human input needed:** none

---

## Constants and types

### Task 2: Add price-refresh constants

- **Depends on:** none
- **Creates/modifies:** `src/lib/constants/price-refresh.ts`
- **Acceptance criteria:**
  - [ ] `PRICE_REFRESH_INTERVALS` by asset_class (stock, etf, crypto, forex, super, 401k) in ms
  - [ ] `MARKET_CLOSE_TIMES` (ASX, NYSE, NASDAQ, LSE) with hour, minute, timezone
  - [ ] `MANUAL_REFRESH_LIMITS`: maxPerDay 3, cooldownMinutes 360
  - [ ] `PRICE_STALENESS_THRESHOLD`: warning 36h, error 72h
  - [ ] `PRICE_API_PROVIDERS` (stocks, crypto, forex) with provider name, baseUrl, rateLimitPerMinute, batchSize
  - [ ] Build passes; file is imported without error
- **Notes:** Values as in spec; used by service and (optionally) Edge Function.
- **Human input needed:** none

### Task 3: Add price types

- **Depends on:** none
- **Creates/modifies:** `src/types/prices.ts`
- **Acceptance criteria:**
  - [ ] Types: AssetClass, Market, SymbolPrice, PriceRefreshLog, PriceFreshnessStatus, ManualRefreshAvailability, PriceFetchRequest, PriceFetchResult
  - [ ] AssetClass includes 'stock' | 'crypto' | 'etf' | 'forex' | 'super' | '401k'
  - [ ] ManualRefreshAvailability has canRefresh, remainingRefreshes, nextAvailableAt, cooldownEndsAt (used internally; not shown in UI)
  - [ ] Build passes
- **Notes:** Snake_case DB columns map to camelCase in types (e.g. fetched_at → fetchedAt).
- **Human input needed:** none

---

## Service layer

### Task 4: Implement PriceService and type→asset_class mapping

- **Depends on:** Task 1, Task 2, Task 3
- **Creates/modifies:** `src/lib/services/price-service.ts`, optionally `src/lib/services/price-mapping.ts` (or inline in same file)
- **Acceptance criteria:**
  - [ ] `mapAssetTypeToPriceAssetClass(assetType: string): AssetClass` — Stock, RSU → stock; Crypto → crypto; Superannuation → super; Investments → stock (single source of truth)
  - [ ] `getSymbolPrice(symbol, assetClass)` and `getSymbolPrices(requests)` read from `symbol_prices`; symbol normalized (e.g. uppercase)
  - [ ] `isPriceStale(fetchedAt, assetClass)` and `getPriceFreshnessStatus(fetchedAt, assetClass)` use PRICE_REFRESH_INTERVALS and PRICE_STALENESS_THRESHOLD
  - [ ] `getManualRefreshAvailability(userId)`: rolling 24h (created_at >= now() - 24h), count manual refreshes; remainingRefreshes = max(0, 3 - count); 6h cooldown after latest refresh; canRefresh = remainingRefreshes > 0 and (no refresh in last 6h)
  - [ ] `triggerManualRefresh(userId, requests)`: check availability; insert into user_price_refreshes (refresh_type 'manual', symbols_refreshed); call fetchAndUpdatePrices; return { success, error? }
  - [ ] `fetchAndUpdatePrices(requests)`: group by asset_class; for each group call fetch (mock or stub acceptable for Phase 1); upsert symbol_prices with onConflict (symbol, asset_class)
  - [ ] `refreshStalePrices()`: select all symbol_prices, filter stale by interval, call fetchAndUpdatePrices; return { total, refreshed, failed }
  - [ ] Unit tests for isPriceStale, getPriceFreshnessStatus, getManualRefreshAvailability (rolling 24h and cooldown), mapAssetTypeToPriceAssetClass
- **Notes:** Use ticker→symbol (normalized) and type→asset_class via mapping. No reference to assets.symbol or assets.subtype. Real API calls (Yahoo, CoinGecko, etc.) can be deferred; mock/stub is acceptable for MVP.
- **Human input needed:** none

---

## React hooks

### Task 5: Add use-symbol-price hooks

- **Depends on:** Task 4
- **Creates/modifies:** `src/hooks/use-symbol-price.ts`
- **Acceptance criteria:**
  - [ ] `useSymbolPrice(symbol, assetClass)` — useQuery, key ['symbol-price', symbol, assetClass], staleTime 5m, enabled when symbol present
  - [ ] `useSymbolPrices(requests)` — useQuery for batch; key includes requests; enabled when length > 0
  - [ ] `useManualRefreshAvailability()` — useQuery, requires user (Clerk); refetchInterval 1m; returns availability for button disable logic
  - [ ] `useManualPriceRefresh()` — useMutation calling triggerManualRefresh(userId, requests); onSuccess invalidate symbol-price, symbol-prices, manual-refresh-availability, assets
  - [ ] `usePriceFreshness(fetchedAt, assetClass)` — returns PriceFreshnessStatus (or error-like state when !fetchedAt)
  - [ ] Tests or smoke: hooks resolve without error when used in a wrapper with QueryClient and Clerk provider
- **Notes:** Pass Clerk user id from useUser() to availability and mutation. Requests built from assets with ticker + type mapped to asset_class.
- **Human input needed:** none

---

## UI components

### Task 6: Add PriceFreshnessIndicator

- **Depends on:** Task 5
- **Creates/modifies:** `src/components/shared/PriceFreshnessIndicator.tsx`
- **Acceptance criteria:**
  - [ ] Props: fetchedAt, assetClass, showLabel?, className?
  - [ ] When !fetchedAt: show error state ("Price not available"), tooltip "No price data available for this asset"
  - [ ] When isError (>72h): red/error style, "Price outdated", tooltip with last updated time
  - [ ] When isStale (>36h): amber, "Updated X ago", tooltip "Price may be outdated"
  - [ ] When fresh: muted, checkmark, "Updated X ago"
  - [ ] Uses usePriceFreshness(fetchedAt, assetClass); no numeric refresh count in UI
  - [ ] Accessible: icon + text or aria-label for state
  - [ ] Component test or Storybook: all four states render correctly
- **Notes:** Use existing Tooltip and date-fns formatDistanceToNow. Align with design system (destructive, amber, muted-foreground).
- **Human input needed:** none

### Task 7: Add ManualRefreshButton

- **Depends on:** Task 5
- **Creates/modifies:** `src/components/shared/ManualRefreshButton.tsx`
- **Acceptance criteria:**
  - [ ] Props: symbols (PriceFetchRequest[]), variant?, size?, showLabel?, className?
  - [ ] Button label: "Refresh" or "Refresh prices" only — **no "X/3" or remaining count**
  - [ ] Disabled when: !availability?.canRefresh, or availability load failed (e.g. network error), or isPending
  - [ ] When disabled: tooltip "Refresh unavailable; try again later" (do not show time until next or remaining count)
  - [ ] When enabled: optional tooltip e.g. "Refresh all prices"
  - [ ] On click: call useManualPriceRefresh mutate(symbols); on success toast "Prices refreshed successfully"; on error generic toast "Refresh didn't complete; try again later"
  - [ ] Render only when symbols.length > 0 (caller responsibility) or hide when symbols.length === 0
  - [ ] Accessible name e.g. "Refresh prices"
  - [ ] Component test: disabled when canRefresh false; no count in label
- **Notes:** useManualRefreshAvailability and useManualPriceRefresh from Task 5. Do not expose remainingRefreshes or cooldownEndsAt in UI.
- **Human input needed:** none

---

## Feature integration

### Task 8: Integrate price freshness and refresh into Assets page

- **Depends on:** Task 6, Task 7
- **Creates/modifies:** `src/features/assets/AssetsPage.tsx`, and any asset card/list component that shows per-asset freshness
- **Acceptance criteria:**
  - [ ] Build symbol list from assets with type in Stock, RSU, Crypto and ticker set; map to PriceFetchRequest[] via ticker + mapAssetTypeToPriceAssetClass(type)
  - [ ] Show ManualRefreshButton in page header only when there is at least one price-backed asset (symbols.length > 0); otherwise hide button
  - [ ] Each asset card/row that has ticker and type shows PriceFreshnessIndicator(fetchedAt: last_price_fetched_at, assetClass: map(type))
  - [ ] Asset types/repo expose last_price_fetched_at and price_source if not already (may require Task 1 columns + API/contract update)
  - [ ] Manual E2E or smoke: open Assets, see refresh button when holdings exist; see freshness on an asset with ticker
- **Notes:** Use existing useAssets or equivalent; ensure asset type includes last_price_fetched_at once migration and API are in place. If assets API does not yet return these, add to contract and data layer in this task or a prior task.
- **Human input needed:** none

### Task 9: Integrate portfolio value and refresh into Dashboard

- **Depends on:** Task 6, Task 7
- **Creates/modifies:** `src/features/dashboard/` — e.g. a portfolio/summary component that shows total value and refresh (spec’s PortfolioValueCard example)
- **Acceptance criteria:**
  - [ ] Dashboard (or net worth / portfolio section) uses useSymbolPrices for assets with ticker; computes total value from prices × quantity or fallback to asset value
  - [ ] ManualRefreshButton (icon or with label) available in that section when user has price-backed assets
  - [ ] Price freshness indicated where relevant (e.g. summary line or tooltip)
  - [ ] No "X/3" or count displayed; button disabled when unavailable or pending
  - [ ] Build and smoke test: dashboard loads, portfolio value and refresh button behave
- **Notes:** Align with existing dashboard data (useDashboard, assets). Reuse same symbol list building as Task 8 (ticker + type → PriceFetchRequest).
- **Human input needed:** none

---

## Background job

### Task 10: Add refresh-prices Edge Function with CRON_SECRET auth

- **Depends on:** Task 1 (migration must exist). Optionally Task 4 (logic alignment); can reimplement in Deno.
- **Creates/modifies:** `supabase/functions/refresh-prices/index.ts`, Edge Function secrets (PRICE_REFRESH_CRON_SECRET)
- **Acceptance criteria:**
  - [ ] On request: read Authorization Bearer or x-cron-secret header; compare with Deno.env.get('PRICE_REFRESH_CRON_SECRET') (constant-time if available); if missing or wrong return 401
  - [ ] Do not send or document SUPABASE_SERVICE_ROLE_KEY in request; create Supabase client inside function with SUPABASE_SERVICE_ROLE_KEY for DB access
  - [ ] Fetch symbol_prices; determine stale by same intervals as app (24h stock/etf/forex, 6h crypto, 7d super/401k); group by asset_class; for each group fetch (mock/stub OK) and upsert symbol_prices
  - [ ] On failure: log to console (e.g. console.error with symbol count, error); no user-facing response body for failures beyond HTTP 500
  - [ ] On success: return JSON { success, total, stale, refreshed, failed, timestamp }
  - [ ] Doc or README: scheduler must call with header set to CRON_SECRET (same value as in Edge Function secrets)
  - [ ] Deploy and test with valid CRON_SECRET returns 200; without or wrong secret returns 401
- **Notes:** Duplicate interval constants in Deno is acceptable; keep in sync with app constants. Real price API integration can be a follow-up task.
- **Human input needed:** Generate and set PRICE_REFRESH_CRON_SECRET in Supabase Edge Function secrets; configure cron/scheduler to send it (pg_cron + pg_net or external).

---

## Deferred items

- **Real price API integration:** Yahoo Finance (stocks/ETFs), CoinGecko (crypto), Exchange Rate API (forex) — replace mock in PriceService and Edge Function; handle rate limits and errors.
- **symbol_price_history:** Populate and use for performance charts (Phase 2).
- **Market-aware scheduling:** Run cron at market close + offset per exchange (e.g. 4:30 PM EST for NYSE); currently cron schedule is out of scope of these tasks.
- **Batch getSymbolPrices optimization:** Spec noted large .or() queries; if >30 symbols, consider chunking or RPC in a follow-up task.

---

## Ambiguous / implementer judgment

- **Investments → asset_class:** Plan allowed "etf or stock"; this task list uses **stock** for Investments so one interval and one API path apply. Change to `etf` if product prefers.
- **Manual refresh failure:** Spec and plan say generic toast; implemented as "Refresh didn't complete; try again later" in Task 7.
- **Where to store SPEC.md:** If the written spec is to live in-repo, create/update `specs/price-refresh/SPEC.md` in a separate task or as part of pre-implementation; this file lists implementation tasks only.
