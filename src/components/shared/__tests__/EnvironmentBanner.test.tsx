import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EnvironmentBanner } from '../EnvironmentBanner';

describe('EnvironmentBanner', () => {
  const originalMode = import.meta.env.MODE;
  const originalProd = import.meta.env.PROD;

  beforeEach(() => {
    // Reset env vars
    vi.resetModules();
  });

  afterEach(() => {
    // Restore original values
    Object.defineProperty(import.meta, 'env', {
      value: {
        ...import.meta.env,
        MODE: originalMode,
        PROD: originalProd,
      },
      writable: true,
      configurable: true,
    });
  });

  it('renders in development mode', () => {
    Object.defineProperty(import.meta, 'env', {
      value: {
        ...import.meta.env,
        MODE: 'development',
        PROD: false,
      },
      writable: true,
      configurable: true,
    });

    render(<EnvironmentBanner />);
    expect(screen.getByText(/DEV Environment/i)).toBeInTheDocument();
  });

  it('renders in preview mode', () => {
    Object.defineProperty(import.meta, 'env', {
      value: {
        ...import.meta.env,
        MODE: 'preview',
        PROD: false,
      },
      writable: true,
      configurable: true,
    });

    render(<EnvironmentBanner />);
    expect(screen.getByText(/PREVIEW Environment/i)).toBeInTheDocument();
  });

  it('does not render in production mode', () => {
    Object.defineProperty(import.meta, 'env', {
      value: {
        ...import.meta.env,
        MODE: 'production',
        PROD: true,
      },
      writable: true,
      configurable: true,
    });

    const { container } = render(<EnvironmentBanner />);
    expect(container.firstChild).toBeNull();
  });

  it('has correct accessibility attributes', () => {
    Object.defineProperty(import.meta, 'env', {
      value: {
        ...import.meta.env,
        MODE: 'development',
        PROD: false,
      },
      writable: true,
      configurable: true,
    });

    render(<EnvironmentBanner />);
    const banner = screen.getByRole('banner');
    expect(banner).toHaveAttribute('aria-label', 'Environment: DEV');
  });
});





