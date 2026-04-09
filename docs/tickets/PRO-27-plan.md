# PRO-27 — Holdings: Remove duplicate Total Assets — keep WealthBreakdown only

## Ticket intent

Remove the redundant "Total assets" metric tile rendered inside `AssetPortfolioSection`'s header block. `WealthBreakdown` already renders an Assets tile above the section; having the same value ~100px lower creates ambiguity about which is authoritative and adds visual clutter. After removal, `WealthBreakdown` is the single source of truth for the Total Assets figure. The section heading ("What you own") provides sufficient labelling for the area below.

## Family plan reference

Covered in `/docs/plans/family-holdings.md` — PRO-27 is the first ticket in the Holdings cluster (PRO-27 → PRO-28 → PRO-29). It is the narrowest change in the cluster: remove one display element. PRO-28 (layout) and PRO-29 (error propagation) depend on a clean `AssetPortfolioSection` but not on this specific removal.

## Critique mapping

- **T16** — duplicate metric value at different vertical positions creates confusion about authoritative source.
- **SC3** — visual redundancy; same label + value shown twice within the same screen context inflates perceived information density without adding meaning.

## Dependency assessment

No blockers. `AssetPortfolioSection` and `WealthBreakdown` are independent components. This change does not affect PRO-28 or PRO-29 in a blocking way — they can proceed in any order, though the family plan recommends PRO-27 first for a clean diff.

## Files/components to inspect first

1. `src/features/wealth/components/WealthBreakdown.tsx` — confirm it renders the Assets metric tile (source of truth to keep).
2. `src/features/wealth/components/AssetPortfolioSection.tsx` — locate the duplicate tile; check whether `totalAssets` prop is used for anything other than that display.
3. `src/features/wealth/components/AssetsSection.tsx` — the single caller of `AssetPortfolioSection`; needs updating if the `totalAssets` prop is removed from the interface.

## Proposed implementation path

1. In `AssetPortfolioSection.tsx`:
   - Remove the inline metric tile block (the `<div className="mt-2 inline-block ... metric-tile">` containing `"Total assets"` label and `formatCurrency(totalAssets)`).
   - Remove `totalAssets` from `AssetPortfolioSectionProps` interface — it is only used for that display element.
   - Remove `totalAssets` from the function parameter destructuring.
   - Remove the `formatCurrency` import — it is only used in that tile block.
2. In `AssetsSection.tsx`:
   - Remove the `totalAssets={totalAssets}` prop from the `<AssetPortfolioSection>` call site (line ~60).

No changes to `WealthBreakdown.tsx`. No other files touched.

## Risks / regression watchouts

- **Dead prop at call site:** `AssetsSection` passes `totalAssets` to `AssetPortfolioSection`. Removing the prop from the interface without updating the call site will cause a TypeScript error. Must update both together.
- **`formatCurrency` import:** After removing the tile, `formatCurrency` is unused in `AssetPortfolioSection.tsx`. Leaving it produces a lint warning. Remove it.
- **AssetsSection cards-mode:** `AssetsSection` renders its own total in cards mode (line ~80, `{formatCurrency(totalAssets)}`). That path does not use `AssetPortfolioSection`, so it is unaffected. No regression there.
- **Empty state:** The empty state card inside `AssetPortfolioSection` does not reference `totalAssets`. Safe.

## Validation checklist

- [ ] Holdings page renders without TypeScript errors.
- [ ] Single "Assets" / "Total assets" figure visible on page — only in `WealthBreakdown` row.
- [ ] Section heading "What you own" is still present and unlabelled by a metric tile immediately below it.
- [ ] No orphaned `totalAssets` prop reference in `AssetPortfolioSection.tsx`.
- [ ] No unused `formatCurrency` import remaining in `AssetPortfolioSection.tsx`.
- [ ] `AssetsSection.tsx` call site does not pass `totalAssets` to `AssetPortfolioSection`.
- [ ] Cards view path in `AssetsSection` (viewMode === 'cards') is unaffected — still renders its own total.
- [ ] No visual regression in add-asset buttons, SnapTrade split button, or category group grid.

## Implementation readiness

`Ready`
