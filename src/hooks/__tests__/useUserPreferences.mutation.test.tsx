import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  useUpdateUserPreferences,
  USER_PREFERENCES_SAVE_ERROR_TOAST,
} from '@/hooks/useUserPreferences';
import { defaultUserPreferences } from '@/contracts/userPreferences';

const { mockSet, toastError } = vi.hoisted(() => ({
  mockSet: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock('@/data/userPreferences/repo', () => ({
  createUserPreferencesRepository: vi.fn(() => ({
    get: vi.fn(),
    set: mockSet,
  })),
}));

vi.mock('@clerk/clerk-react', () => ({
  useAuth: () => ({
    getToken: vi.fn().mockResolvedValue('mock-jwt'),
    userId: 'user-mutation-test',
    isLoaded: true,
    isSignedIn: true,
  }),
}));

vi.mock('sonner', () => ({
  toast: {
    error: (...args: unknown[]) => toastError(...args),
    success: vi.fn(),
  },
}));

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe('useUpdateUserPreferences', () => {
  beforeEach(() => {
    mockSet.mockReset();
    toastError.mockReset();
  });

  it('shows generic toast and skips repo.set when preferences query has not succeeded yet', async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    const { result } = renderHook(() => useUpdateUserPreferences(), {
      wrapper: createWrapper(queryClient),
    });

    result.current.mutate({ privacyMode: true });

    await waitFor(() => {
      expect(toastError).toHaveBeenCalledWith(USER_PREFERENCES_SAVE_ERROR_TOAST);
    });
    expect(mockSet).not.toHaveBeenCalled();
  });

  it('shows only generic toast when repo.set returns an error (no raw API message)', async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    queryClient.setQueryData(['userPreferences', 'user-mutation-test'], defaultUserPreferences);

    mockSet.mockResolvedValue({
      error: { error: 'PGRST detailed internal message', code: '42501' },
    });

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const { result } = renderHook(() => useUpdateUserPreferences(), {
      wrapper: createWrapper(queryClient),
    });

    result.current.mutate({ privacyMode: true });

    await waitFor(() => {
      expect(toastError).toHaveBeenCalledWith(USER_PREFERENCES_SAVE_ERROR_TOAST);
    });
    expect(toastError).not.toHaveBeenCalledWith(
      expect.stringContaining('PGRST'),
    );

    warnSpy.mockRestore();
  });
});
