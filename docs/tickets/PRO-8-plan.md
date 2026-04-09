# PRO-8 Plan — DS: Authenticated page titles use Instrument Serif (DS-1)

## Ticket intent
Apply the DS v2 `.page-title` treatment to all four authenticated `<h1>` page titles. Currently they use DM Sans with responsive `text-h1-*` Tailwind utilities. Per spec (`design-system-v2.html`, `#authenticated .page-title`), these must switch to Instrument Serif at a fixed 28px, weight 400, letter-spacing −0.02em. The class is not yet defined in CSS.

## Family plan reference
`docs/plans/family-typography.md` — PRO-8 is the second ticket in the typography wave (after PRO-16). Family plan confirms: `--serif: var(--font-family-serif)` is already defined in `index.css`, so the token chain is complete. No new font imports are required.

## Critique mapping
- **T1** — Page `<h1>` titles render DM Sans (wrong typeface for display-level headings).
- **DS-1** — Spec deviation: `.page-title { font-family: var(--serif); font-size: 28px; letter-spacing: -0.02em; font-weight: 400; }` not applied.

## Dependency assessment
- **PRO-16 completed** — DM Sans `font-bold` → `font-medium` sweep already applied. The `<h1>` elements now carry `font-medium` on DM Sans. This ticket replaces those classes with `page-title` (which sets `font-weight: 400` and switches font family). No blocking dependency remains.
- **Unblocks PRO-13** (Empty state serif titles) — PRO-13 uses a 20px serif variant of the same pattern; must wait for this ticket to establish the base `.page-title` class and confirm serif loading works.

## Files/components to inspect first
| File | Finding |
|------|---------|
| `src/index.css` | `--serif` and `--font-family-serif` tokens confirmed. `--ink` confirmed. No `.page-title` class exists. Need to add to `@layer utilities`. |
| `src/features/dashboard/DashboardPage.tsx` | Main render `<h1>` at line 288: `"text-h1-sm sm:text-h1-md lg:text-h1-lg font-medium"`. Error state uses `<h2>` (not in scope). |
| `src/features/wealth/WealthPage.tsx` | `<h1>` at line 238: `"text-h1-sm sm:text-h1-md lg:text-h1-lg font-medium tracking-tight"`. |
| `src/features/budget/BudgetPage.tsx` | `<h1>` at line 416: `"text-h1-sm sm:text-h1-md lg:text-h1-lg font-medium tracking-tight"`. |
| `src/features/transfers/TransfersPage.tsx` | Three `<h1>` instances (no-cycle state line 84, loading state line 99, main render line 127) — all identical class string: `"text-h1-sm sm:text-h1-md lg:text-h1-lg font-medium tracking-tight"`. |
| `src/components/layout/Layout.tsx` | `AppShell` uses `bg-background focus:outline-none` on `<main>` and `container pt-8` on the content wrapper. **No `font-*` or `text-*` utility on any ancestor.** No override risk. |

## Proposed implementation path

### Step 1 — Add `.page-title` to `src/index.css`
Add inside `@layer utilities`, after the existing `.num-body` block:

```css
/* DS v2 — authenticated page title */
.page-title {
  font-family: var(--serif);
  font-size: 28px;
  letter-spacing: -0.02em;
  font-weight: 400;
  line-height: 1.25;
  color: var(--ink);
}
```

Token verification: `--serif` resolves to `var(--font-family-serif)` which resolves to `"Instrument Serif", Georgia, serif`. Font file imported via `@fontsource/instrument-serif/latin-400.css` at top of file. All tokens live.

### Step 2 — Update `<h1>` elements in each page file
Replace the full DM Sans responsive class string with `page-title` on each `<h1>`:

| File | Old class | New class |
|------|-----------|-----------|
| `DashboardPage.tsx` (line 288) | `text-h1-sm sm:text-h1-md lg:text-h1-lg font-medium` | `page-title` |
| `WealthPage.tsx` (line 238) | `text-h1-sm sm:text-h1-md lg:text-h1-lg font-medium tracking-tight` | `page-title` |
| `BudgetPage.tsx` (line 416) | `text-h1-sm sm:text-h1-md lg:text-h1-lg font-medium tracking-tight` | `page-title` |
| `TransfersPage.tsx` (lines 84, 99, 127) | `text-h1-sm sm:text-h1-md lg:text-h1-lg font-medium tracking-tight` | `page-title` |

Note: `tracking-tight` is a Tailwind utility for `letter-spacing: -0.025em` — it is superseded by `.page-title`'s `letter-spacing: -0.02em`, so removing it is correct.

No layout/spacing classes are present on the `<h1>` elements themselves (spacing is handled by parent `<div>` wrappers). Safe to replace fully.

### Step 3 — Layout ancestry check
`Layout.tsx` verified: no `font-*` or `text-*` utility classes on `AppShell`, `<main>`, or the container `<div>`. No ancestor override risk.

## Risks / regression watchouts
1. **Fixed 28px on mobile** — The spec intentionally drops responsive sizing. At 320px viewport, 28px is ~88% of content width. Instrument Serif at this size is legible but verify no overflow on very narrow screens.
2. **`color: var(--ink)` in dark mode** — `--ink` is overridden to `#ffffff` in `.dark` — correct behaviour, headings will be white on dark. No regression.
3. **`<h2>` error states in DashboardPage** — Lines 225 and 252 use `<h2>` (not `<h1>`) and remain DM Sans. These are out of scope for this ticket but are flagged for potential future work.
4. **Three `<h1>` instances in TransfersPage** — All three conditional render paths (no pay cycle, loading, main) must be updated to stay consistent across all page states.
5. **PRO-13 dependency** — The `.page-title` class being added here will be referenced by PRO-13. Do not alter or namespace it.

## Validation checklist
- [ ] All four page routes render `<h1>` in Instrument Serif (visually confirmed in browser)
- [ ] Computed font-size is 28px at all breakpoints (not responsive)
- [ ] Computed letter-spacing is −0.02em
- [ ] Computed font-weight is 400
- [ ] Dark mode: headings render in `--ink` (white) correctly
- [ ] No overflow or line-break issues at 375px viewport
- [ ] `Layout.tsx` has no ancestor `font-*` class causing override
- [ ] `<h2>` error states in DashboardPage are unaffected
- [ ] TypeScript / lint passes — no class-related TS errors expected (string className)

## Implementation readiness
**Ready** — Token chain verified, font loaded, PRO-16 complete, no blockers.
