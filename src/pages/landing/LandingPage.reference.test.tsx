import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LandingPage } from '@/pages/landing/LandingPage';

const authState = {
  isSignedIn: false,
  isLoaded: true,
};

vi.mock('@clerk/clerk-react', () => ({
  useAuth: () => authState,
}));

const STORAGE_INDEX_KEY = 'supafolio:landingHeroIndex';
const STORAGE_RELOAD_HANDLED_KEY = 'supafolio:landingHeroReloadHandledFor';

describe('Landing hero headline', () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.restoreAllMocks();
    vi.spyOn(performance, 'getEntriesByType').mockReturnValue([
      { type: 'navigate', startTime: 0 } as PerformanceNavigationTiming,
    ]);
    Object.defineProperty(performance, 'timeOrigin', {
      configurable: true,
      value: 1000,
    });
  });

  it('shows variant 1 in the hero h1 by default', () => {
    authState.isSignedIn = false;
    render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>
    );
    const h1 = screen.getByRole('heading', { level: 1 });
    expect(h1).toHaveTextContent(/You're not trying/i);
  });

  it('shows variant 2 in the hero when ?hero=hero2', () => {
    authState.isSignedIn = false;
    render(
      <MemoryRouter initialEntries={['/?hero=hero2']}>
        <LandingPage />
      </MemoryRouter>
    );
    const h1 = screen.getByRole('heading', { level: 1 });
    expect(h1).toHaveTextContent(/^Your financial life has outgrown a spreadsheet\.$/);
  });

  it('advances hero index on reload from stored 2 to 0', () => {
    authState.isSignedIn = false;
    sessionStorage.setItem(STORAGE_INDEX_KEY, '2');
    vi.spyOn(performance, 'getEntriesByType').mockReturnValue([
      { type: 'reload', startTime: 0 } as PerformanceNavigationTiming,
    ]);

    render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>
    );

    const h1 = screen.getByRole('heading', { level: 1 });
    expect(h1).toHaveTextContent(/You're not trying/i);
    expect(sessionStorage.getItem(STORAGE_INDEX_KEY)).toBe('0');
    expect(sessionStorage.getItem(STORAGE_RELOAD_HANDLED_KEY)).toBe('1000');
  });

  it('does not advance again on reload when already handled for this timeOrigin', () => {
    authState.isSignedIn = false;
    sessionStorage.setItem(STORAGE_INDEX_KEY, '0');
    sessionStorage.setItem(STORAGE_RELOAD_HANDLED_KEY, '1000');
    vi.spyOn(performance, 'getEntriesByType').mockReturnValue([
      { type: 'reload', startTime: 0 } as PerformanceNavigationTiming,
    ]);

    render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>
    );

    expect(sessionStorage.getItem(STORAGE_INDEX_KEY)).toBe('0');
    const h1 = screen.getByRole('heading', { level: 1 });
    expect(h1).toHaveTextContent(/You're not trying/i);
  });
});

describe('LandingPage reference parity guard', () => {
  it('renders key immutable phrases from reference landing', () => {
    authState.isSignedIn = false;
    render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>
    );

    expect(screen.getByText(/You're not trying/i)).toBeInTheDocument();
    expect(screen.getByText(/From your complete picture to your next move/i)).toBeInTheDocument();
    expect(screen.getByText(/Not another budgeting app/i)).toBeInTheDocument();
    const heroCtas = screen.getAllByRole('link', {
      name: /Start building — it's free/i,
    });
    expect(heroCtas.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Your financial life has outgrown a spreadsheet/i)).toBeInTheDocument();
  });

  it('does not render landing content while signed in', () => {
    authState.isSignedIn = true;
    render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>
    );

    expect(screen.queryByText(/Your financial life has outgrown a spreadsheet/i)).not.toBeInTheDocument();
  });
});
