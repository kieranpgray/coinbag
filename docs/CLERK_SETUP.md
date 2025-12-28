# Clerk Authentication Setup

This document outlines the Clerk authentication integration for the Moneybags application.

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

### Development
- Use Clerk's test environment
- Mock data source (`VITE_DATA_SOURCE=mock`)
- Fast development with local data

### Production
- Use Clerk's production environment
- Switch to Supabase data source (`VITE_DATA_SOURCE=supabase`)
- Ensure proper error handling for auth failures

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
