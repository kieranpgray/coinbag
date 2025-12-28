# Environment Banner and Debug Panel

## Overview

This document describes the environment banner and debug panel features implemented for non-production builds.

## Features

### 1. Environment Banner

**Location**: Top of screen (always visible in non-production)

**Visibility**:
- ✅ Visible in `development` mode
- ✅ Visible in `preview` mode  
- ❌ Hidden in `production` mode

**Display**:
- Shows environment name (DEV/PREVIEW) with color coding
- Yellow background for DEV
- Blue background for PREVIEW
- Minimal, non-intrusive design

**Component**: `src/components/shared/EnvironmentBanner.tsx`

### 2. Debug Panel

**Access Methods**:
1. **Konami Code**: ↑↑↓↓←→←→EnterSpace (keyboard sequence)
2. **Direct Route**: `/debug` (admin-only)

**Visibility**: Admin users only

**Information Displayed**:
- Environment name
- Data source (mock/supabase)
- API base URL (Supabase URL)
- DB project ID (extracted from Supabase URL)
- Schema/migration version (latest migration timestamp)
- Current user ID (from Clerk)
- Clerk user info (ID, email, admin status)

**Component**: `src/components/shared/DebugPanel.tsx`

## Admin Check

The debug panel uses multiple methods to determine admin status:

1. **Clerk publicMetadata**: `user.publicMetadata.isAdmin === true`
2. **Organization roles**: User has `org:admin` or `admin` role
3. **Environment variable**: User ID in `VITE_ADMIN_USER_IDS` (comma-separated)

**Utility**: `src/lib/adminCheck.ts`

## Migration Version Detection

The debug panel displays the latest migration version from:
- Static list of migration timestamps (from migration filenames)
- Format: `YYYYMMDDHHMMSS` → displayed as `YYYY-MM-DD HH:MM:SS`

**Utility**: `src/lib/migrationVersion.ts`

## Konami Code

The secret gesture to open the debug panel:
- Sequence: ↑↑↓↓←→←→EnterSpace
- Resets on wrong key or 3-second timeout
- Can be reactivated after completion

**Hook**: `src/hooks/useKonamiCode.ts`

## Files Created

1. `src/components/shared/EnvironmentBanner.tsx` - Environment banner component
2. `src/components/shared/DebugPanel.tsx` - Debug panel component
3. `src/lib/adminCheck.ts` - Admin check utility
4. `src/lib/migrationVersion.ts` - Migration version utilities
5. `src/hooks/useKonamiCode.ts` - Konami code detection hook
6. `src/pages/debug/DebugPage.tsx` - Debug route page component

## Files Modified

1. `src/App.tsx` - Added EnvironmentBanner and DebugPanel
2. `src/routes/index.tsx` - Added `/debug` route

## Test Files

1. `src/components/shared/__tests__/EnvironmentBanner.test.tsx`
2. `src/components/shared/__tests__/DebugPanel.test.tsx`
3. `src/lib/__tests__/adminCheck.test.ts`
4. `src/lib/__tests__/migrationVersion.test.ts`
5. `src/hooks/__tests__/useKonamiCode.test.tsx`
6. `src/__tests__/debug-route.test.tsx`

## Usage

### Setting Admin Users

**Option 1: Clerk Metadata**
```typescript
// In Clerk dashboard or via API
user.publicMetadata.isAdmin = true;
```

**Option 2: Organization Role**
```typescript
// User must have org:admin or admin role in Clerk organization
```

**Option 3: Environment Variable**
```bash
# In .env or production environment
VITE_ADMIN_USER_IDS=user_123,user_456
```

### Accessing Debug Panel

1. **Via Konami Code**: Press ↑↑↓↓←→←→EnterSpace anywhere in the app
2. **Via Route**: Navigate to `/debug` (redirects non-admins)

## Security Notes

- Debug panel is admin-only and will redirect non-admin users
- Environment banner only shows in non-production builds
- All sensitive information is only visible to authenticated admin users
- Migration version is static (doesn't expose database structure)

## Testing

Run tests with:
```bash
pnpm test src/components/shared/__tests__/EnvironmentBanner.test.tsx
pnpm test src/components/shared/__tests__/DebugPanel.test.tsx
pnpm test src/lib/__tests__/adminCheck.test.ts
pnpm test src/lib/__tests__/migrationVersion.test.ts
pnpm test src/hooks/__tests__/useKonamiCode.test.tsx
pnpm test src/__tests__/debug-route.test.tsx
```

