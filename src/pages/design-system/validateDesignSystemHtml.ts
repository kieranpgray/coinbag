/** Minimum size so tiny error/placeholder pages fail without matching every heuristic. */
const MIN_HTML_LENGTH = 2_000;

/**
 * Confirms the fetched body is the bundled design-system doc, not an error shell or unrelated HTML.
 * Keep markers in sync with `public/design-system-v2.html`.
 */
export function responseLooksLikeDesignSystem(html: string): boolean {
  if (!html || html.length < MIN_HTML_LENGTH) {
    return false;
  }
  const hasExactTitle = html.includes('<title>Supafolio Design System</title>');
  const hasNav = html.includes('id="ds-nav"');
  const hasTopbar =
    html.includes('class="ds-topbar"') ||
    html.includes("class='ds-topbar'") ||
    html.includes('class="ds-topbar ');
  return hasExactTitle && hasNav && hasTopbar;
}
