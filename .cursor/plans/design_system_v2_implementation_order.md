# Design System v2 — Implementation Order & Status

**Purpose:** Single source of truth for DS v2 rollout progress. Update this file when phases complete or scope changes.

**Last updated:** 2026-04-06 (session 3)

---

## How to run (dev)

- DS v2 is now the **permanent default** — no flag needed. Run `pnpm dev` as normal.
- `.env.ds-v2` and `pnpm dev:ds-v2` are retired (kept for reference only).

**Key files**

| File | Role |
|------|------|
| `src/index.css` | All design tokens in `:root`; metric/chart utilities |
| `design-system-v2.html` | Visual reference spec |
| `src/lib/clerkAppearance.ts` | Clerk theme bridge |

---

## Status summary

| Phase | Description | Status |
|-------|-------------|--------|
| 0 | Tailwind, fonts (DM Sans + Instrument Serif), alias tokens, feature flag, env | **Done** |
| 1 | `[data-ds="v2"]` hex/HSL overrides, font weights, dark block | **Done** |
| 2 | Primitives (Button, Card, Dialog, Input, Alert, Badge, Table, Checkbox, Switch, Select, Textarea, Skeleton, Tooltip, DropdownMenu, Tabs, Progress, CircularProgress) | **Done** |
| 3 | Shell: Sidebar, Header, MobileNav, Footer, CommandPalette, AccountPage, SignIn/SignUp | **Done** |
| 4.1 | Dashboard sweep (NetWorth*, BudgetBreakdownTile, breakdowns, MarketSummary, chart tokens) | **Done** |
| 4.2 | Accounts / Wealth sweep | **Done** |
| 4.3 | Budget / Transfers sweep | **Done** |
| 4.4 | Settings / Import sweep (incl. `FileUpload`, import wizard, token cleanup) | **Done** |
| 4.5 | Scenarios sweep | **Done** (page is stub; no UI debt) |
| 4.6 | Cross-cutting (NotFound, NumericValue, shared components, empty states) | **Done** |
| — | Code-review follow-ups (dark `--warning` / `--warning-light`, `ImportResults` card structure, `BudgetSummaryCard` import) | **Done** |
| **Release gate** | ~~Enable `VITE_DS_V2=true` in production when product approves~~ | **Bypassed (internal beta)** |
| 5.1 | Landing: `src/components/landing/v2/landing-v2.css` → global `:root` tokens | **Done** |
| 5.2 | Security/legal: `src/pages/legal/security-page.css` → global `:root` tokens | **Done** |
| 5.3 | Remove legacy HSL block from `index.css` `:root` | **Done** |
| 5.4 | Remove Inter font (packages + `index.css` imports) | **Done** |
| 5.5 | Remove legacy compat aliases from `index.css` `:root` (`--color-primary-blue`, etc.) | **Done** |
| 5.6 | Replace remaining hardcoded hex in chart utilities + `DebugOverlay.tsx` | **Done** (see note) |
| 5.8 | Feature flag removal: flatten `[data-ds="v2"]` into `:root`, remove `data-ds` from `main.tsx`, retire `VITE_DS_V2` | **Done** |
| 5.9 | (Optional) Dark mode reconciliation: `.dark` / HSL → DS v2 on-dark / rgba model | **Not started** |

---

## Phase 5.8 + 5.3/5.4/5.5 — implemented detail (session 3)

Decision: skip the production release gate (app is internal beta, low user impact). Implemented 5.8, 5.3, 5.4, and 5.5 in one session.

### 5.8 — Feature flag removal

- **`src/index.css`**: Merged all `[data-ds="v2"]` token overrides directly into `:root`. Merged `html[data-ds="v2"].dark` into `.dark`. Removed the `[data-ds="v2"]` and `html[data-ds="v2"].dark` selector blocks. Removed the `[data-ds='v2']` prefix from all metric/chart utility class selectors — they now apply globally.
- **`src/main.tsx`**: Removed the `if (VITE_DS_V2 === 'true') { document.documentElement.setAttribute('data-ds', 'v2') }` block.
- **`src/lib/dsV2.ts`**: Changed to `export const isDsV2 = true` with a deprecation notice. File left in place to prevent import errors; remove after all call-sites are cleaned.
- **`src/vite-env.d.ts`**: Removed the `VITE_DS_V2` type declaration.
- **Component collapses (14 files)**: Removed all `isDsV2` / `dsV2` conditionals — always render the DS v2 branch. Files: `NetWorthSummary`, `BudgetBreakdownTile`, `MarketSummary`, `NetWorthCard`, `IncomeBreakdown`, `ExpenseBreakdown`, `AssetsBreakdown`, `LiabilitiesBreakdown`, `WealthBreakdown`, `AssetPortfolioSection`, `LiabilityPortfolioSection`, `AccountsPage`, `AccountCard`, `BudgetSummaryCard`.

### 5.3 — Legacy HSL block removal

Removing the old shadcn-generated HSL values from `:root` was implicit in the 5.8 merge: the DS v2 HSL values (e.g. `--background: 40 33% 97%` warm parchment) are now the `:root` values. The old values (`--background: 0 0% 100%` pure white, etc.) no longer exist.

### 5.4 — Inter font removal

`@import '@fontsource/inter/*'` lines removed from `src/index.css`. The `--font-family-sans` token now resolves to `"DM Sans", system-ui, sans-serif` with no Inter fallback in the DS v2 stack. Note: the `@fontsource/inter` npm packages can be removed from `package.json` in a separate cleanup PR.

### 5.5 — Legacy compat aliases removal

`--color-primary-blue`, `--color-success-legacy`, and `--color-error-legacy` removed from `:root` and `.dark`. Confirmed no files reference these outside of `src/index.css`.

---

## Phase 5.x implemented detail (sessions 1–2)

### 5.1 — Landing CSS token migration

`src/components/landing/v2/landing-v2.css`:
- Removed duplicate `@import '@fontsource/dm-sans/*'` lines (already loaded by `src/index.css`).
- Removed duplicate `@font-face` declarations for Instrument Serif (also already in `src/index.css`).
- Removed the entire `.landing-v2 { --ink: …; --paper: …; … }` private token block; all tokens (`--ink`, `--ink-2`, `--paper`, `--paper-2`, `--paper-3`, `--accent-light`, `--accent-glow`, `--accent-2`, `--gold`, `--gold-light`, `--serif`, `--rl`, `--rx`) are now inherited from `:root` in `src/index.css`.
- The only local definition retained: `--accent: var(--color-primary)` — the `.landing-v2` scope needs `--accent` to mean the brand green, since the global `--accent` HSL variable is reserved for the shadcn surface-hover value.
- Changed `font-family: var(--sans)` → `font-family: var(--font-family-sans)` to use the global DM Sans token directly.

### 5.2 — Security page dark-section token cleanup

`src/pages/legal/security-page.css`:
- All token references (`var(--accent)`, `var(--ink)`, `var(--paper-2)`, `var(--serif)`, etc.) are inherited from the `.landing-v2` parent class and the global `:root` block — no private token definitions were present.
- Replaced exact on-dark literal colours with `var(--on-dark-*)` tokens in the two dark sections:
  - `#fff` text → `var(--on-dark-primary)`
  - `rgba(255, 255, 255, 0.35)` → `var(--on-dark-muted)`
  - `rgba(255, 255, 255, 0.06)` grid gap backgrounds → `var(--on-dark-border)`
  - `rgba(255, 255, 255, 0.1)` borders → `var(--on-dark-border)`
- Non-matching opacities (0.04, 0.08, 0.45, 0.5) and the green CTA section's values are intentionally kept as-is.

### 5.6 — Hardcoded hex audit

- **Chart utilities:** audit confirmed no standalone chart utility files with hardcoded hex palette exist. Chart colours are already fully expressed via `var(--chart-1…6)` and `var(--danger-tone-*)` CSS custom properties.
- **DebugOverlay (`src/components/shared/DebugOverlay.tsx`):** inline-style hex values (`#4ade80`, `#f87171`, `#ffd700`, `#60a5fa`, `#fbbf24`) are intentionally kept. The overlay forces `rgba(0,0,0,0.8)` as its background; substituting DS v2 semantic tokens (e.g. `var(--color-success) = #1a5c3a` in DS v2) would produce near-invisible text on the dark surface. These are dev-tool fixed colours, not design-system surfaces.

---

## Phase 4.3–4.6 + follow-ups (implemented detail)

Use this for handoffs; avoid re-sweeping completed areas unless regressions appear.

- **Budget / Transfers:** `BudgetPage` warning alert uses `var(--warning)` / `var(--warning-light)`; `BudgetSummaryCard` uses metric tiles; `TransferSuggestions` headings use `text-h2-*`; `AccountCashFlowRow` / `TransferSuggestionRow` use semantic success/error/surplus tokens.
- **Import:** `ImportPage`, `ImportPreview`, `ImportResults` — destructive/success/warning surfaces use tokens (not raw `red-500` / `green-*` / `yellow-*`). Dark mode: `--warning` / `--warning-light` overridden in `.dark`.
- **Cross-cutting:** `NotFound` uses `Button` + typography tokens; `NumericValue` has `tabular-nums`; `AccountSelect` / `MultiStatementFileUpload` semantic colours.

---

## Patterns (for agents)

- DS v2 is permanent — no `isDsV2` / `dsV2` guards needed in new code.
- Design tokens live in `src/index.css` `:root`. Dark-mode overrides are in `.dark`.
- DS v2 utility classes: `.metric-tile`, `.metric-label`, `.metric-value`, `.metric-delta`, `.metric-sub`, `.chart-container`, `.chart-header`, `.chart-title`, `.chart-subtitle`, `.chart-area`.
- Charts: `var(--chart-1…6)`; liabilities: `var(--danger-tone-strong|mid|light)`.
- Numeric displays: `tabular-nums` where appropriate.
- Destructive accents: `text-destructive`, not `text-red-500`.

---

## Changelog (plan only)

| Date | Change |
|------|--------|
| 2026-04-06 | Initial plan file: phases 0–4.6 + follow-ups marked done; 5.x + release gate pending |
| 2026-04-06 | Session 2: 5.1 (landing CSS), 5.2 (security CSS), 5.6 (hex audit) done; 5.3/5.4/5.5 marked blocked on release gate |
| 2026-04-06 | Session 3: 5.8 (feature flag removal) + 5.3/5.4/5.5 done; DS v2 is now permanent; 14 components cleaned of flag guards |
