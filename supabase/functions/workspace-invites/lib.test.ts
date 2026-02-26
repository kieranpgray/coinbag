/**
 * Unit tests for workspace-invites lib
 *
 * Tests cover:
 * - getUserIdFromJwt (valid, invalid, malformed)
 * - userHasVerifiedEmail (verified, unverified, no match)
 */

import { describe, it, expect } from 'vitest';
import {
  getUserIdFromJwt,
  userHasVerifiedEmail,
  INVITE_EXPIRY_DAYS,
  VALID_ROLES,
} from './lib.ts';

function createJwt(payload: object): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const headerB64 = btoa(JSON.stringify(header));
  const payloadB64 = btoa(JSON.stringify(payload));
  return `${headerB64}.${payloadB64}.mock-signature`;
}

describe('workspace-invites lib', () => {
  describe('getUserIdFromJwt', () => {
    it('extracts sub from valid JWT', () => {
      const jwt = createJwt({ sub: 'user_abc123' });
      expect(getUserIdFromJwt(jwt)).toBe('user_abc123');
    });

    it('returns null for invalid base64 payload', () => {
      expect(getUserIdFromJwt('header.invalid!!!.sig')).toBeNull();
    });

    it('returns null for malformed token (too few parts)', () => {
      expect(getUserIdFromJwt('only-two-parts')).toBeNull();
    });

    it('returns null for empty string', () => {
      expect(getUserIdFromJwt('')).toBeNull();
    });

    it('returns null when sub is missing', () => {
      const jwt = createJwt({ email: 'a@b.com' });
      expect(getUserIdFromJwt(jwt)).toBeNull();
    });
  });

  describe('userHasVerifiedEmail', () => {
    it('returns true when user has verified matching email', () => {
      const user = {
        email_addresses: [
          { email_address: 'user@example.com', verification: { status: 'verified' } },
        ],
      };
      expect(userHasVerifiedEmail(user, 'user@example.com')).toBe(true);
    });

    it('returns true with case-insensitive match', () => {
      const user = {
        email_addresses: [
          { email_address: 'User@Example.COM', verification: { status: 'verified' } },
        ],
      };
      expect(userHasVerifiedEmail(user, 'user@example.com')).toBe(true);
    });

    it('returns false when email is not verified', () => {
      const user = {
        email_addresses: [
          { email_address: 'user@example.com', verification: { status: 'unverified' } },
        ],
      };
      expect(userHasVerifiedEmail(user, 'user@example.com')).toBe(false);
    });

    it('returns false when email does not match', () => {
      const user = {
        email_addresses: [
          { email_address: 'other@example.com', verification: { status: 'verified' } },
        ],
      };
      expect(userHasVerifiedEmail(user, 'user@example.com')).toBe(false);
    });

    it('returns false when email_addresses is empty', () => {
      const user = { email_addresses: [] };
      expect(userHasVerifiedEmail(user, 'user@example.com')).toBe(false);
    });

    it('returns false when email_addresses is undefined', () => {
      const user = {};
      expect(userHasVerifiedEmail(user, 'user@example.com')).toBe(false);
    });
  });

  describe('constants', () => {
    it('INVITE_EXPIRY_DAYS is 7', () => {
      expect(INVITE_EXPIRY_DAYS).toBe(7);
    });

    it('VALID_ROLES includes admin, edit, read', () => {
      expect(VALID_ROLES).toContain('admin');
      expect(VALID_ROLES).toContain('edit');
      expect(VALID_ROLES).toContain('read');
      expect(VALID_ROLES).toHaveLength(3);
    });
  });
});
