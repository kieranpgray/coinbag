# PRO-29 Plan — Holdings: Propagate assets section errors to WealthBreakdown totals

## Ticket intent

When `assetsError` is set (Tanstack Query error state on `useAssets()`), the `AssetsSection` already renders an Alert. However, `WealthBreakdown` still displays the last-known or default asset totals (0 or stale cached values) with no signal that they are unreliable. A user who sees the error banner below the fold but reads a confident Net Worth figure at the top trusts a number that may be wrong. The fix: pass an `assetsUnavailable` boolean prop to `WealthBreakdown` and render a warning indicator on the Assets and Net Worth tiles when it is true. Values are not hidden — just visually caveated using the `var(--warning)` design system token.

## Family plan reference

`/Users/kierangray/Projects/wellthy/docs/plans/family-holdings.md` — PRO-29 section. Directive: show DS warning treatment (AlertTriangle icon + `var(--warning)`) on affected tiles; do not hide the value; handle the asymmetric case where only assets fail.

## Critique mapping

**T16 — trust / data integrity.** Confident financial figures backed by failed data erode user trust. A small warning indicator is the minimum disclosure required to preserve credibility.

## Dependency assessment

PRO-27 and PRO-28 are complete. Their changes touched `AssetPortfolioSection.tsx` and `AssetCategoryGroup.tsx`. This ticket modifies `WealthBreakdown.tsx` and the `WealthBreakdown` usage site in `WealthPage.tsx` only. No file overlap, no conflict.

## Files/components to inspect first

1. `src/features/wealth/WealthPage.tsx` — `assetsError` is destructured from `useAssets()` on line 71. `hasAssetsError = !!assetsError` is already derived on line 230. `WealthBreakdown` is rendered on lines 246–250 without passing any error state.
2. `src/features/wealth/components/WealthBreakdown.tsx` — receives three numeric props (`totalAssets`, `totalLiabilities`, `netWorth`). Renders three metric tiles in a 3-column grid. No error prop exists yet.
3. `src/index.css` — `--warning: #b58a10` (light mode, line 156); `--warning: #f0c040` (dark mode, line 256). Both are defined; safe to use inline via `text-[var(--warning)]`.
4. `WealthBreakdown` call sites — only `WealthPage.tsx`. No other consumers; adding a new optional prop is non-breaking.

## Proposed implementation path

1. **`WealthBreakdown.tsx`** — extend `WealthBreakdownProps` with `assetsUnavailable?: boolean`. Import `AlertTriangle` from `lucide-react`. In the Assets tile label, conditionally render `<AlertTriangle>` inline. In the Net Worth tile label, conditionally render the same indicator (Net Worth is derived from assets; it is equally unreliable). Do NOT touch the Liabilities tile.

2. **`WealthPage.tsx`** — pass `assetsUnavailable={hasAssetsError}` to `<WealthBreakdown>`. `hasAssetsError` is already a clean boolean (`!!assetsError`) computed on line 230.

### Warning indicator spec
- Icon: `AlertTriangle` from `lucide-react`
- Size: `h-3 w-3`
- Colour: `text-[var(--warning)]`
- Placement: `inline-block ml-1 align-middle` — sits after the label text
- Tile value: optionally dim with `opacity-60` when unavailable (low-opacity still readable, signals staleness)
- Net Worth tile: same treatment — icon on label, value dimmed

## Risks / regression watchouts

- **False warning on success:** `assetsUnavailable` must be `undefined` / `false` in the happy path. Since it is optional and defaults to falsy, this is safe by construction.
- **`assetsError` type:** Tanstack Query returns `Error | null`. `!!assetsError` converts cleanly. `hasAssetsError` is already typed as boolean.
- **Other `WealthBreakdown` call sites:** Only one — `WealthPage.tsx`. New prop is optional; no other files need updating.
- **Dark mode:** `var(--warning)` resolves to `#f0c040` in dark mode (already defined in `index.css`). No manual dark-mode override needed.
- **Accessibility:** Icon is purely decorative alongside the text label. Add `aria-label` or `title` to the `AlertTriangle` to communicate the warning to screen readers.

## Validation checklist

- [ ] When `assetsError` is truthy: Assets tile label shows `AlertTriangle` icon in warning colour.
- [ ] When `assetsError` is truthy: Net Worth tile label shows `AlertTriangle` icon in warning colour.
- [ ] When `assetsError` is truthy: Assets and Net Worth tile values are dimmed (`opacity-60`).
- [ ] When `assetsError` is falsy (success path): no warning icon visible on any tile (regression check).
- [ ] Liabilities tile is unaffected in all error states.
- [ ] Warning colour is `var(--warning)` — not a raw Tailwind `yellow-*` class.
- [ ] Asymmetric case (assets fail, liabilities succeed): Liabilities tile looks normal; Assets + Net Worth are caveated.
- [ ] No TypeScript errors; no linter errors introduced.
- [ ] Dark mode: warning icon visible in both light and dark themes.

## Implementation readiness

**Ready** — `assetsError` is already derived as a clean boolean in `WealthPage.tsx`. `WealthBreakdown` has a simple props interface with no complex dependencies. Change is additive (new optional prop). `var(--warning)` token is already in the design system. No migrations, no API changes, no new dependencies.
