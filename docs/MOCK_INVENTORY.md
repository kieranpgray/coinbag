# Mock API Inventory

This document catalogs all mocked API usage in the Coinbag application, including in-memory data stores, test fixtures, and stub implementations.

## Summary

The application uses a comprehensive mock data layer for development and testing. The main components are:

- **Mock API Layer**: In-memory data stores with CRUD operations (`src/lib/api.ts`)
- **Data Factories**: Realistic test data generation (`src/mocks/factories.ts`)
- **Test Mocks**: Vitest mocks for isolated unit testing
- **Stub Pages**: Placeholder components for unimplemented features

## Detailed Inventory

| ID | File Path + Line Range | Entity/Resource Affected | TanStack Query queryKeys + Hook Usage | CRUD Coverage | Validation Coverage | Env Scope | Suggested Real Backend Mapping |
|----|-------------------------|--------------------------|---------------------------------------|---------------|---------------------|-----------|-------------------------------|
| MOCK_API_ASSETS | `src/lib/api.ts:31-469` | Asset | `['assets']` - useAssets, useAsset, useCreateAsset, useUpdateAsset, useDeleteAsset | C/R/U/D | None (relies on domain types) | dev/test | Supabase table `assets` with RLS policies |
| MOCK_API_LIABILITIES | `src/lib/api.ts:31-469` | Liability | `['liabilities']` - useLiabilities, useLiability, useCreateLiability, useUpdateLiability, useDeleteLiability | C/R/U/D | None (relies on domain types) | dev/test | Supabase table `liabilities` with RLS policies |
| MOCK_API_ACCOUNTS | `src/lib/api.ts:31-469` | Account | `['accounts']` - useAccounts, useAccount, useCreateAccount, useUpdateAccount, useDeleteAccount | C/R/U/D | None (relies on domain types) | dev/test | Supabase table `accounts` with RLS policies |
| MOCK_API_TRANSACTIONS | `src/lib/api.ts:31-469` | Transaction | `['transactions']` - useTransactions | R (paginated) | None (relies on domain types) | dev/test | Supabase table `transactions` with RLS policies |
| MOCK_API_GOALS | `src/lib/api.ts:31-469` | Goal | `['goals']` - useGoals, useGoal, useCreateGoal, useUpdateGoal, useDeleteGoal | C/R/U/D | None (relies on domain types) | dev/test | Supabase table `goals` with RLS policies |
| MOCK_API_SUBSCRIPTIONS | `src/lib/api.ts:31-469` | Subscription | `['subscriptions']` - useSubscriptions, useSubscription, useCreateSubscription, useUpdateSubscription, useDeleteSubscription | C/R/U/D | SubscriptionService validation (business rules) | dev/test | **TARGET FOR MIGRATION** - Supabase table `subscriptions` with RLS policies |
| MOCK_API_USER | `src/lib/api.ts:31-469` | User | `['user']` - useUser, useUpdateUser | R/U | None (relies on domain types) | dev/test | Clerk user management (no Supabase table needed) |
| MOCK_API_DASHBOARD | `src/lib/api.ts:31-469` | DashboardData | `['dashboard']` - useDashboard | R | DashboardCalculations service | dev/test | Supabase view/function aggregating user data |
| MOCK_API_MARKET | `src/lib/api.ts:31-469` | MarketSummary | `['market']` - useMarketSummary | R | None | dev/test | External API (not Supabase) |
| MOCK_FACTORIES_ALL | `src/mocks/factories.ts:1-432` | All entities | N/A (data generation for API seeding) | N/A | Basic type validation | dev/test | N/A (seed data for development) |
| TEST_MOCK_SUBSCRIPTIONS | `src/features/subscriptions/__tests__/useSubscriptions.test.tsx:7-14` | Subscription | `['subscriptions']` hooks | C/R/U/D | Mocked API responses | test | Unit test coverage maintained |
| TEST_MOCK_SUBSCRIPTION_SERVICE | `src/features/subscriptions/__tests__/subscriptionService.test.ts:6-11` | Subscription | N/A (service layer testing) | N/A | Mocked validation utils | test | Unit test coverage maintained |
| TEST_MOCK_APP | `src/__tests__/smoke.test.tsx:8-49` | User, Dashboard, Market | `['user']`, `['dashboard']`, `['market']` | R | Mocked API responses | test | Integration test coverage maintained |
| STUB_PAGE_TRANSACTIONS | `src/routes/index.tsx:26` | Transaction | N/A | None | None | dev | Future implementation |
| STUB_PAGE_SCENARIOS | `src/features/scenarios/ScenariosPage.tsx` | Scenario | N/A | None | None | dev | Future implementation |

## Migration Priority Analysis

### High Priority (Core User Data)
- **Subscriptions** ✅ (Target for immediate migration)
- **Assets** (Financial core)
- **Liabilities** (Financial core)
- **Accounts** (Financial core)
- **Goals** (User planning)

### Medium Priority (Derived/Aggregated)
- **Dashboard** (Aggregates other entities)
- **Transactions** (Detailed financial history)

### Low Priority (Infrastructure/External)
- **User** (Handled by Clerk)
- **Market** (External API, not user-specific)

## Migration Considerations

### Schema Decisions Needed
1. **User Ownership**: How to enforce user_id in RLS policies
2. **Audit Trail**: Whether to add created_at/updated_at fields
3. **Soft Deletes**: Whether to implement deleted_at vs hard deletes
4. **Relationships**: Foreign keys between entities (e.g., transactions → accounts)

### Test Strategy
- Keep mock implementations for fast unit tests
- Add integration tests with real Supabase (but mocked Clerk)
- Use environment variables to toggle between mock/real backends

### Rollback Strategy
- Maintain `VITE_DATA_SOURCE=mock|supabase` toggle
- Ensure mock data parity during transition
- Document SQL rollback migrations

## Next Steps

1. **Phase 1**: Migrate Subscriptions (target entity)
2. **Phase 2**: Migrate Assets, Liabilities, Accounts
3. **Phase 3**: Migrate Goals, Transactions
4. **Phase 4**: Migrate Dashboard aggregations
5. **Phase 5**: Remove mock layer entirely

## Unknowns Requiring Investigation

1. **External API Dependencies**: Market data source and refresh frequency
2. **File Storage**: Document upload requirements (if any)
3. **Real-time Features**: Any websocket/subscription needs
4. **Bulk Operations**: Import/export requirements
