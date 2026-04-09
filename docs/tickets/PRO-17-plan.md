# PRO-17 — DS: Token hygiene — replace raw Tailwind colours with DS tokens

## Ticket intent

Replace raw Tailwind palette utilities (`yellow-*`, `amber-*`, `red-*`, `green-*`) in component files with the project's established DS CSS custom properties (`--warning`, `--warning-light`, `--danger`, `--danger-light`, and the Tailwind-mapped `text-success` / `text-error` utilities). The goal is to ensure all semantic surfaces respond correctly to design-system theming, dark mode, and any future token redefinition without requiring per-component changes.

## Family plan reference

Part of the Supafolio design uplift backlog. Directly addresses critique T11 (Token hygiene). This is a contained sweep — it does not touch the token unification spike (PRO-20) which may redefine the token values themselves.

## Critique mapping

- **T11** — DS token hygiene: component files bypass the design system by referencing raw Tailwind palette colours instead of CSS custom properties

## Dependency assessment

No blockers. All required tokens (`--warning`, `--warning-light`, `--danger`, `--danger-light`, `--color-success`, `--color-error`) are already defined in `src/index.css` and wired into the Tailwind config. Independent of PRO-20.

## Files/components to inspect first

Grep target: `yellow-[0-9]|amber-[0-9]|red-[0-9]` across `src/**/*.tsx`

**Files identified:**

| File | Violations | Severity |
|---|---|---|
| `src/features/transfers/components/UnallocatedWarning.tsx` | `border-yellow-500 bg-yellow-50 dark:bg-yellow-950`, `text-yellow-600/800/700`, button `border-yellow-600 text-yellow-800 hover:bg-yellow-100` | Primary target |
| `src/features/settings/TeamSection.tsx` | `border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800`, `text-amber-800 dark:text-amber-200` | Warning surface, clear fix |
| `src/features/assets/components/AssetCard.tsx` | `text-red-500` on Trash2 icon (delete action) | Danger/destructive, clear fix |
| `src/features/liabilities/components/LiabilityCard.tsx` | `text-red-500` on Trash2 icon (delete action) | Danger/destructive, clear fix |
| `src/features/statementImport/components/ReviewScreen.tsx` | `text-green-600` (income), `text-red-600` (expenses, net negative) | Financial semantic, clear fix via `text-success`/`text-error` |
| `src/components/shared/PriceFreshnessIndicator.tsx` | `text-amber-600 dark:text-amber-500` (stale price state) | Warning state, clear fix |
| `src/components/shared/EnvironmentBanner.tsx` | `bg-yellow-500 text-yellow-900 border-yellow-600` (DEV environment colour) | Intentional dev-tool colour coding — **ambiguous, do not fix** |
| `src/components/ui/searchable-select.tsx` | `text-red-500` (inline error text) | Inside shadcn UI primitive — **skip per ticket spec** |

Total: **6 fixable files**, 2 documented-but-not-fixed.

## Proposed implementation path

1. **`UnallocatedWarning.tsx`** — Replace all yellow utilities with `bg-[var(--warning-light)]`, `border-[var(--warning)]`, `text-[var(--warning)]`. Remove explicit dark: overrides (token handles dark mode via CSS).
2. **`TeamSection.tsx`** — Replace amber warning notice classes with `border-[var(--warning)] bg-[var(--warning-light)] text-[var(--warning)]`.
3. **`AssetCard.tsx`** — Replace `text-red-500` on Trash2 with `text-error` (Tailwind utility mapped to `--color-error`).
4. **`LiabilityCard.tsx`** — Same as AssetCard.
5. **`ReviewScreen.tsx`** — Replace `text-green-600` with `text-success`, `text-red-600` with `text-error`.
6. **`PriceFreshnessIndicator.tsx`** — Replace `text-amber-600 dark:text-amber-500` with `text-[var(--warning)]`.

**Token mapping used:**

| Raw utility | DS replacement | Source |
|---|---|---|
| `yellow-*/amber-*` border/bg | `var(--warning)` / `var(--warning-light)` | `index.css` |
| `yellow-*/amber-*` text | `var(--warning)` | `index.css` |
| `red-*` on danger surfaces | `text-error` | Tailwind config → `--color-error` |
| `green-*` on success surfaces | `text-success` | Tailwind config → `--color-success` |

## Risks / regression watchouts

- **Dark mode regressions**: Removing explicit `dark:` overrides in favour of CSS custom property dark-mode definitions requires that the dark-mode token values are correct in `index.css`. Confirmed present (`--warning: #f0c040` under `dark` selector).
- **Alert border specificity**: `Alert` component from shadcn may set its own border. The arbitrary value `border-[var(--warning)]` must override it — check that it generates `border-color` correctly.
- **Hover state button**: The warning-styled button loses `hover:bg-yellow-100 dark:hover:bg-yellow-900`. Replaced with `hover:bg-[var(--warning-light)]` which is lighter in both modes — acceptable.
- **No new dependencies introduced.**

## Validation checklist

- [ ] `UnallocatedWarning` renders with correct amber/gold border and background in light mode
- [ ] `UnallocatedWarning` renders correctly in dark mode (token adapts automatically)
- [ ] `TeamSection` warning notice renders with correct warning colours
- [ ] Trash2 delete icons in `AssetCard` and `LiabilityCard` render in danger red
- [ ] `ReviewScreen` income/expense summary cells display green/red correctly
- [ ] `PriceFreshnessIndicator` stale state shows warning colour
- [ ] No `yellow-*`, `amber-*`, `red-*`, or `green-*` raw utilities remain in fixed files
- [ ] `EnvironmentBanner` and `searchable-select` violations documented in review

## Implementation readiness

Ready
