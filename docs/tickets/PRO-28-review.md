# PRO-28 Review — Holdings: Category layout + icon noise — single column & DS-aligned icons

## Review verdict

**Pass**

## What is correct

**Layout change — `AssetPortfolioSection.tsx`:**
- The multi-column grid (`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8`) is replaced with `flex flex-col gap-6`.
- This eliminates ragged column heights at all breakpoints. All category groups now stack vertically with consistent 24px gaps.
- The comment was updated from `{/* Category groups in responsive grid */}` to `{/* Category groups */}` — no misleading documentation left behind.
- All data rendering, category ordering, SnapTrade reconnect wiring, and the empty-state card are fully preserved.

**Icon badge removal — `AssetCategoryGroup.tsx`:**
- The `bg-primary/10` icon badge div and `<CategoryIcon />` element are removed.
- All eight Lucide icon imports (`Home`, `TrendingUp`, `Car`, `Coins`, `Wallet`, `Building2`, `Package`) are removed.
- The `LucideIcon` type import is removed.
- The `ASSET_CATEGORY_ICONS` record constant is removed.
- The `CategoryIcon` binding (`const CategoryIcon = ...`) is removed.
- No dead code remains in the file.
- Replaced with a minimal `border-l-2 border-[var(--accent-light)] pl-3` on the header container — uses an existing DS token, introduces no new colour utilities.
- Category name `h3`, asset rows, and category total footer row all render correctly.

**`AssetPortfolioRow.tsx`:**
- Inspected — confirmed no `bg-primary/10` pattern exists. No changes were needed or made. Existing `hover:bg-muted/50` is DS-aligned.

**Token discipline:**
- No new raw Tailwind colour utilities introduced. `var(--accent-light)` is an existing DS token (arbitrary property value, not a new Tailwind colour).
- `bg-muted/50`, `border-border`, `bg-surface`, `text-foreground`, `text-muted-foreground` all retained as-is.

**Lint / TypeScript:**
- Zero linter errors on both modified files after changes.

## What is off

**Minor: redundant margin on `AssetCategoryGroup` root div.**
The root `<div className="mb-6 last:mb-0">` applies bottom margin for category group spacing. With the parent now using `flex flex-col gap-6`, the `mb-6` is overridden by the flex gap and the `last:mb-0` is a no-op. Both classes are harmless but redundant. This is pre-existing behaviour — the `mb-6` was already there before PRO-28 and the gap container is new. The combination does not cause visual regression (flex gap takes precedence).

**Minor: `justify-between` on header div has no right-side content.**
The header container has `flex items-center justify-between` but there is only one child (`h3`). This is harmless but `justify-between` is unnecessary. Could be simplified to `flex items-center`.

## Required fixes

None blocking. The two minor notes above are cosmetic and do not affect correctness, rendering, or DS compliance. They can be resolved as follow-on cleanup within this ticket or deferred.

If desired, apply these optional cleanups:

1. `AssetCategoryGroup.tsx` root div: change `mb-6 last:mb-0` → remove both classes (parent gap handles spacing).
2. `AssetCategoryGroup.tsx` header div: change `flex items-center justify-between` → `flex items-center`.

## Regression risks

**Low.** Changes are purely presentational:

- Single-column layout is a pure CSS change; no data flow altered.
- Icon badge removal is a render-only change; no props, hooks, queries, or event handlers touched.
- `AssetPortfolioRow.tsx` untouched — all SnapTrade reconnect and freshness logic preserved.
- Empty state card path untouched.
- No type changes, no prop signature changes, no query changes.

The only real regression vector would be a consumer that relies on the specific grid structure for layout tests — none identified.

## Should this ticket be closed

**Yes.** Both design gaps are resolved:
1. Single-column category stack — implemented and lint-clean.
2. `bg-primary/10` icon badge repetition — fully removed with left-border DS token replacement, all dead code cleaned up.
