import { describe, it, expect } from 'vitest';
import { responseLooksLikeDesignSystem } from '../validateDesignSystemHtml';

describe('responseLooksLikeDesignSystem', () => {
  it('accepts HTML with required markers and sufficient length', () => {
    const core = `<!DOCTYPE html><html><head><title>Supafolio Design System</title></head><body>
<div class="ds-topbar"></div><nav id="ds-nav"></nav>`;
    const html = `${core}${'y'.repeat(2500)}</body></html>`;
    expect(responseLooksLikeDesignSystem(html)).toBe(true);
  });

  it('rejects short HTML', () => {
    const html =
      '<html><head><title>Supafolio Design System</title></head><body><div class="ds-topbar"></div><nav id="ds-nav"></nav></body></html>';
    expect(responseLooksLikeDesignSystem(html)).toBe(false);
  });

  it('rejects wrong title', () => {
    const html = `${'x'.repeat(2500)}<div class="ds-topbar"></div><nav id="ds-nav"></nav>`;
    expect(responseLooksLikeDesignSystem(html)).toBe(false);
  });

  it('rejects missing nav', () => {
    const html = `<title>Supafolio Design System</title>${'x'.repeat(2500)}<div class="ds-topbar"></div>`;
    expect(responseLooksLikeDesignSystem(html)).toBe(false);
  });
});
