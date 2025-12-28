# Troubleshooting Blank Page

If you're seeing a blank white page, follow these steps:

## Step 1: Check Browser Console

1. Open your browser's Developer Tools (F12 or Cmd+Option+I)
2. Go to the **Console** tab
3. Look for any red error messages
4. Copy any errors you see

Common errors to look for:
- `Missing Publishable Key`
- `Application blocked: Critical configuration errors`
- `Failed to load module`
- `Clerk` related errors

## Step 2: Check Network Tab

1. In Developer Tools, go to the **Network** tab
2. Refresh the page
3. Look for any failed requests (red status codes)
4. Check if `/src/main.tsx` is loading successfully

## Step 3: Verify Environment Variables

Check your `.env` file for:

1. **Duplicate Keys**: Make sure `VITE_CLERK_PUBLISHABLE_KEY` appears only ONCE
2. **Correct Format**: The key should start with `pk_test_` or `pk_live_`
3. **No Extra Characters**: Remove any trailing `$` or special characters

Example of CORRECT format:
```bash
VITE_CLERK_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxxxxxxxxxx
```

Example of INCORRECT format:
```bash
VITE_CLERK_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxxxxxxxxxx$
VITE_CLERK_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxxxxxxxxxx
VITE_CLERK_PUBLISHABLE_KEY=another_key_here
```

## Step 4: Restart Dev Server

After fixing `.env`:
1. Stop the dev server (Ctrl+C)
2. Restart: `pnpm dev`
3. Hard refresh browser (Cmd+Shift+R or Ctrl+Shift+R)

## Common Issues

### Issue: Duplicate VITE_CLERK_PUBLISHABLE_KEY

**Symptom**: Blank page, console shows Clerk errors

**Fix**: 
- Open `.env` file
- Remove duplicate `VITE_CLERK_PUBLISHABLE_KEY` entries
- Keep only ONE entry with the correct key
- Restart dev server

### Issue: Missing Clerk Key

**Symptom**: Console shows "Missing Publishable Key"

**Fix**:
- Add `VITE_CLERK_PUBLISHABLE_KEY=your_key_here` to `.env`
- Get your key from [Clerk Dashboard](https://dashboard.clerk.com)

### Issue: Environment Variables Not Loading

**Symptom**: Variables exist in `.env` but app doesn't see them

**Fix**:
- Make sure `.env` is in the project root (same directory as `package.json`)
- Restart dev server after changing `.env`
- Check that variables start with `VITE_` prefix

### Issue: JavaScript Module Errors

**Symptom**: Console shows "Failed to load module" or import errors

**Fix**:
- Clear browser cache
- Hard refresh (Cmd+Shift+R)
- Check that all dependencies are installed: `pnpm install`
- Restart dev server

## Still Not Working?

1. **Share Browser Console Errors**: Copy all red error messages
2. **Check Server Logs**: Look at terminal where `pnpm dev` is running
3. **Verify HTTPS Certificate**: If using HTTPS, make sure you accepted the certificate warning

