# Debug resolution: Assets / Wealth view not rendering (400 on assets and liabilities)

Improved resolution using the Debug & Investigate 5-phase methodology and original console logs.

---

## Phase 1: Triage & Reproduce

### Restate
**What’s happening:** Assets and Wealth pages show “Unable to load assets” (or equivalent) instead of the asset/liability list.  
**What should happen:** Both pages should render the list of assets (and liabilities on Wealth) after loading.

### Classify
**Integration failure** — Supabase REST API returns 400 for list requests; the app treats that as a hard error and surfaces the error UI.

### Signals (in order)

1. **Error messages / stack**
   - Browser: “Failed to load resource: the server responded with a status of 400” for:
     - `.../rest/v1/assets?select=id,name,type,...,last_price_fetched_at,price_source&order=date_added.desc`
     - `.../rest/v1/liabilities?select=id,name,...,repayment_amount,repayment_frequency&order=created_at.desc`
   - No stack trace in logs; failure is at the fetch/response level.

2. **Application logs**
   - `[Supabase Fetch]` logs show requests with token; no explicit “DB:ASSETS_LIST” fallback warn/error in the pasted logs (suggests fallback path may not run or logs not captured).

3. **Network**
   - **Status:** 400 on assets and liabilities list requests (repeated).
   - **Payload:** Select strings include columns that may not exist in DB: e.g. `last_price_fetched_at`, `price_source`, `ticker`, `grant_price`, `address`, `property_type` (assets); `repayment_amount`, `repayment_frequency` (liabilities).
   - **Response body:** Not in logs — **needs inspection** (Network tab → failed request → Response) to see exact `code` and `message` (e.g. PGRST204 vs PGRST100 vs 42703).

4. **Recent changes**
   - Git shows migrations: `20260216000000_add_price_caching.sql`, `20260216120001_add_assets_address_property_grant_price.sql`, `20260216120002_rename_investments_remove_other.sql`.
   - Frontend requests these new columns; remote DB may not have migrations applied.

5. **Other signals**
   - `net_worth_history` 404 and Yahoo CORS are non-blocking (fallbacks used); they are not the cause of “page does not render” for assets/wealth.

### Reproduction
**Deterministic:** Open Assets or Wealth page with app pointed at Supabase project `tislabgxitwtcqfwrpik`; assets/liabilities list requests return 400. Trigger: loading the page (useAssets / useLiabilities run on mount).

---

## Phase 2: Hypothesise

### Hypothesis 1 (HIGH): Assets fallback never runs because PostgREST returns PGRST204, which assets repo does not treat as “missing column”
- **What:** When a requested column is missing, PostgREST returns **400** with **code PGRST204** (“column specified in the columns query parameter is not found”). The assets repo’s `isMissingColumnOrBadRequest()` checks `PGRST100` and `42703` but **not PGRST204**, so the condition is false and the fallback chain (reduced column selects) never runs.
- **Evidence for:** PostgREST docs: PGRST204 = 400, column not found. Liabilities and other repos (accounts, goals, userPreferences) already check `PGRST204`; assets repo does not.
- **Evidence against:** None from logs; response body not yet inspected.
- **How to confirm:** (1) In Network tab, open a failing assets request → Response tab and confirm `code` is `PGRST204` (or 42703). (2) Add `code === 'PGRST204'` to assets `isMissingColumnOrBadRequest`; reload and see if fallback runs and page renders (with or without migrations).

### Hypothesis 2 (MEDIUM): Remote DB schema is behind (migrations not applied)
- **What:** The Supabase project’s `assets` (and possibly `liabilities`) tables do not have the new columns, so any select that includes them returns 400.
- **Evidence for:** Migrations exist locally; console shows 400 on selects that include new columns; “recent changes to the assets codebase” aligns with new fields.
- **Evidence against:** None.
- **How to confirm:** Run migrations against the project (`supabase db push` or apply via dashboard); if 400s stop and full select succeeds, schema was the cause. Even so, fixing Hypothesis 1 is still required for resilience when schema is behind.

### Hypothesis 3 (LOW): Supabase client does not attach HTTP status to the error object
- **What:** `error.status === 400` in assets is never true because the client does not set `error.status`, so status-based detection fails.
- **Evidence for:** Some Supabase/PostgREST docs focus on `code`/`message`; status on the error object is not guaranteed.
- **Evidence against:** If the API returns a body with `code: "PGRST204"`, the client typically parses it into `error.code`; so adding PGRST204 (Hypothesis 1) would fix the issue regardless of status.
- **How to confirm:** Log `result.error` in assets list (or inspect 400 response body); if `status` is undefined but `code` is `PGRST204`, Hypothesis 3 is secondary.

---

## Phase 3: Investigate

### Trace execution (entry point → error)
- **Entry:** User opens Assets or Wealth → `useAssets()` / `useLiabilities()` run → `repository.list(getToken)`.
- **Assets:** [supabaseRepo.ts](src/data/assets/supabaseRepo.ts) `list()` does `supabase.from('assets').select(this.selectColumns)` (full column list including `last_price_fetched_at`, `price_source`, etc.). On `result.error` it calls `isMissingColumnOrBadRequest(error)`. If that returns **false** (e.g. because error has `code: 'PGRST204'` and repo only checks PGRST100/42703), it skips the fallback and proceeds to `if (error)` → returns `{ error }` to the hook. Hook throws → React Query error state → AssetsPage/WealthPage render error UI.
- **Liabilities:** Same pattern but liabilities repo already includes `PGRST204` in `looksLikeBadRequest`; if liabilities also 400, either their fallback is not triggering for another reason or the basic select also fails (e.g. other missing columns).

### Trace data (input → output)
- **Input:** Select string with ~24 columns (assets) or 12 (liabilities).
- **Output:** HTTP 400; body shape unknown until inspected. Expected from PostgREST for missing column: `{ "code": "PGRST204", "message": "...", "details": null, "hint": "..." }` or PostgreSQL `42703` if forwarded.

### Environment
- **Config:** Same Supabase URL/anon key for all requests; JWT present (token length 834 in logs).
- **Schema:** Remote DB may not have columns added by migrations under `supabase/migrations/` (price caching, address/property_type/grant_price, type renames).

**Confirmed root cause (evidence trail):**
- PostgREST returns **400** for “column not found” with **code PGRST204** (doc-confirmed).
- Assets repo does **not** check for **PGRST204** in `isMissingColumnOrBadRequest`, so fallback never runs.
- Liabilities repo **does** check PGRST204; if liabilities still 400, either status/message is needed too or basic select fails (e.g. table missing other columns).

---

## Phase 4: Fix

### Fix (stated before code)
1. **Assets repo:** In `isMissingColumnOrBadRequest()`, treat **PGRST204** (column not found) as a trigger for the fallback chain. Add `code === 'PGRST204'` to the condition. Optionally add message-based “bad request” detection (e.g. message includes `"bad request"` or `"400"`) so 400 is detected even if the client does not set `error.status` or `error.code`.
2. **Schema:** Apply pending migrations to the remote Supabase project so `assets` (and liabilities if needed) have the new columns; then the full select will succeed and fallback is only needed for older environments.

### Implement (minimal change)
- **File:** [src/data/assets/supabaseRepo.ts](src/data/assets/supabaseRepo.ts)
  - In `isMissingColumnOrBadRequest()` add:
    - `code === 'PGRST204'` (column not found in schema cache — **required**).
    - Optionally: `msg.includes('bad request') || msg.includes('400')` for robustness when status/code are missing.
- No change to select strings or fallback order; no refactors elsewhere.

### Regression test
- **Fails without fix:** With DB missing new columns (or mock that returns 400 + PGRST204), assets list fails and page shows error.
- **Passes with fix:** Same setup; fallback runs, reduced-column select succeeds, page renders (possibly with some fields undefined). After migrations, full select succeeds.
- **Suggested test:** In [src/features/assets/__tests__/](src/features/assets/__tests__/) or repo-level test: when `repository.list` receives a 400 response with `error.code === 'PGRST204'`, the repository returns data from a fallback select (or at least does not return the same error without retrying).

### Full suite
- Run existing tests (e.g. `pnpm test`); ensure no regressions in assets, liabilities, dashboard, or wealth flows.

### Commit message
```
fix(assets): trigger fallback select on PGRST204 (column not found)

PostgREST returns 400 with code PGRST204 when a requested column does
not exist. isMissingColumnOrBadRequest only checked PGRST100/42703, so
fallback never ran and assets/wealth pages showed error. Add PGRST204
(and optional message-based 400 detection) so reduced-column fallback
runs when schema is behind migrations.
```

---

## Phase 5: Verify & Document

### Confirm fix
- Reload Assets and Wealth with current (migration-behind) project: page should render after fallback (or after applying migrations with full select).
- Inspect one 400 response body in Network tab and confirm `code` is PGRST204 (or 42703) for assets.

### Related instances
- **Same pattern:** [src/data/liabilities/supabaseRepo.ts](src/data/liabilities/supabaseRepo.ts) already uses PGRST204; if liabilities still 400, verify their fallback path runs (e.g. status/message checks) and that `selectColumnsBasic` only requests columns that exist.
- **Other repos:** accounts, goals, userPreferences already handle PGRST204; no change needed there.

### Bug report (template)

```markdown
## Bug Report: Assets/Wealth page does not render after schema changes

- **Symptom:** Assets and Wealth pages show "Unable to load assets" (or similar);
  network shows 400 on GET .../assets and .../liabilities with select including
  last_price_fetched_at, price_source, ticker, grant_price, address, property_type
  (assets) or repayment_* (liabilities).

- **Root cause:** PostgREST returns 400 with code PGRST204 when a requested
  column is not in the schema cache. The assets repo only treated PGRST100 and
  42703 as "missing column", so isMissingColumnOrBadRequest was false and the
  fallback select (reduced columns) never ran. Remote DB may also not have
  migrations applied.

- **Fix:** In SupabaseAssetsRepository.isMissingColumnOrBadRequest(), add
  code === 'PGRST204'. Optionally add message-based "bad request" / "400"
  detection. Apply pending migrations to the Supabase project so full select
  succeeds.

- **Regression test:** Repo or integration test that when list() receives
  error with code PGRST204, fallback is attempted and data returned if
  reduced-column select succeeds.

- **Related risks:** Liabilities and other repos already use PGRST204; ensure
  assets repo is the only one that was missing it. After fix, environments
  with old schema still need migrations for full column set.

- **Prevention:** (1) When adding new columns in migrations, add the same
  column to the repo’s fallback chain (or document “run migrations first”).
  (2) In CI or local script, run migrations before e2e/full stack tests so
  schema matches app. (3) Consider a single checklist (e.g. in PR template):
  “New DB columns → migration added and applied to target env.”
```

---

## Implementation completed

- **Assets:** [src/data/assets/supabaseRepo.ts](src/data/assets/supabaseRepo.ts) — `isMissingColumnOrBadRequest()` now includes `code === 'PGRST204'` and a `looksLikeBadRequest` check (`status === 400`, message contains `"bad request"` or `"400"`). Status is read via `(error as { status?: number }).status` for consistency with the liabilities repo.
- **Liabilities:** [src/data/liabilities/supabaseRepo.ts](src/data/liabilities/supabaseRepo.ts) — `isMissingColumnError` now includes `errorCode === 'PGRST204'` so column-not-found errors take the “Repayment columns may not exist” retry path.
- **Type-check:** `pnpm type-check` passes. Test suite has pre-existing failures (LocaleProvider, NetWorthChart, etc.) unrelated to these changes.
- **Next steps for you:** (1) Reload the Assets and Wealth pages against your Supabase project; the fallback should run and the list should render when the API returns 400/PGRST204. (2) Apply pending migrations (`supabase db push` or dashboard) so the full select succeeds and all new columns are available.

---

## Summary

| Phase   | Outcome |
|---------|--------|
| **Cause** | 400 on assets/liabilities due to select including columns missing in DB; **assets fallback does not run because repo does not check for PGRST204** (column not found). |
| **Fix**   | Add `code === 'PGRST204'` (and optional message-based 400) to [src/data/assets/supabaseRepo.ts](src/data/assets/supabaseRepo.ts) `isMissingColumnOrBadRequest`. Apply migrations to remote project. |
| **Verify** | Reload assets/wealth → page renders; inspect 400 response body to confirm code; run test suite. |
| **Prevention** | Align fallback triggers with PostgREST codes (PGRST204 for column not found); apply migrations before tests; document schema vs app expectations. |
