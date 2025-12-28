import { describe, it, expect, beforeEach, vi } from 'vitest';
import { isAdmin } from '../adminCheck';
import type { User } from '@clerk/clerk-react';

describe('adminCheck', () => {
  const originalEnv = import.meta.env.VITE_ADMIN_USER_IDS;

  beforeEach(() => {
    // Reset env var
    Object.defineProperty(import.meta, 'env', {
      value: {
        ...import.meta.env,
        VITE_ADMIN_USER_IDS: undefined,
      },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    Object.defineProperty(import.meta, 'env', {
      value: {
        ...import.meta.env,
        VITE_ADMIN_USER_IDS: originalEnv,
      },
      writable: true,
      configurable: true,
    });
  });

  it('returns false for null user', () => {
    expect(isAdmin(null)).toBe(false);
  });

  it('returns false for undefined user', () => {
    expect(isAdmin(undefined)).toBe(false);
  });

  it('returns true if publicMetadata.isAdmin is true', () => {
    const user = {
      id: 'user_123',
      publicMetadata: { isAdmin: true },
    } as User;

    expect(isAdmin(user)).toBe(true);
  });

  it('returns false if publicMetadata.isAdmin is false', () => {
    const user = {
      id: 'user_123',
      publicMetadata: { isAdmin: false },
    } as User;

    expect(isAdmin(user)).toBe(false);
  });

  it('returns true if user has admin organization role', () => {
    const user = {
      id: 'user_123',
      organizationMemberships: [
        {
          role: 'org:admin',
        },
      ],
    } as User;

    expect(isAdmin(user)).toBe(true);
  });

  it('returns true if user has admin role (without org: prefix)', () => {
    const user = {
      id: 'user_123',
      organizationMemberships: [
        {
          role: 'admin',
        },
      ],
    } as User;

    expect(isAdmin(user)).toBe(true);
  });

  it('returns false if user has non-admin organization role', () => {
    const user = {
      id: 'user_123',
      organizationMemberships: [
        {
          role: 'member',
        },
      ],
    } as User;

    expect(isAdmin(user)).toBe(false);
  });

  it('returns true if user ID is in VITE_ADMIN_USER_IDS', () => {
    Object.defineProperty(import.meta, 'env', {
      value: {
        ...import.meta.env,
        VITE_ADMIN_USER_IDS: 'user_123,user_456',
      },
      writable: true,
      configurable: true,
    });

    const user = {
      id: 'user_123',
    } as User;

    expect(isAdmin(user)).toBe(true);
  });

  it('returns false if user ID is not in VITE_ADMIN_USER_IDS', () => {
    Object.defineProperty(import.meta, 'env', {
      value: {
        ...import.meta.env,
        VITE_ADMIN_USER_IDS: 'user_123,user_456',
      },
      writable: true,
      configurable: true,
    });

    const user = {
      id: 'user_789',
    } as User;

    expect(isAdmin(user)).toBe(false);
  });

  it('handles whitespace in VITE_ADMIN_USER_IDS', () => {
    Object.defineProperty(import.meta, 'env', {
      value: {
        ...import.meta.env,
        VITE_ADMIN_USER_IDS: 'user_123 , user_456 ',
      },
      writable: true,
      configurable: true,
    });

    const user = {
      id: 'user_456',
    } as User;

    expect(isAdmin(user)).toBe(true);
  });

  it('returns false for user with no admin indicators', () => {
    const user = {
      id: 'user_123',
    } as User;

    expect(isAdmin(user)).toBe(false);
  });
});

