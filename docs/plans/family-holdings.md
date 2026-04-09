# Family plan: Holdings cluster

**Tickets covered:** PRO-27, PRO-28, PRO-29  
**Execution order:** PRO-27 → PRO-28 → PRO-29 (PRO-27 and PRO-28 share AssetPortfolioSection; PRO-29 is independent but same page)

---

## Scope

Three focused improvements to the Holdings (`/app/wealth`) screen that share the same page and component tree. Cluster them for a single QA pass.

1. **PRO-27** — Remove the redundant Total Assets tile from `AssetPortfolioSection`; `WealthBreakdown` is the single source.
2. **PRO-28** — Switch `AssetPortfolioSection` from `md:grid-cols-2` to single-column stack; reduce/remove `bg-primary/10` icon badge repetition in `AssetCategoryGroup`.
3. **PRO-29** — When `assetsError` is set, mark `WealthBreakdown` totals as stale/unavailable; show DS warning treatment.

---

## Tickets covered

| Ticket | Title | Classification |
|--------|-------|----------------|
| PRO-27 | Holdings: Remove duplicate Total Assets — keep WealthBreakdown only | Independent |
| PRO-28 | Holdings: Category layout + icon noise — single column & DS-aligned icons | Independent |
| PRO-29 | Holdings: Propagate assets section errors to WealthBreakdown totals | Independent |

---

## Upstream design intent

- **T16/SC3 (PRO-27):** `WealthBreakdown` renders an Assets metric tile (Total Assets value). `AssetPortfolioSection` header also shows the same Total Assets figure ~100px below. Duplicate values confuse users about the authoritative source. Remove the inner total tile from `AssetPortfolioSection`; section heading already labels the area.
- **T16 (PRO-28):** `AssetPortfolioSection` uses `md:grid-cols-2` which creates ragged column heights when category groups differ in item count. DS and critique prefer single-column category stacks. Additionally, `AssetCategoryGroup` repeats `bg-primary/10` icon badges for each category, creating visual noise (8 green accents competing for attention). Direction: remove icons or replace with minimal DS `icon-container` styling; prefer text-only category headers with subtle metadata.
- **T16/trust (PRO-29):** When assets fail to load (`assetsError`), the `AssetsSection` shows an Alert. However, `WealthBreakdown` may still render non-zero/stale asset totals without signalling that they're unreliable. This creates a trust risk where users see a confident Net Worth figure backed by failed data. Direction: when `assetsError` is set, dim the asset-related metric tiles in `WealthBreakdown` and show a warning icon or "unavailable" label per DS status patterns.

---

## Shared implementation surface

### Holdings page
- `src/features/wealth/WealthPage.tsx` — state/data wiring; `assetsError` origin for PRO-29.

### Breakdown and portfolio components
- `src/features/wealth/components/WealthBreakdown.tsx` — Total Assets tile (to keep); PRO-29 adds stale treatment.
- `src/features/wealth/components/AssetPortfolioSection.tsx` — duplicate total tile (PRO-27 removes); two-column grid (PRO-28 changes to single-col).
- `src/features/wealth/components/AssetCategoryGroup.tsx` — icon badges (PRO-28 reduces/removes).
- `src/features/wealth/components/AssetPortfolioRow.tsx` — inspect; may share icon pattern with category group.

---

## Recommended implementation approach

### PRO-27 (run first — narrowest change)
1. Read `AssetPortfolioSection.tsx` to locate the total assets tile/metric (often a `<Card>` or `<div className="metric-tile">` at the top of the section showing the sum of assets).
2. Remove that element. The section heading (e.g. "What you own") is sufficient to label the area.
3. Verify `WealthBreakdown.tsx` still shows the Assets figure — that's the remaining source of truth.
4. Run Holdings route; confirm single total assets figure visible.

### PRO-28 (run after PRO-27)
1. In `AssetPortfolioSection.tsx`:
   - Find the grid container (likely `grid md:grid-cols-2`).
   - Change to `flex flex-col gap-6` or `grid grid-cols-1`.
   - Remove any column balancing logic if present.
2. In `AssetCategoryGroup.tsx`:
   - Find the icon badge element (likely `<div className="... bg-primary/10 ..."><Icon .../></div>`).
   - Either: remove it entirely and rely on category name text, OR replace with a minimal 1px left-border accent (`border-l-2 border-[var(--accent-light)] pl-3`) that groups items without repeating colour chrome.
   - Do not introduce new non-DS colours.
3. Check `AssetPortfolioRow.tsx` for the same `bg-primary/10` pattern; apply consistent treatment.

### PRO-29 (run after PRO-28, mostly independent)
1. In `WealthPage.tsx`, confirm how `assetsError` is surfaced (prop, context, query result).
2. Pass `assetsError` (or a derived `assetsUnavailable: boolean`) down to `WealthBreakdown.tsx`.
3. In `WealthBreakdown.tsx`, when `assetsUnavailable`:
   - Show a warning indicator on the Assets tile (e.g. `<AlertTriangle className="text-[var(--warning)]" size={14} />` alongside the metric label).
   - Optionally dim the tile: `opacity-60` or `text-[var(--ink-3)]` on the value.
   - Do NOT hide the tile or remove the value — users should see it's stale, not that it disappeared.
4. Test: the asymmetric error case (assets fail, liabilities OK) should be sane — Net Worth tile either shows "unavailable" or the liabilities-only value with a caveat.
5. Use `var(--warning)` and `var(--warning-light)` (already defined in `index.css`) — no raw Tailwind colours.

---

## Risks / regression watchouts

- **PRO-27:** If `AssetPortfolioSection` computes total assets independently for display purposes, removing the tile may leave unused computation/state — clean it up to avoid dead code, but don't remove it if it's wired to sorting/filtering logic.
- **PRO-28:** Single-column layout may feel too vertical on large screens. Check `lg:` breakpoints — if content density is too low at `lg`, consider a `lg:grid-cols-2` fallback. Align with product intent.
- **PRO-28:** Icon removal changes visual anchoring between rows. Run through a populated state (multiple asset categories) to confirm scanability is maintained without icons.
- **PRO-29:** `assetsError` may not propagate as a clean boolean — it could be a Tanstack Query error object or undefined. Handle null checks carefully; do not show warning when error is undefined/null (normal success state).
- **PRO-29:** If `WealthBreakdown` currently receives no error prop, adding one is a prop change — ensure all call sites pass it (check if `WealthBreakdown` is rendered elsewhere beyond `WealthPage`).

---

## Validation rules

### PRO-27
- [ ] Single Total Assets figure on Holdings page (only in `WealthBreakdown`).
- [ ] Section heading "What you own" (or equivalent) still present without redundant metric.

### PRO-28
- [ ] Category groups stack single-column at `md` and `lg` breakpoints (no ragged two-column).
- [ ] Icon badge repetition removed or replaced with minimal non-chromatic indicator.
- [ ] No new Tailwind colour utilities introduced; token-based styling only.

### PRO-29
- [ ] When `assetsError` is truthy: WealthBreakdown Assets tile shows warning indicator.
- [ ] When no error: no warning indicator visible (regression check).
- [ ] Asymmetric failure (assets fail, liabilities OK): Net Worth display is clearly caveated.
- [ ] Warning uses `var(--warning)` token — not raw `yellow-*`.

---

## Tickets unlocked

None listed in epic. Holdings cluster is largely self-contained. PRO-29 indirectly supports **T11** (token discipline) if the warning colour uses DS tokens correctly — this becomes a reference implementation for `alert-warning` patterns.
