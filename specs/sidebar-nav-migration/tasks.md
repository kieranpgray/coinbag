# Tasks: Sidebar nav + command palette lift

> Generated from: `.cursor/plans/sidebar_topnav_migration_a92b0a15.plan.md`

## Critical Path

Task 1 → Task 2 → Task 3 → Task 4 → Task 5 → Task 6

## Layout / command palette

### Task 1: Lift command palette state to Layout

- **Depends on:** none
- **Creates/modifies:**
  - [`src/components/layout/Layout.tsx`](../../src/components/layout/Layout.tsx)
  - [`src/components/layout/Header.tsx`](../../src/components/layout/Header.tsx)
  - New (recommended): [`src/contexts/CommandPaletteContext.tsx`](../../src/contexts/CommandPaletteContext.tsx) *or* equivalent thin provider next to layout
- **Acceptance criteria:**
  - [ ] Single `open` / `setOpen` (or `onOpenChange`) owner for [`CommandPalette`](../../src/components/command-palette/CommandPalette.tsx) (`open` and `onOpenChange` only — no new props)
  - [ ] [`useCommandPalette`](../../src/hooks/useCommandPalette.ts) registered once (in `Layout` or provider), ⌘K / Ctrl+K opens the same dialog as today
  - [ ] `Header` no longer owns `CommandPalette` local state or `useCommandPalette`
  - [ ] Consumer hook available for `Sidebar` / `MobileNav` (e.g. `useCommandPaletteContext()`)
  - [ ] `pnpm test` (or project default) passes for touched tests
- **Notes:** Avoid double `keydown` listeners when `Header` still mounts during transition; only one subscription globally.
- **Human input needed:** none

## Account menu (shared content)

### Task 2: Extract account + workspace dropdown content and add Sign out

- **Depends on:** none (can parallel Task 1; must finish before Task 3/5 if they import it)
- **Creates/modifies:**
  - New: [`src/components/layout/AccountMenuContent.tsx`](../../src/components/layout/AccountMenuContent.tsx) (name flexible; keep colocated with layout)
  - [`src/components/layout/UserAccountMenu.tsx`](../../src/components/layout/UserAccountMenu.tsx) — re-export or thin wrapper using shared content *only if still needed*
- **Acceptance criteria:**
  - [ ] Menu includes: **Home/Dashboard** (navigate + `onClose`), **Profile** (existing `settings?tab=profile` behavior), **Settings** (route to app settings), **Privacy** toggle (same behavior as current [`Header`](../../src/components/layout/Header.tsx)), **Theme** toggle (same as header), **Sign out** via Clerk (`useClerk` / `SignOutButton`) with redirect consistent with app (`RedirectToSignIn` / sign-in URL)
  - [ ] When [`useWorkspaceCollaborationEnabled`](../../src/hooks/useWorkspaceCollaborationEnabled.ts) and workspace data match prior `UserAccountMenu`, **workspace submenu** still switches workspace and shows roles
  - [ ] Shared content accepts `onClose` (or controlled `open`) so triggers in sidebar/mobile can close the menu after actions
  - [ ] Tests pass; add/adjust test if `UserAccountMenu` had coverage
- **Notes:** Do not remove `account_menu_v2` from [`SettingsPage`](../../src/features/settings/SettingsPage.tsx) or [`useWorkspaceMemberProfiles`](../../src/hooks/useWorkspaceMemberProfiles.ts) in this task.
- **Human input needed:** none

## Desktop sidebar

### Task 3: Add logo+chevron account menu and Search trigger to Sidebar

- **Depends on:** Task 1, Task 2
- **Creates/modifies:**
  - [`src/components/layout/Sidebar.tsx`](../../src/components/layout/Sidebar.tsx)
- **Acceptance criteria:**
  - [ ] Brand row is **dropdown trigger**: visible **ChevronDown** (or chevron) next to logo/initial; `aria-haspopup`, `aria-expanded` correct
  - [ ] Dropdown uses content from Task 2; no **separate** profile/avatar control in sidebar
  - [ ] **One** control with **lucide `Search`** opens palette via Task 1 context (same as ⌘K)
  - [ ] Collapsed rail (`w-16`): search + brand row usable; **tooltips** for icon-only affordances where needed
  - [ ] No `Grid3x3` icon in sidebar for palette
  - [ ] Tests pass; update any layout/sidebar tests if present
- **Notes:** Respect existing [`useSidebarBreakpoint`](../../src/hooks/useSidebarBreakpoint.ts) / rail behavior.
- **Human input needed:** none

## Header

### Task 4: Minimize Header and remove account_menu_v2 layout branching

- **Depends on:** Task 1, Task 3 (palette must work from sidebar before removing header triggers)
- **Creates/modifies:**
  - [`src/components/layout/Header.tsx`](../../src/components/layout/Header.tsx)
- **Acceptance criteria:**
  - [ ] On **`md+`**, header does **not** render: command/search, privacy, theme, settings icons, `WorkspaceSwitcher`, `UserAccountMenu`, or plain `UserAvatar` bar
  - [ ] Mobile: **hamburger + title** (or equivalent) unchanged or improved; no regression opening [`MobileNav`](../../src/components/layout/MobileNav.tsx)
  - [ ] `useAccountMenuV2Enabled` **removed** from header layout branching (flag remains used elsewhere per plan)
  - [ ] Tests updated: [`DashboardPage.test.tsx`](../../src/features/dashboard/__tests__/DashboardPage.test.tsx) or other header-dependent tests still pass
- **Notes:** If an empty `h-14` bar on desktop is undesirable, document chosen pattern (keep strip vs `hidden md:hidden`) in PR; align with design.
- **Human input needed:** none — if product wants zero desktop header height, confirm visually once in PR review

## Mobile drawer

### Task 5: Restructure MobileNav as full-height sidebar-style drawer

- **Depends on:** Task 1, Task 2
- **Creates/modifies:**
  - [`src/components/layout/MobileNav.tsx`](../../src/components/layout/MobileNav.tsx)
- **Acceptance criteria:**
  - [ ] Drawer remains **full-height** left panel (existing `Dialog` pattern acceptable)
  - [ ] **Top:** brand row with **same logo + chevron → account menu** content as desktop (Task 2)
  - [ ] **Search / quick actions:** one row or button with **Search** icon + ⌘K hint; opens palette via Task 1 context
  - [ ] **Primary nav** list below (current routes + prefetch behavior preserved)
  - [ ] `useAccountMenuV2Enabled` **removed** from mobile layout branching (no separate workspace-only block keyed on flag)
  - [ ] Tests pass
- **Notes:** Match spacing/typography to [`Sidebar`](../../src/components/layout/Sidebar.tsx) where practical.
- **Human input needed:** none

## Cleanup + verification

### Task 6: Remove dead code and verify acceptance checklist

- **Depends on:** Task 4, Task 5
- **Creates/modifies:**
  - [`src/components/layout/UserAccountMenu.tsx`](../../src/components/layout/UserAccountMenu.tsx) — delete or reduce to wrapper only if unused
  - Any tests under [`src/components/layout/__tests__/`](../../src/components/layout/__tests__/) or feature tests referencing old header controls
- **Acceptance criteria:**
  - [ ] No unused imports / orphaned `WorkspaceSwitcher` in header paths
  - [ ] Manual or automated coverage for: palette from sidebar + mobile + ⌘K; sign out; workspace submenu when collaboration enabled
  - [ ] Plan **acceptance criteria** block (desktop expanded, collapsed rail, mobile, a11y) checked off in PR description or QA note
  - [ ] `pnpm test` (full or CI-equivalent) passes
- **Notes:** Run eslint on touched files.
- **Human input needed:** none

## Deferred items

- Remove [`account_menu_v2`](../../src/lib/featureFlags.ts) entirely after Settings profile photo + `useWorkspaceMemberProfiles` gating decisions (separate initiative).
- Optional feature flag `sidebar_nav_v2` in [`featureFlags.ts`](../../src/lib/featureFlags.ts) if team wants staged rollout (not required by current plan).
