/**
 * Shared logic for workspace-invites Edge Function.
 * Exported for unit testing.
 */

/**
 * Extracts user_id (sub) from JWT payload. Does NOT verify the JWT.
 * JWT verification is performed by Supabase when the client is created with
 * this token. This function is only for extracting the sub claim from an
 * already-provided token that will be used for Supabase auth.
 */
export function getUserIdFromJwt(token: string): string | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1]));
    return payload.sub ?? null;
  } catch {
    return null;
  }
}

export function userHasVerifiedEmail(
  user: { email_addresses?: Array<{ email_address: string; verification?: { status: string } }> },
  email: string
): boolean {
  const normalized = email.toLowerCase().trim();
  const addrs = user.email_addresses ?? [];
  return addrs.some(
    (e) => e.email_address?.toLowerCase() === normalized && e.verification?.status === 'verified'
  );
}

export const INVITE_EXPIRY_DAYS = 7;

export type WorkspaceRole = 'admin' | 'edit' | 'read';

export const VALID_ROLES: WorkspaceRole[] = ['admin', 'edit', 'read'];
