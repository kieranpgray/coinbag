import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { UserPreferences } from '@/contracts/userPreferences';
import { ThemeProvider } from '@/contexts/ThemeContext';

const mockPrefs = vi.hoisted(
  (): UserPreferences => ({
    privacyMode: false,
    themePreference: 'system',
    locale: 'en-US',
    hideSetupChecklist: false,
    emailNotifications: {
      portfolioSummary: true,
      spendingAlerts: true,
      stockPriceAlerts: true,
      featureAnnouncements: false,
      monthlyReports: false,
      marketingPromotions: false,
    },
  })
);

vi.mock('@/hooks/useUserPreferences', () => ({
  useUserPreferences: () => ({
    data: mockPrefs,
    isLoading: false,
  }),
  useUpdateUserPreferences: () => ({
    mutate: vi.fn(),
    mutateAsync: vi.fn(),
  }),
}));

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
});

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

afterEach(() => {
  document.documentElement.classList.remove('dark');
});

describe('ThemeProvider marketing light lock', () => {
  beforeEach(() => {
    setMatchMediaPrefersDark(true);
  });

  it('does not set html.dark on marketing path when OS prefers dark', async () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <span />
          </ThemeProvider>
        </QueryClientProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(document.documentElement.classList.contains('dark')).toBe(false);
    });
  });

  it('sets html.dark on app path when OS prefers dark and preference is system', async () => {
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
      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });
  });

  it('locks light for /pricing when OS prefers dark', async () => {
    render(
      <MemoryRouter initialEntries={['/pricing']}>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <span />
          </ThemeProvider>
        </QueryClientProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(document.documentElement.classList.contains('dark')).toBe(false);
    });
  });
});
