# How to Configure Clerk Redirect URLs for HTTPS

This guide explains how to configure Clerk redirect URLs to work with HTTPS, based on [Clerk's official documentation](https://clerk.com/docs/guides/development/customize-redirect-urls).

## Understanding Clerk Redirects

Clerk handles redirects automatically. When a user clicks a sign-in or sign-up button, Clerk:
1. Persists the previous page's URL in a `redirect_url` query parameter
2. Redirects back to that page after authentication completes

For example: A user on `https://localhost:5173/foo` clicks sign-in → Clerk redirects to `https://localhost:5173/sign-in?redirect_url=https://localhost:5173/foo` → After sign-in, redirects back to `/foo`.

## Configuration Method: Environment Variables (Recommended)

According to Clerk's documentation, redirect URLs are configured via **environment variables**, not through the dashboard. This is the recommended approach.

### Step 1: Add Environment Variables to `.env`

Add these variables to your `.env` file:

```bash
# Clerk Sign-In/Sign-Up Page URLs (Required)
CLERK_SIGN_IN_URL=/sign-in
CLERK_SIGN_UP_URL=/sign-up

# Fallback Redirect URLs (Where to go if no redirect_url is present)
CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/dashboard
CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/dashboard

# Force Redirect URLs (Optional - always redirect here, overriding redirect_url)
# CLERK_SIGN_IN_FORCE_REDIRECT_URL=/dashboard
# CLERK_SIGN_UP_FORCE_REDIRECT_URL=/dashboard
```

**Important Notes:**
- Use **paths** (e.g., `/dashboard`), not full URLs (e.g., `https://localhost:5173/dashboard`)
- Clerk automatically uses your current domain/protocol
- If you're using HTTPS, Clerk will automatically use HTTPS URLs
- The `FORCE` variables override any `redirect_url` query parameter

### Step 2: Restart Your Dev Server

After adding environment variables, restart your dev server:

```bash
pnpm dev
```

### Step 3: Verify It Works

1. Visit `https://localhost:5173` (or any protected route)
2. You should be redirected to `/sign-in`
3. After signing in, you should be redirected to `/dashboard` (or the page you were on)

## Alternative: Component Props (Not Recommended)

You can also configure redirects via component props, but **environment variables are recommended**:

```tsx
// src/pages/auth/SignInPage.tsx
<SignIn
  path="/sign-in"
  routing="path"
  signUpUrl="/sign-up"
  fallbackRedirectUrl="/dashboard"  // Fallback if no redirect_url
  // forceRedirectUrl="/dashboard"  // Always redirect here (optional)
/>

// src/pages/auth/SignUpPage.tsx
<SignUp
  path="/sign-up"
  routing="path"
  signInUrl="/sign-in"
  fallbackRedirectUrl="/dashboard"  // Fallback if no redirect_url
  // forceRedirectUrl="/dashboard"  // Always redirect here (optional)
/>
```

**Note**: The current codebase uses the deprecated `redirectUrl` prop. Consider migrating to environment variables for better maintainability.

## Current Codebase Configuration

Looking at the current implementation:

- **`src/main.tsx`**: `ClerkProvider` has `afterSignOutUrl="/"` ✅
- **`src/pages/auth/SignInPage.tsx`**: Uses `redirectUrl="/dashboard"` prop (deprecated)
- **`src/pages/auth/SignUpPage.tsx`**: Uses `redirectUrl="/dashboard"` prop (deprecated)

### Recommended Migration

1. **Add environment variables** to `.env` (as shown above)
2. **Remove `redirectUrl` props** from `SignInPage.tsx` and `SignUpPage.tsx`
3. **Use `fallbackRedirectUrl`** if you want to keep component-level control, or rely on environment variables

## How Clerk Handles HTTPS

**Good News**: Clerk automatically handles HTTPS! You don't need to configure anything special in the dashboard.

- If your app runs on `https://localhost:5173`, Clerk will use HTTPS URLs
- If your app runs on `http://localhost:5173`, Clerk will use HTTP URLs
- Clerk respects the protocol of your current page

## No Dashboard Configuration Needed

Unlike some authentication providers, **Clerk does not require you to whitelist redirect URLs in the dashboard**. Clerk handles redirects automatically based on:

1. The `redirect_url` query parameter (if present)
2. Your configured fallback/force redirect URLs (environment variables or props)
3. The current page's protocol (HTTP or HTTPS)

## Troubleshooting

### Redirects Not Working with HTTPS

**Issue**: After switching to HTTPS, redirects don't work.

**Solution**: 
1. Ensure environment variables are set correctly in `.env`
2. Restart your dev server after changing `.env`
3. Clear browser cache and cookies
4. Check browser console for errors

### Still Redirecting to HTTP

**Issue**: Clerk redirects to HTTP even though you're using HTTPS.

**Solution**:
- Make sure you're accessing the app via `https://localhost:5173` (not `http://`)
- Check that your SSL certificates are properly configured
- Verify environment variables are loaded (check browser console)

### Redirect Loops

**Issue**: User gets stuck in a redirect loop.

**Solution**:
- Check that your redirect URLs are valid paths (e.g., `/dashboard`, not `https://localhost:5173/dashboard`)
- Ensure the target route exists and is accessible
- Check that `CLERK_SIGN_IN_URL` and `CLERK_SIGN_UP_URL` match your actual route paths

## Environment Variable Reference

| Variable | Description | Example | Required |
|----------|-------------|---------|----------|
| `CLERK_SIGN_IN_URL` | Path to sign-in page | `/sign-in` | Yes |
| `CLERK_SIGN_UP_URL` | Path to sign-up page | `/sign-up` | Yes |
| `CLERK_SIGN_IN_FALLBACK_REDIRECT_URL` | Redirect after sign-in if no `redirect_url` | `/dashboard` | No (defaults to `/`) |
| `CLERK_SIGN_UP_FALLBACK_REDIRECT_URL` | Redirect after sign-up if no `redirect_url` | `/dashboard` | No (defaults to `/`) |
| `CLERK_SIGN_IN_FORCE_REDIRECT_URL` | Always redirect here after sign-in | `/dashboard` | No |
| `CLERK_SIGN_UP_FORCE_REDIRECT_URL` | Always redirect here after sign-up | `/dashboard` | No |

## Additional Resources

- [Clerk Official Documentation: Customize Redirect URLs](https://clerk.com/docs/guides/development/customize-redirect-urls)
- [Clerk React SDK Reference](https://clerk.com/docs/references/react/overview)
