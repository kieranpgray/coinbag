# Asset Fields Update — Implementation Summary

All tasks from the spec addendum have been implemented and the build passes.

## 1. Database migrations

- **20260216120000_add_asset_value_as_at_date.sql** — Adds `value_as_at_date` to `asset_value_history`; updates `log_asset_value_change()` to set it to `CURRENT_DATE` on insert.
- **20260216120001_add_assets_address_property_grant_price.sql** — Adds `address`, `property_type`, and `grant_price` to `assets`.
- **20260216120002_rename_investments_remove_other.sql** — Migrates `Other` and `Investments` to `Other Investments`; updates type CHECK to valid list (no Other, no Investments).

## 2. Domain and contracts

- **Asset** (`src/types/domain.ts`): type union now `'Other Investments' | ...` (no `Investments` or `Other`); added `address?`, `propertyType?`, `grantPrice?`.
- **AssetValueHistory**: added `valueAsAtDate?: string | null`.
- **Contracts** (`src/contracts/assets.ts`): `assetTypeSchema` updated; `addressSchema` (max 200), `propertyTypeSchema` (max 100), `grantPriceSchema`; create/update/entity schemas include new fields; history schema includes `valueAsAtDate`; RSU vesting date optional; Stock purchase price optional; Real Estate address required in superRefine.

## 3. Repo

- **supabaseRepo**: select columns and mappings for `address`, `property_type`, `grant_price`, `value_as_at_date`; create/update send new fields; history inserts include `value_as_at_date` (default from `dateAdded` or today); allowed types updated; RSU vesting no longer required in repo check.

## 4. Asset form

- **DatePicker**: All date fields use `Controller` with `value` and `onChange`; optional dates use `allowClear` and placeholder "Optional" (purchase date, grant date, vesting date, crypto purchase date).
- **Type dropdown**: "Other" removed; "Investments" replaced by "Other Investments"; Superannuation label is "Superannuation" for en-AU and "Retirement" otherwise (via `useLocale()`).
- **Per-type sections**:
  - Vehicle: Name, Current value, Notes.
  - Real Estate: Address, Current value, Property type (optional), Notes.
  - Other Investments: Name, Current value, Notes.
  - Cash: Balance, Notes.
  - Superannuation/Retirement: Fund name, Balance, Notes.
  - Stock: Ticker, Exchange (auto from locale), Quantity, Purchase price (optional), Purchase date (optional), Current price, Current value (calculated), Unrealised P/L (calculated), Notes.
  - RSU: Ticker, Exchange, Quantity, Current price, Price at grant (optional), Grant date (optional), Vesting date (optional), Current value (calculated), Unrealised P/L (calculated), Notes.
  - Crypto: Coin, Quantity, Purchase price (optional), Purchase date (optional), Current value, Unrealised P/L (calculated), Notes.
- **Exchange auto-select**: When ticker is set and exchange is empty, default is ASX for en-AU and NASDAQ otherwise.
- **Rounding**: Calculated values and submitted values rounded to 2 decimal places.
- **Submit**: Real Estate sends `address`, `propertyType`; Cash sends name "Cash"; RSU sends `grantPrice`; Stock sends `todaysPrice` and optional `purchasePrice`/`purchaseDate`.

## 5. Change history

- **AssetChangeLog**: Displays "Value as at &lt;date&gt;" using `valueAsAtDate` or `createdAt`; CSV export includes "Value as at" column; error state shows a "Retry" button that calls `refetch()`.

## 6. Price service

- **price-service.ts**: `ASSET_TYPE_TO_CLASS` includes `'Other Investments': 'stock'` (and legacy `Investments` for backward compatibility).

## 7. References to old types

- **AssetsPage**: Type filter and URL type check use new type list; asset categories include "Other Investments", "Stock", "RSU" (no Other/Investments).
- **dashboardCalculations.ts**, **optimisticUpdates.ts**, **api.ts**, **mocks/factories.ts**: "Investments" replaced with "Other Investments".
- **assetAllocation.ts**: Colors and icons use "Other Investments"; "Other" removed; fallback is "Other Investments"; sort no longer pushes "Other" last.
- **import/utils.ts**: `VALID_ASSET_TYPES` and typeMap use "Other Investments"; "other"/"others"/"misc" map to "Other Investments".
- **AssetPortfolioSection**: `ASSET_CATEGORIES` updated.
- **Tests**: P0DashboardAddInvestmentFlow and AssetForm.test use "Other Investments".

## Validation

- `npm run build` completes successfully (tsc and vite build).
- All 11 todos completed.
