# PRO-17 — Review

## Review verdict

Pass

## What is correct

**Primary target fixed cleanly:**
- `UnallocatedWarning.tsx` — all six yellow-palette utilities removed. Container now uses `bg-[var(--warning-light)]` + `border-[var(--warning)]`; icon, titles, body text, and button use `text-[var(--warning)]` / `border-[var(--warning)]`. Explicit `dark:` overrides removed — dark mode handled automatically by token redefinition in `index.css`.

**Additional warning surfaces fixed:**
- `TeamSection.tsx` — "non-admin" notice replaced `border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800` + `text-amber-800 dark:text-amber-200` with `border-[var(--warning)] bg-[var(--warning-light)] text-[var(--warning)]`. Dark mode explicit overrides removed correctly.
- `PriceFreshnessIndicator.tsx` — stale state replaced `text-amber-600 dark:text-amber-500` with `text-[var(--warning)]`.

**Destructive icon colours aligned:**
- `AssetCard.tsx` — Trash2 icon `text-red-500` → `text-error` (Tailwind utility mapped to `--color-error`).
- `LiabilityCard.tsx` — same fix.

**Financial data colours aligned:**
- `ReviewScreen.tsx` — income `text-green-600` → `text-success`, expenses `text-red-600` → `text-error`, net conditional updated to match. Consistent with existing usage in `AccountCashFlowRow.tsx` and `LiabilityChangeLog.tsx`.

**No scope creep:** shadcn UI primitives and internal dev tooling left untouched as required.

**Zero lint errors** introduced across all six changed files.

## What is off

Nothing materially wrong. Two minor observations for awareness:

1. **Button hover on warning surface**: `hover:bg-[var(--warning-light)]` is identical to the resting background — the button hover state is visually flat. The original `hover:bg-yellow-100` was slightly lighter than `bg-yellow-50`. This is cosmetically minor but worth noting for a future polish pass.

2. **`--warning` dark mode value**: The dark token resolves to `#f0c040` (a bright yellow), while `--warning-light` in dark mode is `rgba(181, 138, 16, 0.18)`. The text and background combination in dark mode should be verified visually — the contrast ratio of `#f0c040` on the semi-transparent dark background may be lower than ideal (though likely acceptable).

## Required fixes

None. All violations within scope are corrected.

## Regression risks

**Low.**

- CSS custom property arbitrary values (`text-[var(--warning)]`, `bg-[var(--warning-light)]`) are well-supported in Tailwind v3. JIT generates valid CSS; no build-time risk.
- Dark mode token overrides are handled in `index.css` under the `.dark` selector — confirmed present. Removing explicit `dark:*` Tailwind overrides from the components is safe.
- The `text-success` / `text-error` utilities are confirmed defined in `tailwind.config.js` and already in active use across the codebase.
- No API, data, or routing changes.

**Remaining violations not fixed in this ticket (documented for follow-up):**

| File | Violation | Reason not fixed |
|---|---|---|
| `src/components/shared/EnvironmentBanner.tsx` | `bg-yellow-500 text-yellow-900 border-yellow-600` (DEV banner) | Intentional dev-tool colour coding; not a semantic user-facing surface. Fixing ambiguous intent was out of scope per ticket spec. Suggest a future follow-up to use a non-palette custom colour or CSS var specific to dev tooling. |
| `src/components/ui/searchable-select.tsx` | `text-red-500` (inline field error) | Inside a shadcn UI primitive. Ticket explicitly instructs to skip UI primitives. Recommend addressing in a UI-primitive hygiene pass. |

## Should this ticket be closed

Yes
