# Supafolio Routes Documentation

This document provides a comprehensive overview of all routes in the Supafolio application, including their purpose, key components, user interactions, and edge cases.

## Primary Navigation Routes

### `/` or `/dashboard`
- **Purpose**: Main dashboard/home page displaying financial overview
- **Key Components**:
  - Setup progress indicator (shows completion percentage with checklist)
  - Net Worth card with 1D/1W changes
  - Financial summary cards (Investments & Crypto, Total Cash, Total Debts)
  - Estimated Tax Impact section
  - Assets breakdown with pie chart visualization and list
  - Liabilities breakdown with pie chart visualization and list
  - Expense breakdown showing monthly recurring expenses by category
  - Income breakdown showing monthly recurring income by category
  - Market Summary widget (S&P 500 performance)
  - Latest News widget (placeholder)
  - Recent Transactions widget (placeholder)
- **Interactions**:
  - Clicking "View all assets" navigates to `/wealth`
  - Clicking "View all liabilities" navigates to `/wealth`
  - Clicking "View all expenses" navigates to `/budget`
  - Clicking "View all accounts" navigates to `/accounts`
  - Privacy mode toggle hides sensitive financial values
  - Dark mode toggle switches theme
- **Edge Cases**:
  - Empty states for various widgets (no investments, no recent transactions)
  - Loading states for data fetching
  - Error states for API calls
  - Privacy mode replaces values with "••••"

### `/wealth`
- **Purpose**: Unified view for managing assets and liabilities, showing net worth
- **Key Components**:
  - Wealth header
  - Wealth breakdown component (assets, liabilities, net worth)
  - Assets section with view toggle (List/Cards) and category tabs
  - Liabilities section with view toggle (List/Cards) and category tabs
  - Visual divider between sections
  - "Add Asset" and "Add Liability" buttons
  - Edit/Delete actions per asset and liability
- **Interactions**:
  - Create assets via query params: `/wealth?create=asset&type=Investments`
  - Create liabilities via query params: `/wealth?create=liability`
  - View toggle for both sections (list/cards)
  - Category filtering for assets and liabilities
- **Legacy Routes** (redirect to `/wealth`):
  - `/assets` → `/wealth` (with query param transformation)
  - `/liabilities` → `/wealth` (with query param transformation)

### `/assets` (Deprecated - redirects to `/wealth`)
- **Status**: Deprecated, redirects to `/wealth`
- **Migration**: All links should use `/wealth` instead
  - Click "Add New Asset" opens create modal
  - Click edit icon opens edit modal with pre-filled form
  - Click delete icon opens confirmation dialog
  - Switch between list and cards view
  - Search filters assets in real-time
  - Type filter narrows results
- **CRUD Operations**:
  - **Create**: Modal form with validation (name, type, value, date, institution, notes)
  - **Edit**: Same form pre-filled with existing data
  - **Delete**: Confirmation dialog before deletion
  - All operations use optimistic updates
- **Edge Cases**:
  - Empty state when no assets exist
  - No search results message
  - Form validation errors
  - Loading states during API calls

### `/liabilities` (Deprecated - redirects to `/wealth`)
- **Status**: Deprecated, redirects to `/wealth`
- **Migration**: All links should use `/wealth` instead
- **Purpose**: Previously managed and viewed all financial liabilities (now part of `/wealth`)

### `/accounts`
- **Purpose**: View and manage connected financial accounts
- **Key Components**:
  - Search bar
  - Type filter dropdown
  - Accounts table (Institution, Account Name, Type, Balance, Available Balance, Last Updated, Status)
  - "Add New Account" button (placeholder)
- **Interactions**:
  - Search by account name or institution
  - Filter by account type
  - View account details in table
- **Edge Cases**:
  - Empty state
  - Hidden accounts shown with eye-off icon

### `/settings`
- **Purpose**: User preferences and account management
- **Key Components**:
  - Tabbed interface with 4 sections:
    1. **Profile**: Personal information form
    2. **Preferences**: Privacy mode, dark mode, tax rate
    3. **Notifications**: Email notification toggles
    4. **Security**: Two-factor authentication toggle
- **Interactions**:
  - Edit profile information
  - Toggle privacy/dark mode (synced with header controls)
  - Adjust tax rate
  - Configure email notifications
  - Enable/disable MFA
- **Edge Cases**:
  - Form validation for email
  - Unsaved changes warning (future enhancement)
  - Loading states during updates

## Stub Routes

The following routes are implemented as stub pages with "Coming Soon" messages:

### `/ask-supafolio`
- **Purpose**: AI-powered financial assistance (future feature)
- **Status**: Stub page

### `/scenarios`
- **Purpose**: Financial scenario planning (future feature)
- **Status**: Stub page

### `/vault`
- **Purpose**: Document storage and management (future feature)
- **Status**: Stub page

### `/transactions`
- **Purpose**: Transaction history and analysis (future feature)
- **Status**: Stub page

### `/budget`
- **Purpose**: Unified budget management page combining income sources and expenses (subscriptions)
- **Key Components**:
  - **Income Section**: 
    - Total monthly income display
    - Income sources in card grid layout
    - "Add Income" button
  - **Expenses Section**:
    - Total monthly expenses display
    - Category-based filtering tabs (All, Subscriptions, Bills, Repayments, Living, Lifestyle)
    - Expense items grouped by category
    - "Add Expense" button
  - **Budget Summary**: Remaining budget and available percentage
  - **Summary Card**: Total expenses, categories count, total items, average per item
- **Interactions**:
  - Click "Add Income" opens income create modal
  - Click "Add Expense" opens subscription create modal
  - Click edit icon on income/expense opens edit modal
  - Click delete icon opens confirmation dialog
  - Filter expenses by category using tabs
  - View expenses grouped by category in "All" tab
- **CRUD Operations**:
  - **Income**: Create, Edit, Delete via modals (name, source, amount, frequency, next payment date, notes)
  - **Expenses**: Create, Edit, Delete via modals (name, amount, frequency, charge date, next due date, category, notes)
  - All operations use optimistic updates
- **Edge Cases**:
  - Empty states for income and expenses sections independently
  - Empty states per expense category tab
  - Loading states coordinated between income and expenses
  - Error states per section (graceful degradation)
  - Negative remaining budget (shown in red)
  - Zero income handling (division by zero protection)
- **Dashboard Integration**: Income and expense totals appear in respective breakdown cards
- **Route Redirects**: Old routes `/income` and `/subscriptions` redirect to `/budget` for backward compatibility

### `/goals`
- **Purpose**: Financial goal tracking (future feature)
- **Status**: Stub page

### `/earnings-calendar`
- **Purpose**: Earnings calendar for holdings (future feature)
- **Status**: Stub page

### `/calculator`
- **Purpose**: Financial calculators (future feature)
- **Status**: Stub page

### `/product-updates`
- **Purpose**: Product update announcements (future feature)
- **Status**: Stub page

## Navigation Structure

### Sidebar Navigation
The sidebar provides quick access to all main routes:
- Dashboard
- Accounts
- Wealth (replaces Assets and Liabilities)
- Ask Supafolio
- Scenarios
- Vault
- Transactions
- Budget
- Goals
- Earnings Calendar
- Calculator
- Product Updates
- Settings

**Note**: Sidebar is hidden on mobile devices (`hidden md:block`)

### Header Navigation
- Logo/Brand (links to dashboard)
- Privacy mode toggle
- Dark mode toggle
- Command palette button (⌘K)
- Settings link
- Sign out button

### Command Palette
Accessible via ⌘K (Mac) or Ctrl+K (Windows/Linux):
- Quick navigation to any route
- Search by route name or keywords
- Keyboard navigation (Arrow keys, Enter, Escape)

## Route Protection

Currently, all routes are accessible without authentication. In a production environment, you would:
- Implement authentication checks
- Redirect unauthenticated users to login
- Protect sensitive routes
- Store authentication state

## Error Handling

### 404 Not Found
- Route: `*` (catch-all)
- Component: `NotFound`
- Displays when navigating to non-existent routes

### Error Boundaries
- Route-level error boundaries recommended for production
- Currently handled by React's default error handling

## Data Flow

1. **Route loads** → Component mounts
2. **Component calls hook** (e.g., `useAssets()`, `useDashboard()`)
3. **Hook uses React Query** → Calls API layer
4. **API layer** → Returns mock data (with simulated delay)
5. **Data updates** → Component re-renders
6. **User interactions** → Mutations with optimistic updates
7. **Cache invalidation** → Refetch relevant data

## Performance Considerations

- **Code Splitting**: Routes are lazy-loaded (can be enhanced)
- **Query Caching**: React Query caches data with 5-minute stale time
- **Optimistic Updates**: Instant UI feedback before API confirmation
- **Debouncing**: Search inputs could be debounced (future enhancement)

## Accessibility Features

- **Skip to Content**: Link at top of page
- **ARIA Labels**: All interactive elements labeled
- **Keyboard Navigation**: Full keyboard support
- **Focus Management**: Proper focus handling in modals
- **Screen Reader Support**: Semantic HTML and ARIA attributes

## Testing Routes

Each route should have:
- Unit tests for component rendering
- Integration tests for user interactions
- Smoke tests for core flows
- Edge case handling tests

See `src/__tests__/` and component-specific test files for examples.
