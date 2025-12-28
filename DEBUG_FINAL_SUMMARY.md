# Debug Logging Implementation - Final Summary

## ✅ Implementation Complete

Comprehensive verbose logging has been added to trace the "Add Investment" flow and identify the root cause of asset deletion. All logging is gated behind `VITE_DEBUG_LOGGING=true`.

## Files Created

1. **`src/lib/logger.ts`** - Core logging utility with correlation ID support
2. **`src/lib/queryClientLogger.ts`** - TanStack Query cache operation logger
3. **`src/lib/supabaseLogger.ts`** - Supabase DB operation logger (for future use)
4. **`src/components/shared/RouteChangeLogger.tsx`** - Route change logger
5. **`src/components/shared/DebugOverlay.tsx`** - Visual debug overlay component
6. **`DEBUG_REPRO_GUIDE.md`** - Step-by-step reproduction guide
7. **`DEBUG_INSTRUMENTATION_SUMMARY.md`** - Complete instrumentation details
8. **`DEBUG_INSTRUMENTATION_POINTS.md`** - File-by-file instrumentation reference

## Files Modified

1. **`src/App.tsx`** - Added RouteChangeLogger, DebugOverlay, queryClient wrapper
2. **`src/features/dashboard/components/SummaryCard.tsx`** - Added click handler with correlation ID
3. **`src/data/assets/repo.ts`** - Added repo selection logging
4. **`src/data/assets/mockRepo.ts`** - Added DB operation logging (insert/delete)
5. **`src/features/assets/hooks/useAssets.ts`** - Added mutation and query logging
6. **`src/features/assets/AssetsPage.tsx`** - Added effect and handler logging

## Key Features

### 1. Correlation ID Tracking
- Created when "Add Investment" button is clicked
- Automatically included in all subsequent logs
- Allows tracing one user action across the entire flow

### 2. Comprehensive Logging Scopes

| Scope | Purpose |
|-------|---------|
| `NAV:*` | Navigation and routing events |
| `DATA:REPO_SELECT` | Repository selection |
| `MUTATION:*` | All mutation operations |
| `DB:*` | Database operations (insert/delete) |
| `QUERY:*` | Query cache operations |

### 3. Debug Overlay
- Visual indicator in bottom-right corner
- Shows: route, data source, correlation ID, cache counts
- Updates in real-time

### 4. Query Cache Monitoring
- Logs all `invalidateQueries`, `setQueryData`, `removeQueries`, `clear` calls
- Tracks before/after counts
- Detects REPLACE vs APPEND operations

## How to Use

### Enable Logging

```bash
# Set environment variable
export VITE_DEBUG_LOGGING=true

# Or add to .env file:
VITE_DEBUG_LOGGING=true

# Restart dev server
npm run dev
```

### Reproduce Issue

Follow `DEBUG_REPRO_GUIDE.md`:
1. Create Asset A and Asset B
2. Navigate to dashboard
3. Click "Add Investment"
4. Complete investment creation
5. Observe if assets disappear

### Collect Logs

1. Open browser console
2. Filter by correlation ID (from `NAV:DASHBOARD_ADD_INVESTMENT` log)
3. Look for smoking gun indicators:
   - `DB:ASSET_DELETE` - Deletion at DB level
   - `QUERY:CLEAR` - Cache cleared
   - `QUERY:SET_DATA` with `REPLACE_DECREASE` - List replaced

## Example Log Trace

```json
// Step 1: Button clicked
{"scope":"NAV:DASHBOARD_ADD_INVESTMENT","correlationId":"corr-123","message":"Add Investment button clicked"}

// Step 2: Route changed
{"scope":"NAV:ROUTE_CHANGE","correlationId":"corr-123","message":"Route changed","data":{"from":"/dashboard","to":"/assets?create=1&type=Investments"}}

// Step 3: Effect runs
{"scope":"NAV:ASSETS_PAGE_EFFECT","correlationId":"corr-123","message":"Query params effect running","data":{"assetsCount":2}}

// Step 4: Repo selected
{"scope":"DATA:REPO_SELECT","correlationId":"corr-123","message":"Assets repository selected","data":{"selectedRepo":"MockAssetsRepository"}}

// Step 5: Create mutation
{"scope":"MUTATION:ASSET_CREATE","correlationId":"corr-123","message":"Creating asset","data":{"assetsBeforeCount":2}}

// Step 6: DB insert
{"scope":"DB:ASSET_INSERT","correlationId":"corr-123","message":"Asset added to in-memory array","data":{"operation":"push","assetsAfterCount":3}}

// Step 7: Query invalidation
{"scope":"QUERY:INVALIDATE","correlationId":"corr-123","message":"Invalidating queries","data":{"queryKey":"[\"assets\"]"}}
```

## Smoking Gun Indicators

If assets are deleted, logs will show:

1. **`DB:ASSET_DELETE`** - Deletion at repository level
2. **`QUERY:CLEAR`** - All cache cleared (should never happen)
3. **`QUERY:SET_DATA`** with `operation: "REPLACE_DECREASE"` - List replaced
4. **`QUERY:REMOVE`** for `['assets']` - Query removed from cache
5. **Repo switch** - Multiple `DATA:REPO_SELECT` with different repos

## Verification

After enabling logging and reproducing:

- ✅ All navigation events logged
- ✅ All mutations logged with before/after counts
- ✅ All query cache operations logged
- ✅ All DB operations logged
- ✅ Correlation ID appears in all logs
- ✅ Debug overlay shows real-time counts

## Next Steps

1. **Enable logging:** `VITE_DEBUG_LOGGING=true`
2. **Reproduce:** Follow `DEBUG_REPRO_GUIDE.md`
3. **Collect logs:** Filter by correlation ID
4. **Analyze:** Find first DELETE/REPLACE/CLEAR operation
5. **Fix:** Identify root cause and implement fix

## Documentation

- **`DEBUG_REPRO_GUIDE.md`** - How to reproduce and collect logs
- **`DEBUG_INSTRUMENTATION_SUMMARY.md`** - Complete instrumentation details
- **`DEBUG_INSTRUMENTATION_POINTS.md`** - File-by-file reference

## Status: ✅ READY FOR DEBUGGING

All instrumentation is in place. Enable `VITE_DEBUG_LOGGING=true` and reproduce the issue to collect logs that will reveal the root cause.

