import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DesignSystemPage } from '../DesignSystemPage';

function buildValidDesignSystemHtml(): string {
  const core = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>Supafolio Design System</title></head><body>
<div class="ds-topbar"><a href="#">logo</a></div>
<nav id="ds-nav"></nav>`;
  const pad = 'x'.repeat(Math.max(0, 2200 - core.length));
  return `${core}${pad}</body></html>`;
}

describe('DesignSystemPage', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(buildValidDesignSystemHtml()),
      } as Response),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    globalThis.fetch = originalFetch;
  });

  it('renders iframe after successful fetch', async () => {
    render(<DesignSystemPage />);

    expect(screen.getByLabelText('Loading design system')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByTitle('Supafolio design system')).toBeInTheDocument();
    });
  });

  it('shows error when response is not the design system document', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      text: () => Promise.resolve('<html><head><title>wrong</title></head><body>short</body></html>'),
    } as Response);

    render(<DesignSystemPage />);

    await waitFor(() => {
      expect(screen.getByText('Could not load the design system.')).toBeInTheDocument();
    });
  });

  it('shows error when fetch returns non-ok', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 404,
      text: () => Promise.resolve(''),
    } as Response);

    render(<DesignSystemPage />);

    await waitFor(() => {
      expect(screen.getByText('Could not load the design system.')).toBeInTheDocument();
    });
  });
});
