import { vi } from 'vitest';
import type { ReactNode } from 'react';

/**
 * Common test utilities and mock setups
 */

// Mock Clerk authentication
export const mockClerkAuth = () => {
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
};

// Mock Supabase client
export const mockSupabaseClient = () => {
  const mockSupabaseResponse = {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      }),
      insert: vi.fn().mockResolvedValue({ data: null, error: null }),
      update: vi.fn().mockResolvedValue({ data: null, error: null }),
      delete: vi.fn().mockResolvedValue({ data: null, error: null }),
    }),
  };

  vi.mock('@/lib/supabaseClient', () => ({
    createAuthenticatedSupabaseClient: vi.fn().mockResolvedValue(mockSupabaseResponse),
    supabase: mockSupabaseResponse,
  }));
};

// Mock SubscriptionService
export const mockSubscriptionService = () => {
  vi.mock('@/features/subscriptions/services/subscriptionService', () => ({
    SubscriptionService: {
      createSubscription: vi.fn((data) => data),
      updateSubscription: vi.fn((existing, updates) => ({ ...existing, ...updates })),
    },
  }));
};

// Setup all common mocks
export const setupTestMocks = () => {
  mockClerkAuth();
  mockSupabaseClient();
  mockSubscriptionService();
};

// Test data factories
export const createMockSubscription = (overrides = {}) => ({
  id: '123e4567-e89b-12d3-a456-426614174000',
  name: 'Netflix Subscription',
  amount: 15.99,
  frequency: 'monthly' as const,
  chargeDate: '2024-01-01',
  nextDueDate: '2024-02-01',
  categoryId: '123e4567-e89b-12d3-a456-426614174111',
  notes: 'Streaming service',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  ...overrides,
});

export const createMockSubscriptionInput = (overrides = {}) => ({
  name: 'New Subscription',
  amount: 9.99,
  frequency: 'monthly' as const,
  chargeDate: '2024-01-01',
  nextDueDate: '2024-02-01',
  categoryId: '123e4567-e89b-12d3-a456-426614174111',
  notes: 'Test notes',
  ...overrides,
});
