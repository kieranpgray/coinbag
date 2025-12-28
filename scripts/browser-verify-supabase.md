# Browser-Based Supabase Verification

Since Supabase requires Clerk authentication for full testing, use this browser console test:

## Quick Verification Steps

1. **Start dev server**:
   ```bash
   VITE_DEBUG_LOGGING=true npm run dev
   ```

2. **Open browser** and navigate to `http://localhost:5173`

3. **Sign in** with Clerk

4. **Open browser console** (F12) and run:

```javascript
// Test 1: Verify Supabase client can be created
const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

console.log('Supabase URL:', supabaseUrl);
console.log('Anon Key:', supabaseAnonKey?.substring(0, 30) + '...');

// Test 2: Check if assets table is accessible (should work with Clerk auth)
// This will be done automatically when you create an asset via the UI
```

## Expected Behavior

When you create an asset via the UI, you should see in console:

```
[INFO] DATA:REPO_SELECT - Assets repository selected - selectedRepo: "SupabaseAssetsRepository"
[INFO] DB:ASSET_INSERT - SupabaseAssetsRepository.create called
[INFO] DB:ASSET_INSERT - Asset created successfully in Supabase
```

If you see errors like:
- `"Authentication token expired"` → Clerk JWT not configured in Supabase
- `"Permission denied"` → RLS policies not working correctly
- `"relation assets does not exist"` → Migration not run

## Manual Test Checklist

- [ ] Dev server starts without errors
- [ ] Can sign in with Clerk
- [ ] Can navigate to `/assets` page
- [ ] Can create an asset
- [ ] Asset appears in list immediately
- [ ] Refresh page → asset still exists
- [ ] Close browser → reopen → login → asset persists
- [ ] Restart dev server → asset persists

