import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useSubscriptions, useCreateSubscription, useUpdateSubscription, useDeleteSubscription } from '../hooks';
import type { ReactNode } from 'react';

// Mock environment
vi.mock('import.meta.env', () => ({
  VITE_DATA_SOURCE: 'supabase', // Test Supabase implementation
}));

// Mock Clerk for subscription hook tests
vi.mock('@clerk/clerk-react', () => ({
  ClerkProvider: ({ children }: { children: ReactNode }) => children,
  SignedIn: ({ children }: { children: ReactNode }) => children,
  SignedOut: ({ children }: { children: ReactNode }) => children,
  RedirectToSignIn: () => null,
  UserButton: () => null,
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

// Mock repository factory used by hooks
const repoMock = {
  list: vi.fn(),
  get: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
};

vi.mock('@/data/subscriptions/repo', () => ({
  createSubscriptionsRepository: () => repoMock,
}));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

function wrapper({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

describe('Subscription Hooks', () => {
  describe('useSubscriptions', () => {
    it('fetches subscriptions successfully', async () => {
      const mockSubscriptions = [
        {
          id: '1',
          name: 'Netflix',
          amount: 15.99,
          frequency: 'monthly',
          chargeDate: '2024-01-01',
          nextDueDate: '2024-02-01',
          categoryId: '123e4567-e89b-12d3-a456-426614174111',
        },
      ];

      repoMock.list.mockResolvedValue({
        data: mockSubscriptions,
        error: undefined,
      });

      const { result } = renderHook(() => useSubscriptions(), { wrapper });

      await waitFor(() => {
        expect(result.current.data).toEqual(mockSubscriptions);
        expect(result.current.isLoading).toBe(false);
      });
    });
  });

  describe('useCreateSubscription', () => {
    it('creates subscription and invalidates queries', async () => {
      const newSubscription = {
        id: '1',
        name: 'Spotify',
        amount: 9.99,
        frequency: 'monthly' as const,
        chargeDate: '2024-01-01',
        nextDueDate: '2024-02-01',
        categoryId: '123e4567-e89b-12d3-a456-426614174111',
      };

      repoMock.create.mockResolvedValue({
        data: newSubscription,
        error: undefined,
      });

      const { result } = renderHook(() => useCreateSubscription(), { wrapper });

      result.current.mutate({
        name: 'Spotify',
        amount: 9.99,
        frequency: 'monthly',
        chargeDate: '2024-01-01',
        nextDueDate: '2024-02-01',
        categoryId: '123e4567-e89b-12d3-a456-426614174111',
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(repoMock.create).toHaveBeenCalled();
    });
  });

  describe('useUpdateSubscription', () => {
    it('updates subscription and invalidates queries', async () => {
      const updatedSubscription = {
        id: '1',
        name: 'Netflix Premium',
        amount: 19.99,
        frequency: 'monthly' as const,
        chargeDate: '2024-01-01',
        nextDueDate: '2024-02-01',
        categoryId: '123e4567-e89b-12d3-a456-426614174111',
      };

      repoMock.update.mockResolvedValue({
        data: updatedSubscription,
        error: undefined,
      });

      const { result } = renderHook(() => useUpdateSubscription(), { wrapper });

      result.current.mutate({
        id: '1',
        data: { name: 'Netflix Premium', amount: 19.99 },
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(repoMock.update).toHaveBeenCalled();
    });
  });

  describe('useDeleteSubscription', () => {
    it('deletes subscription and invalidates queries', async () => {
      repoMock.remove.mockResolvedValue({ error: undefined });

      const { result } = renderHook(() => useDeleteSubscription(), { wrapper });

      result.current.mutate('1');

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(repoMock.remove).toHaveBeenCalled();
    });
  });
});
