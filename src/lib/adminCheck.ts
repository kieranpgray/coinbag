/**
 * Admin Check Utility
 * 
 * Determines if the current user is an admin using multiple methods:
 * 1. Clerk publicMetadata.isAdmin field
 * 2. Clerk organization memberships with admin role
 * 3. Environment variable allowlist (VITE_ADMIN_USER_IDS)
 */

// User type from Clerk - using the user object from useUser hook
type User = {
  id: string;
  publicMetadata?: Record<string, unknown>;
  organizationMemberships?: Array<{ role: string }>;
} | null | undefined;

/**
 * Check if a user is an admin
 * @param user - Clerk user object
 * @returns true if user is admin, false otherwise
 */
export function isAdmin(user: User | null | undefined): boolean {
  if (!user) {
    return false;
  }

  // Method 1: Check publicMetadata.isAdmin
  if (user.publicMetadata?.isAdmin === true) {
    return true;
  }

  // Method 2: Check organization memberships for admin role
  if (user.organizationMemberships) {
    const hasAdminRole = user.organizationMemberships.some(
      (membership: { role: string }) => membership.role === 'org:admin' || membership.role === 'admin'
    );
    if (hasAdminRole) {
      return true;
    }
  }

  // Method 3: Check environment variable allowlist
  const adminUserIds = import.meta.env.VITE_ADMIN_USER_IDS;
  if (adminUserIds && user.id) {
    const allowedIds = String(adminUserIds).split(',').map((id: string) => id.trim());
    if (allowedIds.includes(user.id)) {
      return true;
    }
  }

  return false;
}

