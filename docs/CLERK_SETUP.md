# Clerk Authentication Setup

This document outlines the Clerk authentication integration for the Coinbag application.

## Environment Variables

Add the following environment variables to your `.env` file:

```bash
# Clerk Authentication
VITE_CLERK_PUBLISHABLE_KEY=pk_test_your_clerk_publishable_key_here

# Clerk Redirect URLs (Recommended - see step 2 below)
CLERK_SIGN_IN_URL=/sign-in
CLERK_SIGN_UP_URL=/sign-up
CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/dashboard
CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/dashboard

# Data Source Toggle (for development)
VITE_DATA_SOURCE=mock  # Use 'supabase' when ready to switch to real backend
```

## Clerk Application Setup

1. **Create a Clerk Application**:
   - Go to [dashboard.clerk.com](https://dashboard.clerk.com)
   - Create a new application
   - Choose "React" as the framework
   - Configure sign-in/sign-up methods (email/password recommended)

2. **Configure Redirect URLs**:
   
   Clerk handles redirects automatically via **environment variables** (not dashboard settings). Add these to your `.env` file:
   
   ```bash
   # Required: Sign-in and sign-up page paths
   CLERK_SIGN_IN_URL=/sign-in
   CLERK_SIGN_UP_URL=/sign-up
   
   # Optional: Where to redirect after authentication (defaults to /)
   CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/dashboard
   CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/dashboard
   ```
   
   **Important**: 
   - Use **paths** (e.g., `/dashboard`), not full URLs
   - Clerk automatically uses your current protocol (HTTP or HTTPS)
   - No dashboard configuration needed - Clerk handles redirects automatically
   
   **📖 Detailed Instructions**: See [`docs/CLERK_REDIRECT_URLS_GUIDE.md`](./CLERK_REDIRECT_URLS_GUIDE.md) for complete configuration guide based on [Clerk's official documentation](https://clerk.com/docs/guides/development/customize-redirect-urls).

3. **Get Publishable Key**:
   - Copy the publishable key from your Clerk dashboard
   - Add it to your `.env` file as `VITE_CLERK_PUBLISHABLE_KEY`

## Code Architecture

### Provider Setup (`src/main.tsx`)
The entire application is wrapped with `ClerkProvider`:

```typescript
const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!PUBLISHABLE_KEY) {
  throw new Error("Missing Publishable Key");
}

<ClerkProvider publishableKey={PUBLISHABLE_KEY} afterSignOutUrl="/">
  <App />
</ClerkProvider>
```

### Route Protection (`src/App.tsx` and `src/components/layout/Layout.tsx`)
Routes are protected at the Layout level using Clerk's `SignedIn` component:

```typescript
// App.tsx - Routes are always rendered
<BrowserRouter>
  <ThemeProvider>
    <Routes />
  </ThemeProvider>
</BrowserRouter>

// Layout.tsx - Content is protected
<SignedIn>
  {/* Protected application layout */}
  <Header />
  <Sidebar />
  <main>
    <Outlet /> {/* Page content */}
  </main>
  <Footer />
</SignedIn>
```

Auth routes (`/sign-in`, `/sign-up`) are defined in `src/routes/index.tsx` and are accessible to all users.

### Auth Pages
- **Sign In** (`/sign-in`): `src/pages/auth/SignInPage.tsx`
- **Sign Up** (`/sign-up`): `src/pages/auth/SignUpPage.tsx`

Both pages use Clerk's pre-built components with custom styling to match the app's design system.

### User Management (`src/components/layout/Header.tsx`)
The header includes a `UserButton` component that provides:
- User avatar/profile access
- Account management
- Sign out functionality
- Automatic redirect to `/` after sign out (which redirects to sign-in for unauthenticated users)

### Two-Factor Authentication (2FA)
Two-factor authentication is managed entirely through Clerk:

1. **Enable 2FA in Clerk Dashboard**:
   - Go to your Clerk Dashboard → Authentication → Multi-factor
   - Enable TOTP (Time-based One-Time Password) or other MFA methods you want to support
   - Users can then enroll 2FA through their account settings

2. **User Experience**:
   - Users can view their 2FA status in Settings → Security
   - Click "Manage 2FA" to navigate to `/account` page where Clerk's `UserProfile` component provides full 2FA management
   - After enabling 2FA, users will be automatically prompted for the second factor during sign-in
   - The `SignIn` component automatically handles MFA challenges - no additional code needed

3. **Implementation Details**:
   - 2FA status is read from Clerk's `user.twoFactorEnabled` property (not stored in app preferences)
   - Account management page (`/account`) uses Clerk's `UserProfile` component for enrollment/management
   - Settings page shows read-only status badge (Enabled/Not enabled) with link to account management

## User Experience

### Authentication Flow
1. Unauthenticated users accessing protected routes are redirected to `/sign-in`
2. Users can sign in or create accounts
3. Successful authentication redirects to `/dashboard`
4. Authenticated users can access all application features
5. Sign out redirects to `/` (which then redirects unauthenticated users to `/sign-in`)

### Route Protection
- All main application routes (`/dashboard`, `/subscriptions`, etc.) require authentication
- Auth routes (`/sign-in`, `/sign-up`) are only accessible when signed out
- Invalid routes redirect to sign-in for unauthenticated users

## Testing Considerations

### Unit Tests
- Mock Clerk components for isolated testing
- Use `vi.mock('@clerk/clerk-react')` to mock auth state
- Test route protection logic separately

### Integration Tests
- Use Clerk test users for end-to-end testing
- Mock network requests for Supabase integration
- Test authentication state changes

## Development vs Production

### Development (`.env` file)

**Clerk Key**: Use **test key** (`pk_test_...`)
- **Why**: Production keys are domain-restricted and don't work on `localhost:5173`
- **Where to get**: Clerk Dashboard → API Keys → **Test** tab
- **Format**: `VITE_CLERK_PUBLISHABLE_KEY=pk_test_...`
- **Domain**: No restrictions (works on localhost)

**Example**:
```bash
# .env (development)
VITE_CLERK_PUBLISHABLE_KEY=pk_test_your_test_key_here
VITE_SUPABASE_URL=https://tislabgxitwtcqfwrpik.supabase.co  # DEV project
VITE_DATA_SOURCE=supabase
```

### Production (`.env.production` file)

**Clerk Key**: Use **production key** (`pk_live_...`)
- **Why**: Production keys are required for production deployments
- **Where to get**: Clerk Dashboard → API Keys → **Production** tab
- **Format**: `VITE_CLERK_PUBLISHABLE_KEY=pk_live_...`
- **Domain**: Restricted to `coinbag.app` and subdomains

**Example**:
```bash
# .env.production (production builds)
VITE_CLERK_PUBLISHABLE_KEY=pk_live_your_production_key_here
VITE_SUPABASE_URL=https://auvtsvmtfrbpvgyvfqlx.supabase.co  # PROD project
VITE_DATA_SOURCE=supabase
```

### Key Segregation Rules

**CRITICAL**: Never mix keys:
- ❌ **Don't** use production keys (`pk_live_...`) in `.env` (development)
- ❌ **Don't** use test keys (`pk_test_...`) in `.env.production` (production)
- ✅ **Do** use test keys in `.env` for local development
- ✅ **Do** use production keys in `.env.production` for production builds

### Validation

The app includes automatic validation:
- **Runtime**: Warns if production key detected in development mode
- **Build-time**: Fails if test key detected in production builds
- **Development script**: `npx tsx scripts/validate-dev-env.ts` checks your `.env` file

## Troubleshooting

### Common Issues
1. **"Missing Clerk publishable key"**: Ensure `VITE_CLERK_PUBLISHABLE_KEY` is set in `.env`
2. **Redirect loops**: Check that authorized redirect URLs are configured in Clerk dashboard
3. **Styling issues**: Clerk components inherit CSS variables; ensure theme is loaded

### Debug Mode
Enable Clerk debug logging by adding to your `.env`:
```bash
VITE_CLERK_DEBUG=true
```

## Security Notes

- Clerk handles all authentication securely
- JWT tokens are managed automatically
- No sensitive auth logic in client code
- Supabase will receive authenticated requests via Clerk JWT
