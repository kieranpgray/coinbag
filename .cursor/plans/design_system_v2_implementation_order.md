# Design System v2 — Implementation Order & Status

**Purpose:** Single source of truth for DS v2 rollout progress. Update this file when phases complete or scope changes.

**Last updated:** 2026-04-06

---

## How to run (dev)

- Feature flag: `VITE_DS_V2=true` sets `data-ds="v2"` on `<html>` (`src/main.tsx`), which activates `[data-ds="v2"]` CSS in `src/index.css`.
- Convenience: `pnpm dev:ds-v2` (uses `.env.ds-v2`: `VITE_DS_V2=true`, `VITE_DEV_HTTP=true`).

**Key files**

| File | Role |
|------|------|
| `src/lib/dsV2.ts` | `isDsV2` build-time flag for conditional classes |
| `src/index.css` | Token aliases, `[data-ds="v2"]` overrides, metric/chart utilities |
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
| **Release gate** | Enable `VITE_DS_V2=true` in production when product approves | **Not done** |
| 5.1 | Landing: `src/components/landing/v2/landing-v2.css` → global `:root` tokens | **Not started** |
| 5.2 | Security/legal: `src/pages/legal/security-page.css` → global `:root` tokens | **Not started** |
| 5.3 | Remove legacy HSL block from `index.css` `:root` (audit all files first) | **Not started** |
| 5.4 | Remove Inter font (packages + `index.css` imports) | **Not started** |
| 5.5 | Remove legacy compat aliases from `index.css` `:root` (`--color-primary-blue`, etc.) | **Not started** |
| 5.6 | Replace remaining hardcoded hex in chart utilities + `DebugOverlay.tsx` | **Not started** |
| 5.8 | Feature flag removal: flatten `[data-ds="v2"]` into `:root`, remove `data-ds` from `main.tsx`, retire `VITE_DS_V2` | **Not started** |
| 5.9 | (Optional) Dark mode reconciliation: `.dark` / HSL → DS v2 on-dark / rgba model | **Not started** |

---

## Phase 4.3–4.6 + follow-ups (implemented detail)

Use this for handoffs; avoid re-sweeping completed areas unless regressions appear.

- **Budget / Transfers:** `BudgetPage` warning alert uses `var(--warning)` / `var(--warning-light)`; `BudgetSummaryCard` uses `isDsV2` metric tiles; `TransferSuggestions` headings use `text-h2-*`; `AccountCashFlowRow` / `TransferSuggestionRow` use semantic success/error/surplus tokens.
- **Import:** `ImportPage`, `ImportPreview`, `ImportResults` — destructive/success/warning surfaces use tokens (not raw `red-500` / `green-*` / `yellow-*`). Dark mode: `--warning` / `--warning-light` overridden in `.dark` and `html[data-ds="v2"].dark`.
- **Cross-cutting:** `NotFound` uses `Button` + typography tokens; `NumericValue` has `tabular-nums`; `AccountSelect` / `MultiStatementFileUpload` semantic colours.

---

## Patterns (for agents)

- Import `isDsV2` from `src/lib/dsV2.ts` and `cn` from `@/lib/utils` for conditional DS v2 classes.
- DS v2 utility classes in `index.css`: `.metric-tile`, `.metric-label`, `.metric-value`, `.metric-delta`, `.metric-sub`, `.chart-container`, `.chart-header`, `.chart-title`, `.chart-subtitle`, `.chart-area`.
- Charts: `var(--chart-1…6)`; liabilities: `var(--danger-tone-strong|mid|light)`.
- Numeric displays: `tabular-nums` where appropriate.
- Destructive accents: `text-destructive`, not `text-red-500`.

---

## Changelog (plan only)

| Date | Change |
|------|--------|
| 2026-04-06 | Initial plan file: phases 0–4.6 + follow-ups marked done; 5.x + release gate pending |
