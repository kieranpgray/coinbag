# Debug Repro Guide: Asset Deletion on "Add Investment" Flow

## Prerequisites

1. **Enable Debug Logging:**
   ```bash
   # In your .env file or environment:
   VITE_DEBUG_LOGGING=true
   ```

2. **Start Dev Server:**
   ```bash
   npm run dev
   ```

3. **Open Browser Console:**
   - Open DevTools (F12)
   - Go to Console tab
   - Clear console
   - Filter by `[DEBUG]`, `[INFO]`, `[WARN]`, `[ERROR]` if needed

## Step-by-Step Reproduction

### Step 1: Create Baseline Assets

1. Navigate to `/assets`
2. Click "ADD NEW ASSET"
3. Create **Asset A** (Real Estate):
   - Name: "My House"
   - Type: Real Estate
   - Value: 500000
   - Click "Create"
4. Verify Asset A appears in the list
5. **Note the correlation ID** from console logs (look for `corr-...`)

### Step 2: Create Second Asset

1. Still on `/assets` page
2. Click "ADD NEW ASSET"
3. Create **Asset B** (Vehicle):
   - Name: "My Car"
   - Type: Vehicles
   - Value: 30000
   - Click "Create"
4. Verify both Asset A and Asset B appear in the list
5. **Note the new correlation ID** (should be different from Step 1)

### Step 3: Navigate to Dashboard

1. Click "Dashboard" in sidebar or navigate to `/dashboard`
2. **Check console logs** for:
   - `NAV:ROUTE_CHANGE` - should show route change from `/assets` to `/dashboard`
   - Verify both assets still exist (check debug overlay in bottom-right)

### Step 4: Trigger "Add Investment" Flow

1. On dashboard, find the **"Investments & Crypto"** tile
2. Click **"Add investment"** button
3. **IMMEDIATELY note the correlation ID** from console:
   - Look for `NAV:DASHBOARD_ADD_INVESTMENT` log
   - Copy the `correlationId` value (e.g., `corr-1234567890-abc123`)
4. **Watch console logs** as navigation happens

### Step 5: Complete Investment Creation

1. Modal should open automatically (from query params)
2. Fill out investment form:
   - Name: "My Investment"
   - Type: Investments (should be pre-filled)
   - Value: 100000
   - Click "Create"
3. **Watch console logs** during creation

### Step 6: Verify Asset Deletion

1. After investment is created, check `/assets` page
2. **Observe:**
   - Do Asset A and Asset B still exist?
   - Or did they disappear?
3. **Check debug overlay** (bottom-right):
   - What is the "Assets" count?
   - What is the current correlation ID?

## What to Look For in Logs

### 🔴 Smoking Gun Signals (Deletion Indicators)

Look for these log entries that indicate deletion:

1. **DELETE Operations:**
   ```
   [WARN] {"scope":"DB:ASSET_DELETE","message":"Deleting asset",...}
   [WARN] {"scope":"MUTATION:ASSET_DELETE","message":"Deleting asset",...}
   ```
   - **If found:** Assets are being deleted at DB/repo level
   - **Action:** Check what triggered the delete

2. **Query Cache Clears:**
   ```
   [ERROR] {"scope":"QUERY:CLEAR","message":"CLEARING ALL QUERIES FROM CACHE",...}
   ```
   - **If found:** All cached data is being cleared
   - **Action:** Find what code calls `queryClient.clear()`

3. **Query Data Replacement:**
   ```
   [WARN] {"scope":"QUERY:SET_DATA","message":"Setting query data","operation":"REPLACE_DECREASE",...}
   ```
   - **If found:** Assets list is being replaced with smaller/empty array
   - **Action:** Find what code calls `queryClient.setQueryData(['assets'], ...)`

4. **List Replaced with Empty:**
   ```
   {"scope":"QUERY:ASSETS_LIST_BEFORE_AFTER","currentDataCount":2,"newDataCount":0}
   ```
   - **If found:** Assets list went from 2 to 0
   - **Action:** Check what mutation/effect caused this

5. **Repo Selection Switch:**
   ```
   {"scope":"DATA:REPO_SELECT","selectedRepo":"MockAssetsRepository",...}
   ```
   Then later:
   ```
   {"scope":"DATA:REPO_SELECT","selectedRepo":"SupabaseAssetsRepository",...}
   ```
   - **If found:** Repository switched mid-flow
   - **Action:** Check why `VITE_DATA_SOURCE` changed or repo selection logic

6. **Seed/Reset Called:**
   ```
   {"scope":"DATA:RESET","message":"Resetting assets",...}
   {"scope":"DATA:SEED","message":"Seeding assets",...}
   ```
   - **If found:** Data is being reset/seeded
   - **Action:** Find what code calls reset/seed functions

### 🟡 Warning Signals (Potential Issues)

1. **Multiple Repo Instances:**
   - Multiple `DATA:REPO_SELECT` logs with different instances
   - Could indicate repo is being recreated unnecessarily

2. **Effect Re-running:**
   - `NAV:ASSETS_PAGE_EFFECT` logs appearing multiple times
   - Check if `assets` is in dependency array (should NOT be)

3. **Query Invalidations:**
   - Multiple `QUERY:INVALIDATE` logs for `['assets']`
   - Could cause unnecessary refetches

### 🟢 Normal Signals (Expected Behavior)

These logs are **normal** and don't indicate deletion:

1. **Asset Creation:**
   ```
   [INFO] {"scope":"MUTATION:ASSET_CREATE","message":"Creating asset",...}
   [INFO] {"scope":"DB:ASSET_INSERT","message":"Asset added to in-memory array","operation":"push",...}
   ```
   - ✅ Normal: Asset is being created (additive operation)

2. **Query Invalidation After Create:**
   ```
   [INFO] {"scope":"MUTATION:ASSET_CREATE","message":"Invalidating queries after create",...}
   [INFO] {"scope":"QUERY:INVALIDATE","message":"Invalidating queries",...}
   ```
   - ✅ Normal: Cache is being invalidated to refetch fresh data

3. **Route Changes:**
   ```
   [INFO] {"scope":"NAV:ROUTE_CHANGE","message":"Route changed","from":"/dashboard","to":"/assets?create=1&type=Investments",...}
   ```
   - ✅ Normal: Navigation is happening as expected

## Collecting Logs

### Method 1: Browser Console

1. Right-click in console → "Save as..."
2. Save all console output
3. Filter by correlation ID:
   ```javascript
   // In console, filter logs:
   console.log(JSON.parse(logText).correlationId === 'corr-1234567890-abc123')
   ```

### Method 2: Copy Correlation ID Logs

1. Find the correlation ID from `NAV:DASHBOARD_ADD_INVESTMENT` log
2. In console, filter:
   ```javascript
   // All logs for this correlation ID
   // Look for entries with matching correlationId
   ```

### Method 3: Network Tab (if using Supabase)

1. Open Network tab
2. Filter by "supabase" or "assets"
3. Look for DELETE requests
4. Check request/response headers for correlation ID

## Expected Log Flow (Normal)

```
1. [INFO] NAV:DASHBOARD_ADD_INVESTMENT - Button clicked (corr-123)
2. [INFO] NAV:ROUTE_CHANGE - Route changed to /assets?create=1&type=Investments
3. [DEBUG] NAV:ASSETS_PAGE_EFFECT - Query params effect running
4. [INFO] NAV:ASSETS_PAGE_EFFECT - Opening create modal
5. [INFO] DATA:REPO_SELECT - MockAssetsRepository selected
6. [INFO] MUTATION:ASSET_CREATE - handleCreate called
7. [INFO] DB:ASSET_INSERT - Asset added (operation: push)
8. [INFO] MUTATION:ASSET_CREATE - Asset created successfully
9. [INFO] QUERY:INVALIDATE - Invalidating ['assets']
10. [DEBUG] QUERY:ASSETS_LIST - Assets list fetched (count: 3)
```

## Abnormal Log Flow (If Bug Occurs)

```
1. [INFO] NAV:DASHBOARD_ADD_INVESTMENT - Button clicked (corr-123)
2. [INFO] NAV:ROUTE_CHANGE - Route changed
3. [WARN] DB:ASSET_DELETE - Deleting asset (Asset A)  ← 🔴 DELETION!
4. [WARN] DB:ASSET_DELETE - Deleting asset (Asset B)  ← 🔴 DELETION!
5. [INFO] MUTATION:ASSET_CREATE - Creating investment
6. [DEBUG] QUERY:ASSETS_LIST - Assets list fetched (count: 1)  ← Only investment remains
```

## Debug Overlay

The debug overlay (bottom-right corner) shows:
- **Current route** (with query params highlighted)
- **Data source mode** (mock/supabase)
- **Correlation ID** (if active flow)
- **Cache counts** for all entity types

**Watch the overlay during Step 4-5:**
- Assets count should stay at 2, then become 3
- If it drops to 0 or 1, deletion occurred

## Next Steps After Collecting Logs

1. **If DELETE logs found:**
   - Find the code that calls `repository.remove()` or `assets.splice()`
   - Check what triggered it (mount effect? navigation? mutation?)

2. **If QUERY:CLEAR found:**
   - Find code calling `queryClient.clear()`
   - Should only be in tests, not production

3. **If QUERY:SET_DATA with REPLACE_DECREASE:**
   - Find code calling `queryClient.setQueryData(['assets'], ...)`
   - Check if it's replacing entire list instead of appending

4. **If repo switch found:**
   - Check `VITE_DATA_SOURCE` env var
   - Check repo factory function logic

5. **If no smoking gun found:**
   - Check timing: when do assets disappear?
   - Check if it's a UI-only issue (data exists but not shown)
   - Check filter/category logic

## Correlation ID Usage

All logs for the "Add Investment" flow will share the same correlation ID:
- Created when button is clicked
- Passed through all mutations
- Included in all DB operations
- Use it to filter logs: `correlationId === 'corr-1234567890-abc123'`

## Troubleshooting

**Logs not appearing?**
- Check `VITE_DEBUG_LOGGING=true` is set
- Restart dev server after setting env var
- Check browser console filter settings

**Correlation ID missing?**
- Should be created on "Add Investment" button click
- Check `SummaryCard.tsx` click handler
- Verify `setCorrelationId()` is called

**Debug overlay not showing?**
- Check `VITE_DEBUG_LOGGING=true`
- Check browser console for errors
- Verify `DebugOverlay` component is rendered in `App.tsx`

