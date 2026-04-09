# PRO-27 — Review

## Review verdict

Pass

## What is correct

- **Duplicate tile removed cleanly.** The `<div className="mt-2 inline-block ... metric-tile">` block containing "Total assets" label and `formatCurrency(totalAssets)` has been removed from `AssetPortfolioSection.tsx`. `WealthBreakdown` remains the sole renderer of the Assets figure.
- **Prop removed end-to-end.** `totalAssets` was removed from `AssetPortfolioSectionProps`, from the function destructuring, and from the `AssetsSection.tsx` call site. No orphaned prop reference remains.
- **Unused import removed.** `formatCurrency` was the only usage of `@/lib/utils` in `AssetPortfolioSection.tsx`; the import line was removed. No dead import remains.
- **Section heading preserved.** The `<h2>{t('whatYouOwn')}</h2>` heading is still present, so the section is correctly labelled without the metric tile.
- **No other files touched.** `WealthBreakdown.tsx` is unchanged. The SnapTrade split button, portal overlay, account selection modal, and category group grid are all untouched.
- **Lint clean.** Both modified files pass lint with no errors or warnings.
- **Change is minimal and reversible.** The diff is ~10 lines removed across 2 files with no structural restructuring.

## What is off

Nothing material. One minor style note:

- The header `<div>` block now contains only the `<h2>` inside a nested `<div className="flex items-center gap-3 mb-2">`. The outer `<div>` with no other children is harmless but could be simplified in a future pass (PRO-28 touches this file again and may tighten the header structure then).

## Required fixes

None. The implementation is correct as shipped.

## Regression risks

- **Low.** `AssetsSection` cards-mode (`viewMode === 'cards'`) renders its own independent total (`formatCurrency(totalAssets)`) inside a `<span>` and does not go through `AssetPortfolioSection` — that path is unaffected and continues to show the total in cards mode. This is a pre-existing inconsistency between view modes (not introduced by this ticket), to be noted for a future cleanup pass.
- **Low.** Any future caller that tries to pass `totalAssets` to `AssetPortfolioSection` will get a TypeScript error at compile time — this is the desired behaviour (the prop no longer exists).

## Should this ticket be closed

Yes
