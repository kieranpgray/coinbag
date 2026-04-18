import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { defaultUserPreferences, type UserPreferences } from '@/contracts/userPreferences';

const { mockGet } = vi.hoisted(() => ({
  mockGet: vi.fn(),
}));

vi.mock('@/data/userPreferences/repo', () => ({
  createUserPreferencesRepository: vi.fn(() => ({
    get: mockGet,
    set: vi.fn(),
  })),
}));

vi.mock('@clerk/clerk-react', () => ({
  useAuth: () => ({
    getToken: vi.fn().mockResolvedValue('mock-jwt'),
    userId: 'user-theme-test',
    isLoaded: true,
    isSignedIn: true,
  }),
}));

function setMatchMediaPrefersDark(matches: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: query.includes('prefers-color-scheme: dark') ? matches : false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
}

describe('useUserPreferences fetch on mount (theme persistence)', () => {
  beforeEach(() => {
    mockGet.mockReset();
    setMatchMediaPrefersDark(false);
  });

  afterEach(() => {
    document.documentElement.classList.remove('dark');
  });

  it('calls repo.get after sign-in and ThemeProvider applies persisted dark preference', async () => {
    const serverPrefs: UserPreferences = {
      ...defaultUserPreferences,
      themePreference: 'dark',
    };
    mockGet.mockResolvedValue({ data: serverPrefs });

    const queryClient = createTestQueryClient();

    render(
      <MemoryRouter initialEntries={['/app/dashboard']}>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <span />
          </ThemeProvider>
        </QueryClientProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(mockGet).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });
  });

  it('applies persisted light preference when OS prefers dark', async () => {
    setMatchMediaPrefersDark(true);
    const serverPrefs: UserPreferences = {
      ...defaultUserPreferences,
      themePreference: 'light',
    };
    mockGet.mockResolvedValue({ data: serverPrefs });

    const queryClient = createTestQueryClient();

    render(
      <MemoryRouter initialEntries={['/app/dashboard']}>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <span />
          </ThemeProvider>
        </QueryClientProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(mockGet).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(document.documentElement.classList.contains('dark')).toBe(false);
    });
  });
});
