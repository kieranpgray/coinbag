# Coinbag Routes Documentation

This document provides a comprehensive overview of all routes in the Coinbag application, including their purpose, key components, user interactions, and edge cases.

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
  - Clicking "View all assets" navigates to `/assets`
  - Clicking "View all liabilities" navigates to `/liabilities`
  - Clicking "View all subscriptions" navigates to `/subscriptions`
  - Clicking "View all accounts" navigates to `/accounts`
  - Privacy mode toggle hides sensitive financial values
  - Dark mode toggle switches theme
- **Edge Cases**:
  - Empty states for various widgets (no investments, no recent transactions)
  - Loading states for data fetching
  - Error states for API calls
  - Privacy mode replaces values with "••••"

### `/assets`
- **Purpose**: Manage and view all financial assets
- **Key Components**:
  - View toggle (List/Cards)
  - Search bar for filtering by name or institution
  - Type filter dropdown (Real Estate, Investments, Vehicles, Crypto, Other)
  - "Add New Asset" button
  - Asset list table or card grid
  - Edit/Delete actions per asset
- **Interactions**:
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

### `/liabilities`
- **Purpose**: Manage and view all financial liabilities
- **Key Components**:
  - View toggle (List/Cards)
  - Search bar for filtering
  - Type filter dropdown (Loans, Credit Cards, Other)
  - "Add New Liability" button
  - Liability list table or card grid
  - Edit/Delete actions per liability
- **Interactions**:
  - Same as Assets page (mirrored structure)
  - Conditional fields: Monthly payment only shown for Loans
- **CRUD Operations**:
  - **Create**: Modal form (name, type, balance, interest rate, monthly payment*, due date, institution)
  - **Edit**: Pre-filled form
  - **Delete**: Confirmation dialog
- **Edge Cases**:
  - Empty state
  - Conditional form fields based on liability type
  - Validation for required fields

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

### `/ask-coinbag`
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

### `/subscriptions`
- **Purpose**: Track and manage recurring expenses and subscriptions
- **Key Components**:
  - "Add Subscription" button
  - Subscription list table (Name, Amount, Frequency, Category, Next Due, Actions)
  - Edit/Delete actions per subscription
- **Interactions**:
  - Click "Add Subscription" opens create modal
  - Click edit icon opens edit modal with pre-filled form
  - Click delete icon opens confirmation dialog
- **CRUD Operations**:
  - **Create**: Modal form with validation (name, amount, frequency, charge date, next due date, category, notes)
  - **Edit**: Same form pre-filled with existing data
  - **Delete**: Confirmation dialog before deletion
  - All operations use optimistic updates
- **Edge Cases**:
  - Empty state when no subscriptions exist
  - Form validation for required fields and date ordering
  - Loading states during API calls
- **Dashboard Integration**: Subscription totals appear in expense breakdown cards

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
- Assets
- Liabilities
- Ask Coinbag
- Scenarios
- Vault
- Transactions
- Subscriptions
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
