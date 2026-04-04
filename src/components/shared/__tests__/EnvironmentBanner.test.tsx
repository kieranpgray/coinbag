import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { RouteLoadingBannerProvider } from '@/contexts/RouteLoadingBannerContext';
import { EnvironmentBanner } from '../EnvironmentBanner';

function renderBanner(pathname = '/app/dashboard') {
  return render(
    <MemoryRouter
      initialEntries={[pathname]}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <RouteLoadingBannerProvider>
        <EnvironmentBanner />
      </RouteLoadingBannerProvider>
    </MemoryRouter>
  );
}

describe('EnvironmentBanner', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('renders in development mode', () => {
    vi.stubEnv('MODE', 'development');
    vi.stubEnv('PROD', false);

    renderBanner('/app/dashboard');
    expect(screen.getByText(/DEV Environment/i)).toBeInTheDocument();
  });

  it('renders in preview mode', () => {
    vi.stubEnv('MODE', 'preview');
    vi.stubEnv('PROD', false);

    renderBanner('/app/dashboard');
    expect(screen.getByText(/PREVIEW Environment/i)).toBeInTheDocument();
  });

  it('does not render in production mode', () => {
    vi.stubEnv('MODE', 'production');
    vi.stubEnv('PROD', true);

    renderBanner('/app/dashboard');
    expect(screen.queryByRole('banner')).not.toBeInTheDocument();
  });

  it('has correct accessibility attributes', () => {
    vi.stubEnv('MODE', 'development');
    vi.stubEnv('PROD', false);

    renderBanner('/app/dashboard');
    const banner = screen.getByRole('banner');
    expect(banner).toHaveAttribute('aria-label', 'Environment: DEV');
  });

  it('does not render on non-app routes in development', () => {
    vi.stubEnv('MODE', 'development');
    vi.stubEnv('PROD', false);

    renderBanner('/');
    expect(screen.queryByRole('banner')).not.toBeInTheDocument();
  });
});
