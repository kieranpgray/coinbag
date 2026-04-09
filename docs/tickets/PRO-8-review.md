# PRO-8 Review — DS: Authenticated page titles use Instrument Serif (DS-1)

## Review verdict
**Pass**

## What is correct

### CSS class (`src/index.css`)
- `.page-title` added inside `@layer utilities`, positioned after the numeric display tier classes (`.num-body`) — logical grouping.
- Properties match spec exactly: `font-family: var(--serif)` → resolves to `"Instrument Serif", Georgia, serif`; `font-size: 28px`; `letter-spacing: -0.02em`; `font-weight: 400`; `line-height: 1.25`.
- `color: var(--ink)` correctly uses the DS v2 ink token (`#0f0e0c` light / `#ffffff` dark). Dark mode is handled automatically via the `.dark` token override already in `index.css`.
- No new font imports were needed — `@fontsource/instrument-serif/latin-400.css` was already imported at the top of the file.

### Page file updates
- **DashboardPage.tsx** — Main render `<h1>` (line 288) updated: `text-h1-sm sm:text-h1-md lg:text-h1-lg font-medium` → `page-title`. ✓
- **WealthPage.tsx** — `<h1>` (line 238) updated: `text-h1-sm sm:text-h1-md lg:text-h1-lg font-medium tracking-tight` → `page-title`. ✓
- **BudgetPage.tsx** — `<h1>` (line 416) updated: `text-h1-sm sm:text-h1-md lg:text-h1-lg font-medium tracking-tight` → `page-title`. ✓
- **TransfersPage.tsx** — All three conditional render path `<h1>` instances (lines 84, 99, 127) updated consistently. ✓ This is important: all visible states of the page (no-cycle setup, loading, main) now render in Instrument Serif — there is no path where DM Sans h1 can appear.

### Layout ancestry
`Layout.tsx` confirmed clean — no `font-*` or `text-*` utilities on ancestor elements (`AppShell`, `<main>`, container `<div>`). No override risk.

### Tailwind class removal
`tracking-tight` (Tailwind: `letter-spacing: -0.025em`) correctly removed — superseded by `.page-title`'s `letter-spacing: -0.02em`. The DS spec uses −0.02em, not Tailwind's tighter −0.025em.

## What is off

### Minor: `<h2>` error states in DashboardPage still use DM Sans
Lines 225 and 252 in `DashboardPage.tsx` are `<h2>` elements rendered in the error and no-data states respectively. They still carry `text-h1-sm sm:text-h1-md lg:text-h1-lg font-medium`. These are **out of scope for this ticket** (ticket specifies `<h1>` only), but the inconsistency is worth flagging: users who encounter these error/empty states will see DM Sans where the happy-path would show Instrument Serif. These states are low-frequency but visible.

**Impact:** Low. Not a blocker for this ticket.

## Required fixes
None. Implementation matches spec.

## Regression risks

1. **Mobile overflow (28px fixed)** — Instrument Serif at 28px is wider than DM Sans at the same size due to serif proportions. On very narrow screens (< 375px), long translated strings (e.g. non-English locales) could break to two lines. Current English titles ("Dashboard", "Wealth", "Budget", "Transfers") are short and safe. Verify if i18n strings are added for these routes in future.

2. **`<h2>` DM Sans residue in Dashboard error states** — As noted above, not a regression introduced by this ticket, but it pre-existed and is now more visible by contrast since the happy-path h1 has moved to serif.

3. **PRO-13 dependency on `.page-title` class name** — Class must remain named `.page-title` and not be renamed or scoped. PRO-13 (empty state serif titles) will reference or extend this class.

## Should this ticket be closed
**Yes** — All four authenticated page `<h1>` titles now render in Instrument Serif with the correct DS v2 properties. The `.page-title` utility class is defined in `index.css` and reusable by subsequent tickets. PRO-13 is unblocked.
