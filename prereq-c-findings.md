# Prerequisite C — Net Worth Month-over-Month Delta Check

**Date:** 2026-04-06  
**Scope:** Can the dashboard data layer support "+$X,XXX this month" / "−$X,XXX this month" / "Holding steady" copy states?

---

## 1. Verdict

**Delta NOT available as a pre-computed or API-returned field.**

There is no `previousNetWorth`, `netWorthDelta`, `monthOverMonth`, `previousPeriod`, or similar field anywhere in the API response, domain types, or component props.

However, the raw historical snapshot data IS available — a client-side MoM delta can be derived from the existing `useNetWorthHistory` hook with a small addition. See recommendation below.

---

## 2. Evidence — API / Query Response Shape

### `DashboardData` type (`src/types/domain.ts`, lines 368–395)

```ts
export interface DashboardData {
  netWorth: number;
  netWorthChange1D: number;   // 1-day % change — hash-derived, NOT real
  netWorthChange1W: number;   // 1-week % change — hash-derived, NOT real
  investments: number;
  // ... other fields
  // NO previousMonthNetWorth, netWorthDelta, monthOverMonth, or MoM field of any kind
}
```

### `netWorthChange1D` / `netWorthChange1W` are fake

In `src/features/dashboard/services/dashboardCalculations.ts` (lines 196–207), these values are **deterministically derived from a data hash**, with an explicit comment:

```ts
// Deterministic change calculations based on data characteristics
// In a real app, these would come from historical data comparison
const dataHash = `${totalAssets}-${totalLiabilities}-...`.split('').reduce(...);
const netWorthChange1D = ((dataHash % 200) - 100) / 100; // -1% to +1%
const netWorthChange1W = ((dataHash % 600) - 300) / 100; // -3% to +3%
```

These are **not real historical deltas** and should not be used for MoM copy.

### `NetWorthCard` props (`src/features/dashboard/components/NetWorthCard.tsx`, lines 23–31)

```ts
interface NetWorthCardProps {
  netWorth: number;
  totalAssets: number;
  totalLiabilities: number;
  change1D: number;
  change1W: number;  // passed but destructured as _change1D, _change1W (unused)
  isLoading?: boolean;
  isEmpty?: boolean;
}
```

`change1D` and `change1W` are received but immediately aliased with underscore prefix — they are **not rendered anywhere** in the current UI.

### `NetWorthSummary` props (`src/features/dashboard/components/NetWorthSummary.tsx`, lines 9–14)

```ts
interface NetWorthSummaryProps {
  netWorth: number;
  totalAssets: number;
  totalLiabilities: number;
  isLoading?: boolean;
  // NO delta field
}
```

No delta is passed or rendered in the summary panel.

### `NetWorthPoint` type (`src/features/dashboard/hooks/useNetWorthHistory.ts`, lines 12–15)

```ts
export interface NetWorthPoint {
  date: string; // ISO date string (YYYY-MM-DD format)
  value: number; // net worth value (can be negative)
}
```

The history hook returns `NetWorthPoint[]` — a plain time series. **No pre-computed delta is exposed.**

### Database schema — `net_worth_history` table

Columns selected in `src/data/netWorthHistory/supabaseRepo.ts` (line 22):

```
id, user_id, date, net_worth, total_assets, total_liabilities, created_at, updated_at
```

No `previous_net_worth`, `delta`, or `change` column exists.

### Supabase Edge Functions

No dashboard or net-worth-delta Edge Function exists. The only relevant functions are:
- `refresh-prices` — stock price updates
- `manual-refresh` — SnapTrade sync
- `process-statement` — OCR import
- `workspace-invites`, `snaptrade-*`, `workspace-member-profiles`

---

## 3. Field Name (if available)

**No field available.** Neither the API, the domain type, nor any component prop exposes a month-over-month or previous-period net worth value.

---

## 4. What IS Available (Derivation Path)

The `useNetWorthHistory` hook **already fetches up to 5 years of daily net worth snapshots** (real DB data merged with S&P-500-derived synthetic fill). This means a client-side MoM delta *can* be computed without any backend changes, by finding the snapshot closest to 30 days ago in the returned `data: NetWorthPoint[]` array.

**Derivation approach:**
```ts
const thirtyDaysAgo = subDays(new Date(), 30);
const previousPoint = historyData
  .filter(p => new Date(p.date) <= thirtyDaysAgo)
  .at(-1); // closest point at or before 30 days ago

const monthDelta = previousPoint
  ? currentNetWorth - previousPoint.value
  : null; // null = not enough history
```

**Caveat:** For users who have been tracking for fewer than 30 days, `previousPoint` may resolve to synthetic/S&P-derived data (not a real snapshot). The delta would be an estimate, not a factual comparison. This should be handled gracefully (e.g., "Holding steady this month" as fallback when history is insufficient).

---

## 5. Recommendation

**Implement in Wave 1b — client-side derivation from existing history hook.**

No backend changes are required. The `useNetWorthHistory` hook is already called inside `NetWorthCard` and returns the full history array needed to derive the delta.

### Implementation steps (no backend work needed):

1. In `NetWorthCard.tsx` (or `NetWorthSummary.tsx`), use the `filteredHistoryData` / `historyData` already in scope
2. Compute `monthDelta` by finding the snapshot ≈30 days ago (see derivation above)
3. Pass `monthDelta: number | null` down to `NetWorthSummary` as a new prop
4. In `NetWorthSummary.tsx`, render the copy state:
   - `monthDelta > 0` → "+$X,XXX this month"
   - `monthDelta < 0` → "−$X,XXX this month"
   - `monthDelta === 0 || monthDelta === null` → "Holding steady this month"

### Threshold for "Holding steady"

Define a materiality threshold (e.g., ±$1 or ±0.1%) to avoid showing "+$0 this month" due to rounding. Values within the threshold render as "Holding steady."

### Risk note

The delta will be synthetic/estimated for new users (< 30 days of real snapshots). Consider adding a data-age guard: only show the MoM copy if at least one real snapshot older than 30 days exists in the DB. Otherwise default to "Holding steady this month."

---

## 6. Backend Requirement (if deferred — NOT applicable here)

No backend change is required for Wave 1b using the client-side derivation path above.

If a server-computed delta is preferred in a future wave (for accuracy, performance, or multi-device consistency), the following would be needed:

- **Option A — DB query addition:** Add a `get_net_worth_month_delta(p_user_id uuid)` Postgres function that queries the `net_worth_history` table for the row closest to 30 days ago and returns `current_net_worth - previous_net_worth`
- **Option B — API field addition:** Extend `DashboardData` with `netWorthMonthDelta: number | null` and populate it in `dashboardApi.getData()` via a second query or a modified Supabase RPC call
- **Option C — New history endpoint field:** Return `previousMonthValue: number | null` from the `net_worth_history` list query when `startDate` covers ≥30 days
