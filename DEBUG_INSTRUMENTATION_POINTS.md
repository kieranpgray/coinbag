# Debug Instrumentation Points

## Complete List of Instrumentation Points

### Navigation & Routing

| File | Line | Scope | What It Logs |
|------|------|-------|--------------|
| `src/features/dashboard/components/SummaryCard.tsx` | 33-47 | `NAV:DASHBOARD_ADD_INVESTMENT` | Button click, target route, correlation ID creation |
| `src/components/shared/RouteChangeLogger.tsx` | 15-30 | `NAV:ROUTE_CHANGE` | All route changes, from → to, query params |
| `src/features/assets/AssetsPage.tsx` | 38-80 | `NAV:ASSETS_PAGE_EFFECT` | Query params effect execution, modal opening |

### Repository Selection

| File | Line | Scope | What It Logs |
|------|------|-------|--------------|
| `src/data/assets/repo.ts` | 64-76 | `DATA:REPO_SELECT` | Selected repo, data source mode, env var |

### Mutations

| File | Line | Scope | What It Logs |
|------|------|-------|--------------|
| `src/features/assets/hooks/useAssets.ts` | 53-95 | `MUTATION:ASSET_CREATE` | Before/after counts, payload, success/error |
| `src/features/assets/hooks/useAssets.ts` | 138-175 | `MUTATION:ASSET_DELETE` | Asset ID, before/after counts, success/error |
| `src/features/assets/AssetsPage.tsx` | 96-125 | `MUTATION:ASSET_CREATE` | Handler called, assets before, modal state |

### Database Operations

| File | Line | Scope | What It Logs |
|------|------|-------|--------------|
| `src/data/assets/mockRepo.ts` | 127-163 | `DB:ASSET_INSERT` | Operation type (push), before/after counts |
| `src/data/assets/mockRepo.ts` | 178-220 | `DB:ASSET_DELETE` | Operation type (splice), before/after counts |

### Query Cache Operations

| File | Line | Scope | What It Logs |
|------|------|-------|--------------|
| `src/lib/queryClientLogger.ts` | 20-35 | `QUERY:INVALIDATE` | Query key, current data count |
| `src/lib/queryClientLogger.ts` | 38-60 | `QUERY:SET_DATA` | Query key, operation type, before/after counts |
| `src/lib/queryClientLogger.ts` | 64-80 | `QUERY:REMOVE` | Query key, current data count |
| `src/lib/queryClientLogger.ts` | 84-95 | `QUERY:CLEAR` | ⚠️ WARNING: All cache cleared |
| `src/lib/queryClientLogger.ts` | 99-115 | `QUERY:RESET` | Query key, current data count |
| `src/features/assets/hooks/useAssets.ts` | 10-19 | `QUERY:ASSETS_LIST` | Fetch start/end, count |

### UI Components

| File | Line | Scope | What It Logs |
|------|------|-------|--------------|
| `src/components/shared/DebugOverlay.tsx` | 1-100 | Visual overlay | Route, data source, correlation ID, cache counts |

## Correlation ID Flow

1. **Created:** `SummaryCard.tsx:33` - When "Add Investment" clicked
2. **Stored:** `logger.ts:setCorrelationId()` - Global state
3. **Used:** Automatically included in all logs via `getCorrelationId()`
4. **Traced:** Filter logs by `correlationId` field

## Log Format

All logs follow this JSON structure:
```json
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "level": "info|debug|warn|error",
  "scope": "SCOPE:ACTION",
  "message": "Human-readable message",
  "correlationId": "corr-1705315800000-abc123",
  "route": "/assets?create=1&type=Investments",
  "userId": "user_123",
  "data": {
    // Context-specific data
  }
}
```

## Example: Complete Flow Trace

When user clicks "Add Investment" from dashboard:

```
1. NAV:DASHBOARD_ADD_INVESTMENT (corr-123 created)
   → SummaryCard.tsx:33
   → Logs: button clicked, target route

2. NAV:ROUTE_CHANGE (corr-123)
   → RouteChangeLogger.tsx:15
   → Logs: /dashboard → /assets?create=1&type=Investments

3. NAV:ASSETS_PAGE_EFFECT (corr-123)
   → AssetsPage.tsx:38
   → Logs: effect runs, shouldCreate=true, assetsCount=2

4. DATA:REPO_SELECT (corr-123)
   → repo.ts:64
   → Logs: MockAssetsRepository selected

5. MUTATION:ASSET_CREATE (corr-123)
   → AssetsPage.tsx:96
   → Logs: handleCreate called, assetsBeforeCount=2

6. MUTATION:ASSET_CREATE (corr-123)
   → useAssets.ts:53
   → Logs: mutationFn called, assetsBeforeCount=2

7. DB:ASSET_INSERT (corr-123)
   → mockRepo.ts:127
   → Logs: operation=push, assetsAfterCount=3

8. QUERY:INVALIDATE (corr-123)
   → queryClientLogger.ts:20
   → Logs: invalidating ['assets'], currentDataCount=2

9. QUERY:ASSETS_LIST (corr-123)
   → useAssets.ts:10
   → Logs: fetched, count=3
```

## How to Filter Logs

### By Correlation ID
```javascript
// In browser console, filter:
console.logs.filter(log => 
  JSON.parse(log.replace(/^\[.*?\] /, '')).correlationId === 'corr-1234567890-abc123'
)
```

### By Scope
```javascript
// Find all deletion operations:
console.logs.filter(log => 
  JSON.parse(log.replace(/^\[.*?\] /, '')).scope.includes('DELETE')
)
```

### By Operation Type
```javascript
// Find all REPLACE operations:
console.logs.filter(log => {
  const parsed = JSON.parse(log.replace(/^\[.*?\] /, ''));
  return parsed.data?.operation === 'REPLACE_DECREASE';
})
```

## Verification Checklist

After implementing, verify:

- [ ] `VITE_DEBUG_LOGGING=true` enables all logs
- [ ] Correlation ID created on "Add Investment" click
- [ ] Correlation ID appears in all subsequent logs
- [ ] Debug overlay shows in bottom-right corner
- [ ] Route changes are logged
- [ ] Repo selection is logged
- [ ] Mutations are logged (before/after counts)
- [ ] Query cache operations are logged
- [ ] DB operations are logged (insert/delete)

## Next Steps

1. Enable `VITE_DEBUG_LOGGING=true`
2. Reproduce the issue following `DEBUG_REPRO_GUIDE.md`
3. Collect logs filtered by correlation ID
4. Look for smoking gun indicators
5. Identify root cause from logs
6. Fix the issue

