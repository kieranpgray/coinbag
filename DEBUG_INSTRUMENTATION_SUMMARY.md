# Debug Instrumentation Summary

## Overview

Comprehensive logging has been added to trace the "Add Investment" flow and identify the root cause of asset deletion. All logging is gated behind `VITE_DEBUG_LOGGING=true` environment variable.

## Files Added

### Core Logging Infrastructure

1. **`src/lib/logger.ts`** (NEW)
   - Structured logger with correlation ID support
   - Log levels: debug, info, warn, error
   - JSON format output
   - Sanitizes sensitive data
   - Tracks current correlation ID

2. **`src/lib/queryClientLogger.ts`** (NEW)
   - Wraps TanStack Query client methods
   - Logs: `invalidateQueries`, `setQueryData`, `removeQueries`, `clear`, `resetQueries`
   - Tracks before/after counts for arrays
   - Detects REPLACE vs APPEND operations

3. **`src/lib/supabaseLogger.ts`** (NEW)
   - Wraps Supabase table operations (for future use)
   - Logs: `insert`, `update`, `delete`, `upsert`
   - Tracks table name and operation type

4. **`src/components/shared/RouteChangeLogger.tsx`** (NEW)
   - Logs all route changes
   - Tracks navigation from → to
   - Includes query params and state

5. **`src/components/shared/DebugOverlay.tsx`** (NEW)
   - Visual debug overlay (bottom-right)
   - Shows: route, data source, correlation ID, cache counts
   - Updates in real-time

## Files Modified

### Navigation & Routing

1. **`src/App.tsx`**
   - Added `RouteChangeLogger` component
   - Added `DebugOverlay` component
   - Wrapped `queryClient` with logging wrapper
   - Added init log

2. **`src/features/dashboard/components/SummaryCard.tsx`**
   - Added click handler for "Add Investment" button
   - Creates correlation ID on click
   - Logs: `NAV:DASHBOARD_ADD_INVESTMENT`

### Data Layer

3. **`src/data/assets/repo.ts`**
   - Added logging to `createAssetsRepository()`
   - Logs: `DATA:REPO_SELECT`
   - Tracks: selected repo, data source, env var

4. **`src/data/assets/mockRepo.ts`**
   - Added logging to `create()` method
   - Logs: `DB:ASSET_INSERT` (before/after counts, operation type)
   - Added logging to `remove()` method
   - Logs: `DB:ASSET_DELETE` (before/after counts, operation type)

### Hooks & Mutations

5. **`src/features/assets/hooks/useAssets.ts`**
   - Added logging to `useAssets()` query
   - Logs: `QUERY:ASSETS_LIST` (fetch start/end, count)
   - Added logging to `useCreateAsset()` mutation
   - Logs: `MUTATION:ASSET_CREATE` (before/after counts, payload)
   - Added logging to `useDeleteAsset()` mutation
   - Logs: `MUTATION:ASSET_DELETE` (before/after counts, asset ID)
   - Logs query invalidations

6. **`src/features/assets/AssetsPage.tsx`**
   - Added logging to query params `useEffect`
   - Logs: `NAV:ASSETS_PAGE_EFFECT` (when effect runs, why)
   - Added logging to `handleCreate()`
   - Logs: `MUTATION:ASSET_CREATE` (handler called, success/error)
   - Removed old agent log code

## Log Scopes & What They Track

| Scope | Purpose | Key Information |
|-------|---------|------------------|
| `NAV:DASHBOARD_ADD_INVESTMENT` | Dashboard button click | Route, target href, correlation ID created |
| `NAV:ROUTE_CHANGE` | Route navigation | From → to, query params, state |
| `NAV:ASSETS_PAGE_EFFECT` | Query params effect | Should create, type, assets count, effect trigger |
| `DATA:REPO_SELECT` | Repository selection | Selected repo, data source mode, env var |
| `MUTATION:ASSET_CREATE` | Asset creation | Before/after counts, payload, repo method |
| `MUTATION:ASSET_DELETE` | Asset deletion | Before/after counts, asset ID, repo method |
| `DB:ASSET_INSERT` | DB insert operation | Operation type (push), before/after counts |
| `DB:ASSET_DELETE` | DB delete operation | Operation type (splice), before/after counts |
| `QUERY:INVALIDATE` | Query invalidation | Query key, current data count |
| `QUERY:SET_DATA` | Query data update | Query key, operation (APPEND/REPLACE), counts |
| `QUERY:REMOVE` | Query removal | Query key, current data count |
| `QUERY:CLEAR` | Cache clear | ⚠️ WARNING: All data cleared |
| `QUERY:ASSETS_LIST` | Assets list fetch | Count, fetch start/end |

## Correlation ID Flow

1. **Created:** When "Add Investment" button is clicked (`SummaryCard.tsx`)
2. **Stored:** In logger module (`setCorrelationId()`)
3. **Used:** Automatically included in all subsequent logs
4. **Traced:** Can filter logs by correlation ID to see full flow

## Example Log Trace (Normal Flow)

```json
{"timestamp":"2024-01-15T10:30:00.000Z","level":"info","scope":"NAV:DASHBOARD_ADD_INVESTMENT","message":"Add Investment button clicked","correlationId":"corr-1705315800000-abc123","route":"/dashboard","data":{"currentRoute":"/dashboard","targetRoute":"/assets?create=1&type=Investments","title":"Investments & Crypto"}}

{"timestamp":"2024-01-15T10:30:00.100Z","level":"info","scope":"NAV:ROUTE_CHANGE","message":"Route changed","correlationId":"corr-1705315800000-abc123","route":"/assets?create=1&type=Investments","data":{"from":"/dashboard","to":"/assets?create=1&type=Investments","pathname":"/assets","search":"?create=1&type=Investments"}}

{"timestamp":"2024-01-15T10:30:00.200Z","level":"debug","scope":"NAV:ASSETS_PAGE_EFFECT","message":"Query params effect running","correlationId":"corr-1705315800000-abc123","route":"/assets?create=1&type=Investments","data":{"shouldCreate":true,"type":"Investments","assetsCount":2}}

{"timestamp":"2024-01-15T10:30:00.300Z","level":"info","scope":"DATA:REPO_SELECT","message":"Assets repository selected","correlationId":"corr-1705315800000-abc123","data":{"dataSource":"mock","selectedRepo":"MockAssetsRepository"}}

{"timestamp":"2024-01-15T10:30:05.000Z","level":"info","scope":"MUTATION:ASSET_CREATE","message":"Creating asset","correlationId":"corr-1705315800000-abc123","data":{"assetType":"Investments","assetsBeforeCount":2}}

{"timestamp":"2024-01-15T10:30:05.100Z","level":"info","scope":"DB:ASSET_INSERT","message":"Asset added to in-memory array","correlationId":"corr-1705315800000-abc123","data":{"operation":"push","assetsAfterCount":3}}

{"timestamp":"2024-01-15T10:30:05.200Z","level":"info","scope":"QUERY:INVALIDATE","message":"Invalidating queries","correlationId":"corr-1705315800000-abc123","data":{"queryKey":"[\"assets\"]","currentDataCount":2}}
```

## Smoking Gun Indicators

### If Assets Are Deleted, Look For:

1. **`DB:ASSET_DELETE`** logs
   - Indicates deletion at repository level
   - Check `assetsBeforeCount` vs `assetsAfterCount`

2. **`QUERY:CLEAR`** logs
   - Indicates all cache cleared
   - Should NEVER appear in production

3. **`QUERY:SET_DATA`** with `operation: "REPLACE_DECREASE"`
   - Indicates list replaced with smaller array
   - Check what code calls `setQueryData`

4. **`QUERY:REMOVE`** for `['assets']`
   - Indicates assets query removed from cache
   - Check what triggers removal

5. **Multiple `DATA:REPO_SELECT`** with different repos
   - Indicates repo switching mid-flow
   - Check env var or selection logic

## How to Use

1. **Enable logging:**
   ```bash
   export VITE_DEBUG_LOGGING=true
   npm run dev
   ```

2. **Reproduce the issue** following `DEBUG_REPRO_GUIDE.md`

3. **Collect logs:**
   - Copy console output
   - Filter by correlation ID
   - Look for smoking gun indicators

4. **Analyze:**
   - Find first DELETE/REPLACE/CLEAR log
   - Trace back to what triggered it
   - Check correlation ID to see full flow

## Debug Overlay

The overlay shows:
- **Route:** Current path + query params (highlighted)
- **Data Source:** mock (yellow) or supabase (green)
- **Correlation ID:** Active flow ID (blue)
- **Cache Counts:** Real-time entity counts (green if >0, red if 0)

**Watch during reproduction:**
- Assets count should: 2 → 3 (after creating investment)
- If it goes: 2 → 0 or 2 → 1, deletion occurred

## Next Steps

After collecting logs:
1. Identify the first DELETE/REPLACE/CLEAR operation
2. Find the code that triggered it
3. Determine why it's being called
4. Fix the root cause

The logs will show:
- ✅ What route/handler runs
- ✅ What mutation/repo methods run
- ✅ Whether deletion is at DB level or cache level
- ✅ What specific code line triggers deletion

