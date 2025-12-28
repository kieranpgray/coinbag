# Codebase Structure Overview

This project is still a prototype, but it already follows a feature-first layout so new engineers can ramp up quickly. The goal of this guide is to highlight the handful of conventions in play and point to the most important entry points.

## Frontend layout (`/src`)

```
src/
├── components/            # Cross-cutting building blocks
│   ├── command-palette/   # Command palette implementation
│   ├── layout/            # Header, sidebar, shell chrome
│   ├── shared/            # Small utilities (e.g. PrivacyWrapper)
│   └── ui/                # Shadcn-derived primitives
├── features/              # Feature slices = route + feature-specific assets
│   └── <feature>/
│       ├── <Feature>Page.tsx   # Route component; only place React Router sees
│       ├── components/         # Domain-specific UI (cards, lists, modals)
│       └── hooks/              # React Query hooks + mutations for that domain
├── hooks/                 # Cross-cutting hooks (command palette, user profile)
├── lib/                   # Mock API + shared utilities
├── mocks/                 # JSON fixtures & factories powering the mock API
├── contexts/              # Application-wide contexts (ThemeProvider)
├── routes/                # Route definitions (thin wrapper around React Router)
├── types/                 # Domain types used across features
└── test/                  # Vitest setup
```

### Feature slices

- Each feature owns its components and hooks, keeping domain knowledge local.
- Page components stitch together feature hooks + components and stay slim.
- Shared UI should live under `src/components/ui` or `src/components/shared` to avoid duplication.
- Example features: `assets`, `liabilities`, `subscriptions` (CRUD for recurring expenses with dashboard integration)

### Shared utilities

- React Query hooks that span multiple features stay in `src/hooks`.
- The mock API in `src/lib/api.ts` is the single source of truth for data flow; feature hooks call into it.
- Tailwind, Vite, and TypeScript configuration live at the repo root to keep the prototype easy to tweak.

## Backend stub (`/app.py`)

`app.py` and the templates folder power a lightweight Flask prototype for CSV deduping. It is intentionally separate from the SPA; treat it as a throwaway tool until the product vision requires a consolidated backend.

## Onboarding tips

1. Start in `src/routes/index.tsx` to see which page component powers each route.
2. Drop into the corresponding feature folder to explore domain-specific components and hooks.
3. Reach for the mock API (`src/lib/api.ts`) when you need to fetch, mutate, or seed data.
4. Use the shared UI primitives under `src/components/ui` to keep styling consistent.
