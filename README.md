# Coinbag

A comprehensive financial portfolio management application built with React, TypeScript, and modern web technologies.

## Overview

Coinbag is a financial dashboard application that helps users track their assets, liabilities, accounts, and overall net worth. The application provides a clean, intuitive interface for managing personal finances with features like dark mode, privacy mode, and a command palette for quick navigation.

## Features

### Core Functionality
- **Dashboard**: Comprehensive financial overview with net worth tracking, asset/liability breakdowns, and market summaries
- **Assets Management**: Full CRUD operations for tracking investments, real estate, vehicles, crypto, and other assets
- **Liabilities Management**: Track loans, credit cards, and other debts with detailed information
- **Accounts**: View and manage connected financial accounts
- **Settings**: Customize profile, preferences, notifications, and security settings

### User Experience
- **Command Palette** (⌘K / Ctrl+K): Quick navigation and search
- **Dark Mode**: Toggle between light and dark themes
- **Privacy Mode**: Hide sensitive financial information when needed
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile devices
- **Accessibility**: WCAG compliant with keyboard navigation, screen reader support, and focus management

### Technical Features
- **Type-Safe**: Full TypeScript implementation with strict type checking
- **Dual Data Sources**: Mock API for development + Supabase for production
- **Authentication**: Clerk integration with secure user management
- **Form Validation**: Zod schemas for robust form validation
- **Optimistic Updates**: Instant UI feedback with React Query
- **Component Library**: Reusable UI components built with Radix UI and Tailwind CSS

## Tech Stack

- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS with CSS variables for theming
- **UI Components**: Radix UI primitives via shadcn/ui
- **Routing**: React Router v6
- **State Management**: React Query (TanStack Query)
- **Form Handling**: React Hook Form with Zod validation
- **Testing**: Vitest + Testing Library
- **Linting**: ESLint + Prettier
- **Package Manager**: pnpm

## Backend Migration

The application has been migrated from a mock-only data layer to support both development mocks and a production Supabase backend with Clerk authentication.

### Current Status
- ✅ **Subscriptions Entity**: Fully migrated with authentication, RLS policies, and comprehensive testing
- 🔄 **Next Priority**: Assets, Liabilities, Accounts entities ready for migration
- 📋 **Migration Plan**: See `/docs/MIGRATION_CHECKLIST.md` for detailed roadmap

### Architecture
- **Development**: `VITE_DATA_SOURCE=mock` uses in-memory data stores
- **Production**: `VITE_DATA_SOURCE=supabase` connects to PostgreSQL with Row Level Security
- **Authentication**: Clerk handles user management and JWT tokens
- **Data Contracts**: Zod schemas ensure type safety between frontend and backend

For detailed setup instructions, see:
- `/docs/CLERK_SETUP.md` - Authentication configuration
- `/docs/SUPABASE_SETUP.md` - Database setup and JWT integration
- `/docs/MIGRATION_CHECKLIST.md` - Remaining entity migration plan

## Getting Started

### Prerequisites

- Node.js 18+ 
- pnpm 8+

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd coinbag
```

2. Install dependencies:
```bash
pnpm install
```

3. **Set up HTTPS (Recommended)**:
```bash
# Generate self-signed SSL certificates for localhost
./scripts/generate-ssl-certs.sh
```

4. Start the development server:
```bash
pnpm run dev
```

5. Open your browser:
   - **HTTPS**: `https://localhost:5173` (if certificates are generated)
   - **HTTP**: `http://localhost:5173` (fallback if no certificates)
   
   **Note**: If using HTTPS, your browser will show a security warning for the self-signed certificate. This is normal for development. Click "Advanced" → "Proceed to localhost" to continue.

### Environment Setup

Create a `.env` file in the root directory with the following variables:

```bash
# Data source: 'mock' for development, 'supabase' for production
VITE_DATA_SOURCE=mock

# Clerk Authentication (Required)
VITE_CLERK_PUBLISHABLE_KEY=pk_test_your_clerk_publishable_key_here

# Supabase Database (Required when VITE_DATA_SOURCE=supabase)
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

**Setup Instructions:**

1. **Clerk Authentication:**
   - Create account at [clerk.com](https://clerk.com)
   - Create a new application
   - Copy the publishable key to `VITE_CLERK_PUBLISHABLE_KEY`
   - Add redirect URL environment variables to `.env`:
     ```bash
     CLERK_SIGN_IN_URL=/sign-in
     CLERK_SIGN_UP_URL=/sign-up
     CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/dashboard
     CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/dashboard
     ```
   - **Note**: Clerk handles redirects automatically - no dashboard configuration needed. See [`docs/CLERK_REDIRECT_URLS_GUIDE.md`](./docs/CLERK_REDIRECT_URLS_GUIDE.md) for details.

2. **Supabase Database (Optional for development):**
   - Create account at [supabase.com](https://supabase.com)
   - Create a new project
   - Copy Project URL to `VITE_SUPABASE_URL`
   - Copy anon/public key to `VITE_SUPABASE_ANON_KEY`
   - Run database migrations from `/supabase/migrations/`
   - Configure Clerk JWT integration (see `/docs/SUPABASE_SETUP.md`)

**Note:** Keep `VITE_DATA_SOURCE=mock` for local development. Switch to `supabase` when ready to test the real backend.

### Available Scripts

- `pnpm run dev` - Start development server
- `pnpm run build` - Build for production
- `pnpm run preview` - Preview production build
- `pnpm run test` - Run tests in watch mode
- `pnpm run test --run` - Run tests once
- `pnpm run lint` - Run ESLint
- `pnpm run lint --fix` - Fix ESLint errors

## Safe Deployment Rules

**⚠️ CRITICAL**: Destructive database operations are **BLOCKED** in production.

### Environment Protection

- **Production Always Blocked**: No destructive operations allowed when `NODE_ENV=production` or `APP_ENV=prod`
- **Explicit Opt-In Required**: Set `ALLOW_DESTRUCTIVE_DB_OPS=true` for development operations
- **Production Still Protected**: Even with `ALLOW_DESTRUCTIVE_DB_OPS=true`, production is always blocked

### Destructive Operations

The following operations are considered destructive and require protection:
- `reset` - Database reset
- `seed` - Database seeding
- `truncate` - Table truncation
- `drop` - Table/database dropping
- `delete` - Mass deletion operations

### Safe Practices

1. **Use Guard Utilities**
   ```bash
   # Guard check before operation
   node scripts/guard-destructive-ops.js "operation description"
   
   # Or use safe wrapper
   node scripts/safe-db-ops.js "supabase db reset"
   ```

2. **Development Only**
   ```bash
   # ✅ Safe in development
   ALLOW_DESTRUCTIVE_DB_OPS=true supabase db reset
   
   # ❌ BLOCKED in production (even with flag)
   NODE_ENV=production ALLOW_DESTRUCTIVE_DB_OPS=true supabase db reset
   ```

3. **CI/CD Validation**
   ```bash
   # Check workflows before deploying
   ./scripts/ci-check-destructive-ops.sh
   ```

4. **Production Migrations**
   - Apply migrations manually via Supabase Dashboard
   - Never use `supabase db push` or `supabase db reset` in production
   - Review all migration SQL before applying
   - Test in staging first

### Examples

**✅ Safe (Development)**:
```bash
ALLOW_DESTRUCTIVE_DB_OPS=true node scripts/seed-database.js
```

**❌ Blocked (Production)**:
```bash
NODE_ENV=production node scripts/seed-database.js
# Error: Destructive operations not allowed in production
```

**❌ Blocked (No Flag)**:
```bash
node scripts/seed-database.js
# Error: ALLOW_DESTRUCTIVE_DB_OPS must be set to 'true'
```

## Project Structure

```
src/
├── components/               # Cross-cutting UI building blocks
│   ├── ui/                   # Base primitives (Button, Card, Dialog, etc.)
│   ├── layout/               # Application chrome (Header, Sidebar, Footer)
│   ├── shared/               # Utilities used across features (PrivacyWrapper)
│   └── command-palette/      # Command palette implementation
├── features/                 # Feature-first modules (pages + feature components)
│   ├── assets/               # Asset management experience
│   │   ├── AssetsPage.tsx    # Feature entry point (route component)
│   │   ├── components/       # Assets-specific UI (cards, modals, lists)
│   │   └── hooks/            # React Query hooks scoped to assets
│   ├── liabilities/
│   │   ├── LiabilitiesPage.tsx
│   │   ├── components/
│   │   └── hooks/
│   ├── dashboard/
│   │   ├── DashboardPage.tsx
│   │   ├── components/
│   │   └── hooks/
│   ├── goals/
│   │   ├── GoalsPage.tsx
│   │   ├── components/
│   │   └── hooks/
│   ├── accounts/
│   │   ├── AccountsPage.tsx
│   │   └── hooks/
│   ├── settings/             # Preferences and profile management
│   ├── scenarios/            # Future-facing stubs
│   └── stubs/                # Placeholder routes
├── hooks/                    # Shared React hooks (React Query integration, etc.)
├── lib/                      # Utilities and mock API layer
├── mocks/                    # Mock data factories and fixtures
├── contexts/                 # React contexts (Theme, etc.)
├── routes/                   # Route configuration
├── types/                    # TypeScript domain definitions
└── test/                     # Test setup and utilities
```

## Key Components

### Dashboard
- **NetWorthCard**: Displays total net worth with daily/weekly changes
- **SummaryCard**: Shows investments, cash, and debts
- **AssetsBreakdown**: Visual breakdown of assets by category
- **LiabilitiesBreakdown**: Visual breakdown of liabilities by category
- **MarketSummary**: Market data and commentary
- **SetupProgress**: Onboarding checklist and progress

### Assets & Liabilities
- **List/Cards View Toggle**: Switch between table and card layouts
- **Search & Filter**: Find items by name, institution, or type
- **CRUD Modals**: Create, edit, and delete with form validation
- **Optimistic Updates**: Instant UI feedback

### Settings
- **Profile**: Personal information management
- **Preferences**: Dark mode, privacy mode, tax settings
- **Notifications**: Email notification preferences
- **Security**: Two-factor authentication

## Mock Data

The application uses a comprehensive mock data layer for development and testing:

- **Factories**: Generate realistic test data (`src/mocks/factories.ts`)
- **Fixtures**: Pre-defined JSON data files
- **API Layer**: Simulated API with delays (`src/lib/api.ts`)

All data is stored in-memory and resets on page refresh.

## Testing

The project includes comprehensive test coverage:

- **Unit Tests**: Individual component and utility function tests
- **Integration Tests**: Route and modal interaction tests
- **Smoke Tests**: Core application flow verification

Run tests with:
```bash
pnpm run test
```

## Accessibility

The application follows WCAG 2.1 guidelines:

- **Keyboard Navigation**: Full keyboard support throughout
- **Screen Readers**: Proper ARIA labels and semantic HTML
- **Focus Management**: Visible focus indicators and skip links
- **Color Contrast**: Meets WCAG AA standards

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## Development Guidelines

### Code Style
- Use TypeScript for all new files
- Follow ESLint and Prettier configurations
- Use functional components with hooks
- Prefer composition over inheritance

### Component Structure
- Keep components small and focused
- Use TypeScript interfaces for props
- Extract reusable logic into custom hooks
- Follow the feature-based folder structure

### Testing
- Write tests for critical user flows
- Test components in isolation
- Use Testing Library for user-centric tests
- Mock external dependencies

## Contributing

1. Create a feature branch
2. Make your changes
3. Write/update tests
4. Ensure all tests pass
5. Submit a pull request

## License

This project is for demonstration purposes.

## Acknowledgments

Built with modern web technologies and best practices for a cursor-optimized development experience.
