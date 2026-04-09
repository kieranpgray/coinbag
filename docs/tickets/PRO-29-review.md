# PRO-29 Review — Holdings: Propagate assets section errors to WealthBreakdown totals

## Review verdict

**Pass**

## What is correct

- **Prop design is additive and non-breaking.** `assetsUnavailable?: boolean` is optional with a default of `false`. The single other call site (`WealthPage.tsx`) passes it explicitly. No other consumers exist; confirmed by search.

- **Error state source is correct.** `hasAssetsError = !!assetsError` is already derived in `WealthPage.tsx` (line 230) from the Tanstack Query result. It is a clean boolean — no null/undefined leakage risk. Passed as `assetsUnavailable={hasAssetsError}`.

- **Warning indicator follows the spec.** `AlertTriangle` from `lucide-react` (already imported in `WealthPage.tsx` for the full-page error banner; freshly imported in `WealthBreakdown.tsx`). Size `h-3 w-3`, colour `text-[var(--warning)]` using the DS token — not a raw Tailwind yellow class. Placed inline after the label text with `ml-1 align-middle`.

- **Both affected tiles are caveated.** Assets tile and Net Worth tile both show the warning icon and opacity-60 dimming when `assetsUnavailable` is true. Net Worth is derived from assets so it is equally unreliable; caveating both is semantically correct.

- **Liabilities tile is untouched.** Only assets are affected by `assetsError`; liabilities render normally in the asymmetric failure case as required.

- **Values are not hidden.** Users see the last-known (possibly stale) figures with a visual caveat — this preserves discoverability and matches the ticket direction ("do NOT hide the value — just caveat it visually").

- **`aria-label` on both icons.** Screen-reader users receive a meaningful description of the warning state rather than an unlabelled decorative icon. The Net Worth aria-label explicitly names the cause ("asset data unavailable").

- **`var(--warning)` token used correctly.** Defined in `index.css` for both light (`#b58a10`) and dark (`#f0c040`) modes. No dark-mode override needed.

- **No linter errors** after implementation.

## What is off

- **`opacity-60` on the value is a mild deviation from the minimal spec.** The ticket direction suggested the icon alone is sufficient ("Optionally dim… or just show the icon without dimming"). The dimming is a reasonable design choice that reinforces staleness, but it is strictly optional. It does not harm usability or trust signalling.

- **`StatusIndicator` on the Assets tile still shows `status="positive"` when assets are unavailable.** The green status dot remains visible even when assets failed to load, which is a minor inconsistency — the tile signals "positive" while also showing a warning icon. This is outside the explicit ticket scope and is flagged only for awareness; correcting it would require changing the `StatusIndicator` conditional logic, which could introduce scope creep. Defer to a follow-up if product considers this a trust issue.

## Required fixes

None. Implementation is complete and meets all stated requirements.

## Regression risks

- **Happy path (no error):** `assetsUnavailable` defaults to `false`; no icon or dimming appears. Verified by code inspection.
- **Liabilities-only failure:** `assetsUnavailable` is only tied to `hasAssetsError` — a liabilities error does not trigger it. The prop would need to be extended if a symmetric liabilities treatment is ever required (out of scope for PRO-29).
- **Stale cache + error recovery:** Once `assetsError` clears (user clicks "Try again" and the query succeeds), `hasAssetsError` becomes `false` and the warning indicators disappear automatically via React re-render. No manual reset needed.
- **Other `WealthBreakdown` call sites:** None exist beyond `WealthPage.tsx`. Adding the prop is non-breaking for any future call sites since it defaults to `false`.

## Should this ticket be closed

**Yes.** The implementation correctly propagates `assetsError` to `WealthBreakdown`, shows the `var(--warning)` token-based `AlertTriangle` indicator on both the Assets and Net Worth tiles, leaves the Liabilities tile untouched, preserves the numeric values (with optional opacity dimming), and handles the asymmetric failure case cleanly. All validation checklist items pass.
