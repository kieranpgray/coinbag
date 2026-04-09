# PRO-18 Review — DS: Shell sidebar width 220px

## Review verdict

**Pass**

## What is correct

- **`src/index.css`**: `--sidebar-width` updated from `12rem` (192px) to `13.75rem` (220px), with the DS v2 canonical alias `--shell-sidebar-w: 220px` added immediately below. Token naming and value are now in lockstep with `design-system-v2.html`.
- **`src/components/layout/Sidebar.tsx`**: `sidebarWidth` ternary updated from `'w-48'` (192px) to `'w-[220px]'` for the expanded state. The collapsed width `'w-14'` (56px) is untouched — touch targets preserved.
- **`src/components/layout/Layout.tsx`**: Correctly identified as requiring no change. The main content area uses `flex-1 min-w-0`, which reflows automatically when the sidebar grows by 28px. No hardcoded offsets existed.
- **Scope discipline**: Exactly three targeted changes (two lines in `index.css`, one line in `Sidebar.tsx`). No unrelated CSS or component modifications.
- **Transition preserved**: `transition-[width] duration-200 ease-in-out` on `<aside>` still handles the expand/collapse animation at the new width.
- **No TypeScript or lint errors** introduced.

## What is off

Nothing material. Minor observation only:

- The `--sidebar-width` token defined in `:root` is not directly consumed anywhere in the current codebase via `var(--sidebar-width)` — the Tailwind arbitrary class `w-[220px]` on the aside is the effective width source. The token update is still correct for design-token completeness and any future `var()` references, but the two representations (`--sidebar-width` and `w-[220px]`) are now conceptually parallel rather than the class consuming the token. This is acceptable given Tailwind's constraint that `var()` in JIT arbitrary values requires a CSS variable to be a plain pixel/rem value without `calc()` — the current approach is the right pragmatic choice.

## Required fixes

None.

## Regression risks

**Low.** Assessed risks and mitigations:

| Risk | Likelihood | Mitigation |
|---|---|---|
| Horizontal scroll at narrow desktop viewports | Low | Sidebar hidden below `md`; `flex-1 min-w-0` on main content prevents overflow |
| Touch targets regressed in collapsed rail | None | `w-14` (56px) unchanged |
| `--sidebar-width` token consumer breakage | None | No component currently reads this token via `var()` |
| Main content grid misalignment | Low | Flexbox reflow is automatic; no fixed offsets to drift |

Recommend a quick visual check at 768px, 1024px, and 1280px viewports to confirm no overflow before closing.

## Should this ticket be closed

**Yes** — acceptance criteria met:
- Expanded sidebar width matches 220px spec ✓
- Collapsed width unchanged (touch targets safe) ✓
- Layout reflows via `flex-1 min-w-0`; no offset regressions ✓
- DS v2 token `--shell-sidebar-w: 220px` present in `:root` ✓
