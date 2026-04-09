# PRO-28 Plan — Holdings: Category layout + icon noise — single column & DS-aligned icons

## Ticket intent

Fix two visual design gaps in the Holdings / "What you own" section:

1. **Layout:** `AssetPortfolioSection` renders category groups in a responsive multi-column grid (`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3`). When category groups contain different numbers of assets, this produces ragged column heights that look unfinished. The DS-preferred pattern is a single-column stack.

2. **Icon noise:** `AssetCategoryGroup` renders a coloured rounded-square badge (`bg-primary/10`) with a Lucide icon for every category header. With up to 8 categories visible simultaneously, this creates 8 competing green accents — visual noise that dilutes the accent's meaning and violates DS token discipline. The fix is to remove or replace with a minimal non-chromatic indicator.

## Family plan reference

Covered by `/docs/plans/family-holdings.md` — PRO-28 is the second ticket in the Holdings cluster (PRO-27 → PRO-28 → PRO-29). PRO-27 removed the duplicate total tile; this ticket changes layout and icon treatment. PRO-29 (assets error propagation) is independent but shares the same page.

## Critique mapping

- **T16** — Holdings: `AssetPortfolioSection` multi-column layout creates ragged heights (#2)
- **T16** — Holdings: `AssetCategoryGroup` `bg-primary/10` icon badges repeated for every category (#3)

## Dependency assessment

Depends on PRO-27 completing first — done. PRO-27 removed a total assets tile from `AssetPortfolioSection.tsx`; this ticket modifies the grid container in the same file. No other blockers.

## Files/components to inspect first

| File | Reason |
|------|--------|
| `src/features/wealth/components/AssetPortfolioSection.tsx` | Contains the multi-column grid container at line 273 |
| `src/features/wealth/components/AssetCategoryGroup.tsx` | Contains the `bg-primary/10` icon badge at lines 66–69 |
| `src/features/wealth/components/AssetPortfolioRow.tsx` | Check for same icon badge pattern |

**Findings from inspection:**

- `AssetPortfolioSection.tsx` line 273: `<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">` — this is the target container.
- `AssetCategoryGroup.tsx` lines 66–69: icon badge is `<div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center"><CategoryIcon ... /></div>`. The `ASSET_CATEGORY_ICONS` map and `CategoryIcon` binding will become dead code after removal.
- `AssetPortfolioRow.tsx`: No `bg-primary/10` pattern. Uses `hover:bg-muted/50` (DS-aligned). No changes needed.

## Proposed implementation path

### Step 1 — `AssetPortfolioSection.tsx`: single-column layout

Replace:
```
grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8
```
With:
```
flex flex-col gap-6
```
Remove the comment `{/* Category groups in responsive grid */}` (now misleading) and update to `{/* Category groups */}`.

### Step 2 — `AssetCategoryGroup.tsx`: replace icon badge with left-border accent

**Chosen approach:** Replace icon badge with a minimal left-border accent (`border-l-2 border-[var(--accent-light)] pl-3`) on the header container. This:
- Preserves visual grouping / scan anchoring (pure text-only header loses hierarchy cues)
- Uses a single-pixel treatment — no filled colour badge
- Uses a DS token (`--accent-light`) not a raw utility
- Eliminates the 8-repeated-accent problem

Remove the icon badge div entirely. Remove the `ASSET_CATEGORY_ICONS` map, the Lucide icon imports, the `CategoryIcon` binding — all become dead code.

Header `div` changes from:
```tsx
<div className="flex items-center gap-2 mb-2">
  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
    <CategoryIcon ... />
  </div>
  <h3 ...>{categoryName}</h3>
</div>
```
To:
```tsx
<div className="flex items-center justify-between mb-2 border-l-2 border-[var(--accent-light)] pl-3">
  <h3 ...>{categoryName}</h3>
</div>
```

The total display is already in the footer row — keep that unchanged.

### Step 3 — `AssetPortfolioRow.tsx`: no changes needed

No `bg-primary/10` pattern exists; the row only uses `hover:bg-muted/50` which is correct.

## Risks / regression watchouts

- **Scan anchoring loss:** Removing the icon removes the only per-category visual differentiator above each list. The left-border accent mitigates this — provides a structural marker without colour repetition.
- **Dead code:** `ASSET_CATEGORY_ICONS`, `LucideIcon` type import, all six icon imports (`Home`, `TrendingUp`, `Car`, `Coins`, `Wallet`, `Building2`, `Package`) become unused. Remove all to keep the file clean and avoid lint errors.
- **Single-column density on large screens:** With `lg:grid-cols-3` removed, `lg` viewports will show a long single column. This is the DS-preferred pattern per the critique. If product later decides `lg` should be two columns, that's a separate ticket.
- **`mb-6 last:mb-0` on category group div:** With `flex flex-col gap-6` on the parent, the `mb-6 last:mb-0` on `AssetCategoryGroup`'s root div becomes redundant margin. Can leave for now (parent gap takes precedence); or clean up to avoid double spacing.

## Validation checklist

- [ ] Single-column stack at all breakpoints (`sm`, `md`, `lg`) — no two-column layout at any width
- [ ] No `bg-primary/10` remaining in any Holdings component
- [ ] Left-border accent visible on each category group header
- [ ] No new raw Tailwind colour utilities introduced (token-only)
- [ ] All unused icon imports and `ASSET_CATEGORY_ICONS` map removed
- [ ] Category name, asset list, and category total all still render correctly
- [ ] Edit/delete actions on rows still function
- [ ] SnapTrade reconnect prompt still renders when connection is broken
- [ ] Empty state card unaffected
- [ ] No TypeScript or lint errors

## Implementation readiness

**Ready.** All target lines identified, approach agreed, no blockers. Estimated change: ~15 lines modified / removed across 2 files.
