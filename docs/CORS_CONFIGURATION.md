# CORS Configuration Guide

## Overview

This application requires CORS (Cross-Origin Resource Sharing) to be properly configured for production. This guide covers the configuration for both Supabase and Clerk.

## Supabase CORS Configuration

### Why This Is Required

Supabase enforces CORS policies to prevent unauthorized cross-origin requests. Without proper configuration, API requests from your production domain will be blocked.

### Configuration Steps

1. **Go to Supabase Dashboard**
   - Navigate to [https://app.supabase.com](https://app.supabase.com)
   - Select your production project

2. **Navigate to API Settings**
   - Go to **Settings** → **API** (in the left sidebar)
   - Scroll to **"CORS"** or **"Allowed Origins"** section

3. **Add Production Domain**
   - Add your production domain(s):
     ```
     https://your-app.vercel.app
     https://www.yourdomain.com
     https://yourdomain.com
     ```
   - **Important**: Include both `www` and non-`www` versions if applicable
   - **Important**: Include preview/staging domains if needed

4. **Remove Wildcard (If Present)**
   - **Never use** `*` (wildcard) in production
   - Wildcard allows all origins, which is a security risk
   - Use specific domains only

5. **Save Configuration**
   - Click **Save**
   - Wait 2-5 minutes for changes to propagate

### Verification

Test CORS configuration by making a request from your production domain:

```bash
# From your production domain's browser console:
fetch('https://your-project.supabase.co/rest/v1/assets', {
  headers: {
    'apikey': 'your-anon-key',
    'Authorization': 'Bearer your-jwt-token'
  }
})
.then(r => r.json())
.then(console.log)
.catch(console.error);
```

**Expected**: Request succeeds without CORS errors

**If CORS error**: Check that your domain is in the allowed origins list

## Clerk CORS Configuration

### Why This Is Required

Clerk handles authentication and requires redirect URLs to be configured for your production domain.

### Configuration Steps

1. **Go to Clerk Dashboard**
   - Navigate to [https://dashboard.clerk.com](https://dashboard.clerk.com)
   - Select your application

2. **Navigate to Paths**
   - Go to **Paths** (in the left sidebar)
   - Or go to **Settings** → **Paths**

3. **Configure Redirect URLs**
   - **Sign-in redirect**: Add your production domain
     ```
     https://your-app.vercel.app
     https://your-app.vercel.app/*
     ```
   - **Sign-up redirect**: Add your production domain
   - **After sign-out**: Add your production domain

4. **Configure Allowed Origins**
   - Go to **Settings** → **Domains**
   - Ensure your production domain is listed
   - Add if missing

5. **Save Configuration**
   - Click **Save**
   - Changes take effect immediately

### Verification

Test Clerk authentication from your production domain:

1. Navigate to your production app
2. Click "Sign In"
3. Complete authentication flow
4. Verify redirect works correctly

**Expected**: Authentication completes and redirects back to your app

**If redirect fails**: Check redirect URLs in Clerk dashboard

## Production Checklist

Before deploying to production, verify:

- [ ] Supabase CORS configured with production domain(s)
- [ ] Supabase wildcard (`*`) removed if present
- [ ] Clerk redirect URLs configured for production
- [ ] Clerk allowed origins include production domain
- [ ] Both `www` and non-`www` domains added (if applicable)
- [ ] Preview/staging domains added (if needed)
- [ ] CORS tested from production domain
- [ ] Authentication flow tested in production

## Troubleshooting

### CORS Error: "No 'Access-Control-Allow-Origin' header"

**Cause**: Domain not in Supabase allowed origins

**Solution**: 
1. Add domain to Supabase CORS settings
2. Wait 2-5 minutes for propagation
3. Clear browser cache and retry

### Authentication Redirect Fails

**Cause**: Redirect URL not configured in Clerk

**Solution**:
1. Add production domain to Clerk redirect URLs
2. Ensure URL matches exactly (including trailing slash if applicable)
3. Test authentication flow again

### Works in Development but Not Production

**Cause**: Different domains between dev and prod

**Solution**:
1. Ensure production domain is added to both Supabase and Clerk
2. Verify environment variables point to production instances
3. Check that production build uses correct API endpoints

## Security Best Practices

1. **Never use wildcard (`*`)** in production CORS settings
2. **Use specific domains only** - list each domain explicitly
3. **Include all variants** - `www` and non-`www`, `http` and `https`
4. **Remove unused domains** - clean up old/staging domains periodically
5. **Monitor CORS errors** - set up alerts for CORS failures
6. **Test regularly** - verify CORS after domain changes

## Additional Resources

- [Supabase CORS Documentation](https://supabase.com/docs/guides/api/cors)
- [Clerk Redirect URLs Guide](https://clerk.com/docs/authentication/redirect-urls)
- [MDN CORS Guide](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)

