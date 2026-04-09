# PRO-18 — DS: Shell sidebar width 220px

## Ticket intent

Align the expanded sidebar width with the DS v2 specification token `--shell-sidebar-w: 220px`. The current implementation uses `12rem` (192px) in the CSS token and `w-48` (192px) in the Tailwind class on the sidebar container — a 28px deviation from spec that shifts the navigation rail and the adjacent main-content grid edge.

## Family plan reference

Part of the design system uplift backlog targeting structural shell tokens. This ticket closes the `--sidebar-width` / `--shell-sidebar-w` gap introduced when the DS v2 token sheet was authored after the initial implementation.

## Critique mapping

- **T9** — Layout shell tokens diverge from DS reference; sidebar narrower than spec.
- **DS-10** — `--sidebar-width` value not aligned to `design-system-v2.html` dimension tokens.

## Dependency assessment

No blockers. Fully independent. No other in-flight tickets touch sidebar geometry. Safe to execute immediately.

## Files/components to inspect first

| File | What to check |
|---|---|
| `src/index.css` | `--sidebar-width` current value and surrounding layout tokens |
| `src/components/layout/Sidebar.tsx` | Tailwind width class on `<aside>`, collapsed width, sidebarWidth logic |
| `src/components/layout/Layout.tsx` | Any hardcoded `ml-*` / `pl-*` / `w-*` offsets derived from sidebar width |

### Findings

- `src/index.css` line 17: `--sidebar-width: 12rem; /* 192px */` — needs update to `13.75rem` and DS v2 token alias added.
- `src/components/layout/Sidebar.tsx` line 98: `sidebarWidth = ... ? 'w-48' : 'w-14'` — `w-48` (192px) needs to become `w-[220px]`.
- `src/components/layout/Layout.tsx`: No hardcoded sidebar-width offsets. Main content uses `flex-1 min-w-0` — reflows automatically. No changes required.

## Proposed implementation path

1. **`src/index.css`** — Update `--sidebar-width` from `12rem` to `13.75rem` (220px) and add the DS v2 canonical alias `--shell-sidebar-w: 220px` directly below it.
2. **`src/components/layout/Sidebar.tsx`** — Replace `'w-48'` with `'w-[220px]'` in the `sidebarWidth` ternary. Leave `'w-14'` (collapsed rail) unchanged.
3. **`src/components/layout/Layout.tsx`** — No change required.

## Risks / regression watchouts

- **Horizontal scroll on small viewports:** Sidebar is hidden below `md` breakpoint (`hidden md:flex`) — no mobile impact.
- **Tablet rail (collapsed):** `w-14` (56px) unchanged — touch targets unaffected.
- **Flex reflow:** Layout uses `flex-1 min-w-0` on main content; the extra 28px will reduce main content width proportionally. No overflow expected.
- **Any component that reads `--sidebar-width` via `var()`:** Token is updated in lockstep, so any consumer automatically picks up the new value.
- **Transitions:** `transition-[width] duration-200` already on the aside — smooth animation preserved.

## Validation checklist

- [ ] Expanded sidebar visually measures 220px in browser DevTools computed styles.
- [ ] Collapsed sidebar (tablet) still measures 56px (`w-14`).
- [ ] No horizontal scrollbar introduced at 768px, 1024px, 1280px, 1440px viewport widths.
- [ ] Main content area still renders without clipping or mis-alignment.
- [ ] `--sidebar-width` token resolves to `13.75rem` (220px) in `:root` computed styles.
- [ ] `--shell-sidebar-w` token present and resolves to `220px`.
- [ ] Sidebar expand/collapse animation functions correctly.
- [ ] No TypeScript or lint errors introduced.

## Implementation readiness

`Ready`
