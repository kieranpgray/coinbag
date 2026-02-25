# Asset Fields Update — Clarifications and Recommendations

This addendum records product clarifications and proposes concrete recommendations for the remaining gaps from the spec review panel.

**Out of scope (handled elsewhere):** Price updates, current-price look-up, and persistence of stock/crypto/super prices are **excluded** from this spec. They are addressed by the **Price Refresh** plan (see `.cursor/plans/price_refresh_spec_plan_update_17c337a4.plan.md`). That plan adds `symbol_prices`, `user_price_refreshes`, and on assets `last_price_fetched_at` and `price_source`; cron and manual refresh populate prices. The asset form only **displays and allows override** of current price/value as stored on the asset; no in-form price fetch or refresh logic.

---

## 1. Clarifications (confirmed)

### 1.1 Date picker

- **Clarification:** The date picker is non-functional for some asset fields: it appears as a text field only (no calendar UI or proper date behaviour). The same DatePicker implementation used elsewhere in the app should be used for all asset date fields.
- **Root cause (recommended):** In `AssetForm.tsx`, date fields use `register('purchaseDate')` etc. without passing `value` or using `Controller`. Elsewhere (e.g. `ExpenseForm.tsx`, `BudgetPage.tsx`, `PayCycleSetup.tsx`) the working pattern is:
  - Use **Controller** with `value={field.value || undefined}` and `onChange={(e) => field.onChange(e.target.value)}`, or
  - Pass **value** from form state (e.g. `value={watch('purchaseDate') || undefined}`) and **onChange** that calls `setValue('purchaseDate', e.target.value)`.
- **Recommendation:** Align asset form date fields with the app’s working pattern:
  - Use the shared `DatePicker` from `@/components/ui/date-picker`.
  - For every date field (required and optional): pass `value` from form state and `onChange` that updates the form (Controller or watch/setValue).
  - For optional dates: set `shouldShowCalendarButton={true}` and `allowClear={true}`, and a clear placeholder (e.g. “Optional”).
  - Affected fields: `dateAdded`, Stock `purchaseDate`, Stock `dateAdded`, RSU `grantDate`, RSU `vestingDate`, RSU `dateAdded`, Crypto `purchaseDate`.

### 1.2 Superannuation vs Retirement

- **Clarification:** The choice of label (“Superannuation” vs “Retirement”) is based on the user’s **language and location** selection. For any unhandled scenario (e.g. locale not en-AU or en-US, or missing setting), **fallback to “Retirement”.**
- **Recommendation:** Specify in the spec:
  - **Rule:** If language and location → Australia (e.g. en-AU or explicit Australia), show **“Superannuation”**. Otherwise show **“Retirement”** (including en-US and any unknown/unsupported locale).
  - **Implementation:** Use the same source as the rest of the app for “language and location” (e.g. `LocaleContext` / locale registry). Map locale or region to one of { Australia, Other }; “Other” → “Retirement”.
  - **Fallback:** Any unhandled or missing value → “Retirement”.

---

## 2. Recommendations for remaining gaps

### 2.1 As-at date for change history

- **Gap:** Spec says “store the as at date and show in change history” but the current `asset_value_history` table has no such column.
- **Recommendation:**
  - **Schema:** Add a nullable `value_as_at_date date` (or `as_at_date`) column to `asset_value_history`. Keep `created_at` as “when the row was written.”
  - **On save:** When creating or updating an asset’s value, set `value_as_at_date` to the date the user is saving “as at” (default: today in the user’s context if not provided).
  - **API/trigger:** Extend the insert into `asset_value_history` (manual in repo and/or trigger) to accept and store `value_as_at_date`. If the app does not send it, default to `CURRENT_DATE` or `created_at::date`.
  - **UI:** In the change history list, show “Value as at &lt;date&gt;” (using `value_as_at_date` when present, else `created_at` date).
  - **Acceptance:** “When a user saves a value, the change history entry shows the as-at date. When viewing history, each row displays that date.”

### 2.2 Change history “Unable to load”

- **Gap:** Change history often shows “Unable to load change history”; root cause and fix are not specified.
- **Recommendation:**
  - **Investigate:** (1) Confirm `asset_value_history` migration has run in the target environment. (2) Confirm RLS: policy uses `(auth.jwt() ->> 'sub') = user_id` and that the Supabase client sends the Clerk JWT. (3) Check Zod validation after mapping (e.g. `created_at` format); log validation failures in dev.
  - **Spec:** Add acceptance criteria: “For an asset that has at least one value change, the Change history section loads without error and shows each change with date, previous value, new value, and as-at date (when implemented). If the user has no history, show ‘No change history available.’”
  - **Error UX:** Consider showing a short, user-friendly message and a “Retry” when the load fails (instead of only “Unable to load change history”).

### 2.3 Property address (typeahead, AU and US)

- **Gap:** Provider, data sent, and schema are undefined.
- **Recommendation:**
  - **Phase 1 (recommended for first release):** Single **free-text address** field (e.g. max 200 chars), no typeahead. Saves implementation and provider risk; works for AU and US.
  - **Phase 2 (if needed):** Add typeahead with a defined provider (e.g. Google Places or Here). Spec to include: what is sent (partial string + country/region), that full address is not logged server-side for typeahead requests, and any privacy/product terms.
  - **Schema:** Store one field (e.g. `address text`) unless product requires structured (line1, city, state, postcode) for reporting.

### 2.4 Exchange auto-select (Stock / RSU)

- **Gap:** “Auto select based on stock symbol, allow user to change” has no defined rule.
- **Recommendation:** Define a simple rule: “On symbol entry or blur, if exchange is empty, set a default by symbol (e.g. US symbols → NASDAQ or NYSE, AU → ASX) from a small client-side map or first match from a list; user can always change.” Document the default mapping source (e.g. static list by region) so it’s maintainable. Do not block save if exchange is empty if the schema allows it.

### 2.5 RSU unrealised P/L (value at grant date)

- **Gap:** “Current value minus value at grant date” requires a defined “value at grant date.”
- **Recommendation:** Add an optional **“Price at grant”** (or “Grant price”) field. Unrealised P/L = (current price × quantity) − (grant price × quantity). If grant price is not provided, show “—” or “N/A” for unrealised P/L and still show current value. No historical price API required for v1.

### 2.7 Remove “Other” and rename “Investments” to “Other Investments”

- **Gap:** Handling of existing “Other” and “Investments” records and exact enum/UI behaviour are unspecified.
- **Recommendation:**
  - **Types:** Remove “Other” from the type enum. Rename “Investments” to “Other Investments” in UI and in the type enum (single enum value, e.g. `Other Investments`), so existing “Investments” rows stay valid.
  - **Existing “Other”:** Either (A) one-time migration: set `type = 'Other Investments'` for all `type = 'Other'`, or (B) keep “Other” in DB and in API for backward compatibility but hide it from the create/new-type dropdown and show existing “Other” assets as “Other Investments” in the UI. Prefer (A) if you want a single source of truth and no legacy “Other.”
  - **Acceptance:** “New assets cannot be created as Other. Existing Other assets are either migrated to Other Investments or displayed as Other Investments; user can edit and save. All references in UI and exports use ‘Other Investments’ where applicable.”

### 2.7 Calculated fields and rounding

- **Gap:** No precision/rounding rule for current value and unrealised P/L.
- **Recommendation:** “All currency values are stored and displayed to 2 decimal places. Calculated fields (current value, unrealised P/L) use 2-decimal rounding before display and when persisting.” Add this to the spec so QA and implementation are aligned.

### 2.8 Validation and security for new fields

- **Gap:** New fields (address, property type, as-at date) and any new columns must be validated and remain behind RLS.
- **Recommendation:**
  - **Validation:** Address max length (e.g. 200); property type max length (e.g. 100); notes keep existing limit (e.g. 1000). All user-supplied text is escaped on render (no raw HTML).
  - **RLS:** No new table or column should bypass RLS. Existing policies on `assets` and `asset_value_history` (user_id = JWT sub) apply to new columns; no SELECT/INSERT/UPDATE without user check.

### 2.9 Change history display (as-at date)

- **Gap:** UI copy for “as at” in history not specified.
- **Recommendation:** In the change history list, for each row show: “&lt;date&gt; — Value as at &lt;value_as_at_date&gt;: &lt;previous&gt; → &lt;new&gt;” (or equivalent). If `value_as_at_date` is null (legacy rows), show “Value as at &lt;created_at date&gt;” so behaviour is consistent.

---

## 3. Summary: what to add to the formal spec

Before implementation, the spec should explicitly include:

| Area | Add to spec |
|------|---------------------|
| Date picker | Use shared DatePicker; Controller (or value + onChange) for every asset date field; optional dates: allowClear + placeholder. Same pattern as ExpenseForm/BudgetPage. |
| Super / Retirement | Label by language and location; Australia → “Superannuation”; else → “Retirement”; fallback → “Retirement”. |
| As-at date | Add `value_as_at_date` to history table; set on save; show in change history UI; acceptance criteria as above. |
| Change history | Fix “Unable to load” (migrations, RLS, validation); acceptance criteria and optional Retry UX. |
| Property address | Phase 1: free-text, max 200 chars; Phase 2 optional typeahead with provider and PII note. |
| Exchange | Default from symbol via simple mapping; user can change; document mapping source. |
| RSU P/L | Optional “Price at grant”; P/L = current value − (grant price × quantity); show N/A if no grant price. |
| Other / Rename | Remove Other from create; rename Investments → Other Investments; migrate or display existing Other as Other Investments. |
| Rounding | All currency 2 dp; calculated fields rounded to 2 dp. |
| Security | Max lengths and escape on render; RLS for all new columns. |

This addendum can sit alongside the main asset-fields requirements and the original panel review so that implementation and QA have a single set of clarified and recommended behaviours.

---

## 4. Price Refresh integration (assumed implemented)

The **Price Refresh** plan is assumed implemented. Current codebase state (verified):

- **DB:** Migration `20260216000000_add_price_caching.sql` adds `symbol_prices`, `user_price_refreshes`, and on `assets`: `last_price_fetched_at`, `price_source`, index `idx_assets_ticker_type`. Repo selects and maps these; fallback when columns missing.
- **Domain:** `Asset` includes `lastPriceFetchedAt`, `priceSource`.
- **Service:** `price-service.ts` uses `symbol_prices`, `mapAssetTypeToPriceAssetClass` (Stock, RSU, Crypto, Superannuation, Investments→stock), `getManualRefreshAvailability` (rolling 24h).
- **Edge:** `refresh-prices` function with CRON_SECRET auth.

**Implications for this spec:**

- The asset form **does not** implement current-price fetch or refresh; it only displays and allows override of `todaysPrice` / `value` as stored on the asset. No change required to that boundary.
- When renaming **Investments → Other Investments**, update the type→asset_class mapping in `price-service.ts` (or equivalent) so that `Other Investments` maps to the same asset class as today’s `Investments` (e.g. `stock`), to keep price refresh behaviour correct for existing and new “Other Investments” assets.

---

## 5. Verification: asset field plan unchanged

Given the current codebase (including price caching migration and price service), the **required code changes for the asset fields plan** are unchanged:

| Required change | Still valid? | Notes |
|-----------------|--------------|--------|
| Date picker: Controller / value+onChange for all asset date fields | Yes | AssetForm still uses `register()` only for optional dates; no conflict with price code. |
| Super/Retirement label by language and location, fallback Retirement | Yes | No overlap with price refresh. |
| As-at date: `value_as_at_date` on `asset_value_history`, set on save, show in UI | Yes | History table is separate from `symbol_prices` / assets price columns. |
| Change history: fix “Unable to load”, acceptance criteria, optional Retry | Yes | Repo/RLS/validation only; no price dependency. |
| Property address: Phase 1 free-text (e.g. max 200), Phase 2 optional typeahead | Yes | New field on assets; migration must add `address` (or similar); price columns already exist. |
| Exchange auto-select from symbol, user can change | Yes | Form-only behaviour; no price API in form. |
| RSU: optional “Price at grant”, P/L = current value − (grant price × quantity) | Yes | Form fields and display logic; current value may come from asset (refresh can set it). |
| Remove Other; rename Investments → Other Investments; migrate or display | Yes | Enum/UI and optional data migration; add “Other Investments” to type→asset_class map for price refresh. |
| Rounding: 2 dp for currency and calculated fields | Yes | Display/validation only. |
| Validation and RLS for new fields (address, property_type, etc.) | Yes | New columns get same RLS as existing assets columns. |

**Conclusion:** The asset fields spec and this addendum remain accurate. No scope reduction or change to the listed code changes is needed beyond (1) excluding price-update work and (2) updating the type→asset_class mapping when renaming to “Other Investments”.
