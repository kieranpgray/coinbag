# Supafolio Product Terminology

This file defines the canonical terms used across the product, codebase, copy, and support. When adding new features or writing copy, use these terms exactly.

## Core feature names

| Canonical term | Maps to (code) | Route | Notes |
|---------------|---------------|-------|-------|
| Overview | Dashboard | `/app/dashboard` | The main net worth + summary page |
| Holdings | Wealth | `/app/wealth` | All assets and liabilities |
| Activity | Accounts | `/app/accounts` | Transaction history |
| Recurring | Budget | `/app/budget` | Income sources and regular expenses |
| Allocate | Transfers | `/app/transfers` | Pay day planning and surplus allocation |
| Shared Access | Team | `/app/settings?tab=team` | Workspace member management |

> Route paths are permanent. Only display names change when terminology updates.

## Financial concepts

| Term | Definition | Do not use |
|------|-----------|-----------|
| Net worth | Total assets minus total liabilities | Wealth, balance, total |
| Holdings | The full set of a user's assets and liabilities | Portfolio, assets, accounts |
| Surplus | Income minus committed expenses; what's left to allocate | Remaining, available, leftover |
| Recurring | Income sources and regular committed expenses | Budget, bills, expenses |
| Allocate | The act of assigning surplus to a destination | Transfer, move, send |
| Plan | A single pay cycle's allocation layout | Budget, schedule |
| Workspace | A user's private financial environment (may be shared) | Account, dashboard |
| Shared Access | Granting another person access to a workspace | Team, sharing, access |
| Activity | Transaction history from imported bank statements | Transactions, accounts |

## Asset types

| Canonical label | Stored value (DB) | Locale notes |
|----------------|------------------|-------------|
| Property | Property | Both |
| Shares | Shares | Both |
| RSUs | RSUs | Both |
| Super | Super | AU only |
| Retirement | Super | US only (stored as "Super") |
| Crypto | Crypto | Both |
| Cash | Cash | Both |
| Vehicle | Vehicle | Both |
| Other asset | Other asset | Both |

## Liability types

| Canonical label | Stored value (DB) | Locale notes |
|----------------|------------------|-------------|
| Home loan | Home loan | Both |
| Personal loan | Personal loan | Both |
| Car loan | Car loan | Both |
| Credit card | Credit card | Both |
| HECS / HELP debt | HECS / HELP debt | AU only |
| Other liability | Other liability | Both |

## UI copy patterns

| Pattern | Correct | Incorrect |
|---------|---------|----------|
| Destructive confirm | Remove [thing] | Delete |
| Destructive cancel | Keep it | Cancel, No, Go back |
| Empty state CTA | Add my first [thing] → | Add [Thing], Get started |
| Cross-feature link | Go to Recurring → | Go to Budget |
| Privacy mode inactive | Privacy mode | Hide values, Privacy off |
| Privacy mode active | Privacy on | Privacy enabled |

## Locale divergences (intentional)

Strings that differ between `en-AU` and `en-US`:

| Concept | en-AU | en-US |
|---------|-------|-------|
| Retirement savings | Super | Retirement |
| Student debt | HECS / HELP debt | (not shown) |
| Retirement value helper | Check your latest super statement for the most accurate balance. | Check your latest retirement account statement for the most accurate balance. |
