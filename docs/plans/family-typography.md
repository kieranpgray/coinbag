# Family plan: Typography wave

**Tickets covered:** PRO-8, PRO-16  
**Unlocks:** PRO-13 (after PRO-8 completes)

---

## Scope

Establish typographic correctness across the authenticated shell:

1. **PRO-16** — Enforce DM Sans weight ceiling (max 500); remove `font-bold`/`font-semibold` Tailwind classes that resolve to 700 on body/label text.
2. **PRO-8** — Apply DS `.page-title` treatment to all authenticated `<h1>`s: Instrument Serif, 28px fixed, `-0.02em` letter-spacing, weight per DS (not `font-bold`).

PRO-16 must land before or alongside PRO-8 to avoid the serif page titles inheriting a Tailwind bold override.

---

## Tickets covered

| Ticket | Title | Classification |
|--------|-------|----------------|
| PRO-16 | DS: Typography weights — DM Sans 300–500 only | Foundation |
| PRO-8  | DS: Authenticated page titles use Instrument Serif (DS-1) | Foundation |

---

## Upstream design intent

- **DS-9 (PRO-16):** DM Sans must never exceed weight 500. The CSS token `--font-weight-bold` already maps to 500. The problem is Tailwind's `font-bold` utility still compiles to `font-weight: 700` and bypasses the token. Any component using `font-bold` or `font-semibold` on DM Sans text is in violation.
- **DS-1 (PRO-8):** All authenticated `<h1>` page titles must use `.page-title` styling: `font-family: var(--serif)` (Instrument Serif), `font-size: 28px`, `letter-spacing: -0.02em`. The spec shows these as fixed-size, not responsive (`text-h1-*`).
- CSS `--serif` token is already defined in `index.css`: `--serif: var(--font-family-serif)`.
- The `--font-family-serif` Tailwind config value should map to `'Instrument Serif', Georgia, serif` (or similar serif stack). Verify in `tailwind.config.*`.

---

## Shared implementation surface

### CSS (`src/index.css`)
- Add `.page-title` utility class (or verify it exists) — `font-family: var(--serif); font-size: 28px; letter-spacing: -0.02em; font-weight: 400; line-height: var(--line-height-display, 1.25)`.
- `--font-weight-bold` and `--font-weight-semibold` already resolve to `500` — this is correct. The leak is in direct Tailwind utility usage.
- Do NOT change the token values (they're already DS-correct); change the call sites.

### Page files (PRO-8 primary targets)
- `src/features/dashboard/DashboardPage.tsx`
- `src/features/wealth/WealthPage.tsx`
- `src/features/budget/BudgetPage.tsx`
- `src/features/transfers/TransfersPage.tsx`

### Component sweep (PRO-16 targets)
- Grep for `font-bold` and `font-semibold` across `src/` — replace on DM Sans text (labels, buttons, section headings, metadata) with `font-medium` (500 equivalent) where emphasis is needed, or remove where weight is decorative.
- **Exceptions:** `font-bold` is acceptable on Instrument Serif text (headings, amounts) where the intent is genuine display weight — but verify Instrument Serif only ships 400 weight; if so, `font-bold` on serif is a no-op and can be removed.
- Do not replace inside SVG text, third-party component internals, or test files.

### Tailwind config
- If `fontFamily.serif` is not yet mapped to Instrument Serif, add it.
- Consider adding a `fontWeight` alias so `font-emphasis` = 500 to prevent future drift.

---

## Recommended implementation approach

### PRO-16 (run first)
1. Grep: `rg "font-bold|font-semibold" src/ --include="*.tsx" --include="*.ts"` — collect all matches.
2. For each match, determine if the element uses DM Sans (default body font). If yes, replace with `font-medium` unless context demands genuine heading weight (in which case use `font-normal` or a semantic class).
3. Update `tailwind.config.*` if needed to alias emphasis weight to 500.
4. Validate: no DM Sans text should have computed `font-weight: 700` or `font-weight: 600`. Check with browser devtools on Dashboard.

### PRO-8 (run after or alongside PRO-16)
1. In `index.css`, add/verify `.page-title` class:
   ```css
   .page-title {
     font-family: var(--serif);
     font-size: 28px;
     letter-spacing: -0.02em;
     font-weight: 400;
     line-height: 1.25;
     color: var(--ink);
   }
   ```
2. In each of the 4 page files, find the `<h1>` element and replace current classes (`text-h1-*`, `font-bold`, etc.) with `page-title` (or inline equivalent if class doesn't exist yet).
3. Verify a shared layout primitive (`Layout.tsx` or `AppShell`) does not force `font-bold` onto child headings globally.
4. Run visual check across all 4 routes.

---

## Risks / regression watchouts

- `font-bold` appears in many files — bulk replace risks stripping intentional emphasis from buttons, badges, numeric labels. **Check every change site** before bulk-applying.
- Some `font-semibold` usages are inside shadcn components (`AccordionTrigger`, `Label`, etc.) — do not edit shadcn source; wrap or override via `className` prop or CSS specificity.
- Instrument Serif only ships regular (400) and italic variants; `font-bold` on serif is effectively a no-op (browser will synthesize bold which looks wrong). Strip these too.
- Page title `<h1>` semantic order must not change — verify each page still has exactly one `<h1>` and it remains first in the logical heading order.
- Responsive font size (`text-h1-*`) being dropped in favour of fixed `28px`: this is intentional per spec. Check narrow mobile (320px) viewports to ensure 28px doesn't overflow.

---

## Validation rules

- [ ] DM Sans body/label text: computed `font-weight` never 600 or 700 at any breakpoint.
- [ ] All four authenticated page `<h1>`s: Instrument Serif visible, 28px rendered, `-0.02em` tracking.
- [ ] No `<h1>` visual regression on tablet or mobile (check overflow, line-break).
- [ ] Buttons and other interactive elements that legitimately use `font-medium`/`font-bold` still read as distinct from body text.
- [ ] Inspect Serif at dashboard: title should visually distinguish itself from all surrounding body text immediately.

---

## Tickets unlocked

- **PRO-13** (Empty state serif titles) — unblocked once PRO-8 establishes the serif loading and `.page-title`-style decision; empty state uses a smaller 20px serif variant of the same pattern.
