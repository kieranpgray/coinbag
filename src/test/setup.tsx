import '@testing-library/jest-dom';
import '@/lib/i18n';
import { afterEach, beforeEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import type { ReactNode } from 'react';

// Repository selection reads import.meta.env.VITE_DATA_SOURCE; stub so tests use in-memory mocks
beforeEach(() => {
  vi.stubEnv('VITE_DATA_SOURCE', 'mock');
});

// Mock Clerk globally to prevent initialization during tests
vi.mock('@clerk/clerk-react', () => ({
  ClerkProvider: ({ children }: { children: ReactNode }) => children,
  SignedIn: ({ children }: { children: ReactNode }) => children,
  SignedOut: ({ children: _children }: { children: ReactNode }) => null,
  RedirectToSignIn: () => null,
  UserButton: ({ children, ...props }: { children?: ReactNode } & Record<string, unknown>) => (
    <button data-testid="user-button" {...props}>{children}</button>
  ),
  useAuth: () => ({
    getToken: vi.fn().mockResolvedValue('mock-jwt-token'),
    userId: 'mock-user-id',
    isLoaded: true,
    isSignedIn: true,
  }),
  useUser: () => ({
    isLoaded: true,
    isSignedIn: true,
    user: {
      firstName: 'Test',
      lastName: 'User',
      primaryEmailAddress: { emailAddress: 'test@example.com' },
      primaryPhoneNumber: { phoneNumber: '+10000000000' },
      update: vi.fn().mockResolvedValue({}),
    },
  }),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.unstubAllEnvs();
});

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

