# Migration Checklist - Remaining Entities

This document provides a prioritized checklist for migrating remaining entities from mock API to Supabase with Clerk authentication.

## 🎯 Migration Priority Framework

### High Priority (Core Financial Data)
- **Impact**: Essential for core financial tracking
- **Dependencies**: Basic user data, accounts
- **Timeline**: Complete within 1-2 weeks

### Medium Priority (Aggregated/Reporting Data)
- **Impact**: Enhances dashboard and reporting features
- **Dependencies**: May require multiple entity relationships
- **Timeline**: Complete within 2-4 weeks

### Low Priority (Advanced Features)
- **Impact**: Nice-to-have features, can be deferred
- **Dependencies**: May require complex relationships
- **Timeline**: Complete within 1-2 months

## 📋 Entity Migration Checklist

### Phase 1: High Priority (Week 1-2)

#### 1. **Assets** 🔴 HIGH PRIORITY
- **Status**: Ready for migration
- **Complexity**: Medium
- **Dependencies**: Basic user authentication
- **Estimated Time**: 2-3 days

**Migration Steps:**
- [ ] Create Zod contracts (`src/contracts/assets.ts`)
- [ ] Add database migration (`supabase/migrations/`)
- [ ] Implement API adapter (`src/data/assets/assetsApi.ts`)
- [ ] Update hooks (`src/features/assets/hooks/useAssets.ts`)
- [ ] Update tests (`src/features/assets/__tests__/`)
- [ ] Update documentation

**Key Considerations:**
- Multiple asset types (Real Estate, Investments, Vehicles, Crypto, Other)
- Value tracking with change percentages
- Institution and notes fields
- Dashboard integration for net worth calculations

#### 2. **Liabilities** 🔴 HIGH PRIORITY
- **Status**: Ready for migration
- **Complexity**: Medium
- **Dependencies**: Basic user authentication
- **Estimated Time**: 2-3 days

**Migration Steps:**
- [ ] Create Zod contracts (`src/contracts/liabilities.ts`)
- [ ] Add database migration (`supabase/migrations/`)
- [ ] Implement API adapter (`src/data/liabilities/liabilitiesApi.ts`)
- [ ] Update hooks (`src/features/liabilities/hooks/useLiabilities.ts`)
- [ ] Update tests (`src/features/liabilities/__tests__/`)
- [ ] Update documentation

**Key Considerations:**
- Multiple liability types (Loans, Credit Cards, Other)
- Interest rates and payment tracking
- Due dates and institution tracking
- Dashboard integration for debt calculations

#### 3. **Accounts** 🔴 HIGH PRIORITY
- **Status**: Ready for migration
- **Complexity**: Medium
- **Dependencies**: Basic user authentication
- **Estimated Time**: 2-3 days

**Migration Steps:**
- [ ] Create Zod contracts (`src/contracts/accounts.ts`)
- [ ] Add database migration (`supabase/migrations/`)
- [ ] Implement API adapter (`src/data/accounts/accountsApi.ts`)
- [ ] Update hooks (`src/features/accounts/hooks/useAccounts.ts`)
- [ ] Update tests (`src/features/accounts/__tests__/`)
- [ ] Update documentation

**Key Considerations:**
- Multiple account types (Checking, Savings, Investment, Credit Card, Loan, Crypto)
- Balance tracking (available vs. current)
- Institution and hidden status
- Transaction relationships (future)

### Phase 2: Medium Priority (Week 3-6)

#### 4. **Goals** 🟡 MEDIUM PRIORITY
- **Status**: Ready for migration
- **Complexity**: Medium
- **Dependencies**: Basic user authentication
- **Estimated Time**: 2-3 days

**Migration Steps:**
- [ ] Create Zod contracts (`src/contracts/goals.ts`)
- [ ] Add database migration (`supabase/migrations/`)
- [ ] Implement API adapter (`src/data/goals/goalsApi.ts`)
- [ ] Update hooks (`src/features/goals/hooks/useGoals.ts`)
- [ ] Update tests (`src/features/goals/__tests__/`)
- [ ] Update documentation

**Key Considerations:**
- Goal types (Grow, Save, Pay Off, Invest)
- Target vs. current amount tracking
- Deadline and status management
- Source field (account references)

#### 5. **Transactions** 🟡 MEDIUM PRIORITY
- **Status**: Blocked - requires Accounts migration
- **Complexity**: High
- **Dependencies**: Accounts entity
- **Estimated Time**: 4-5 days

**Migration Steps:**
- [ ] Create Zod contracts (`src/contracts/transactions.ts`)
- [ ] Add database migration (`supabase/migrations/`)
- [ ] Implement API adapter (`src/data/transactions/transactionsApi.ts`)
- [ ] Update hooks (`src/features/transactions/hooks/useTransactions.ts`)
- [ ] Update tests (`src/features/transactions/__tests__/`)
- [ ] Update documentation

**Key Considerations:**
- Account relationships (foreign keys)
- Transaction types (income/expense)
- Category classification
- Pagination for large datasets
- Date range filtering

#### 6. **Dashboard Enhancements** 🟡 MEDIUM PRIORITY
- **Status**: Partially ready
- **Complexity**: Medium
- **Dependencies**: Assets, Liabilities, Subscriptions, Accounts
- **Estimated Time**: 3-4 days

**Migration Steps:**
- [ ] Create dashboard calculation services
- [ ] Add database views/functions for aggregations
- [ ] Update dashboard API endpoints
- [ ] Enhance dashboard hooks
- [ ] Update dashboard tests
- [ ] Performance optimization

### Phase 3: Low Priority (Month 2-3)

#### 7. **Categories** 🟢 LOW PRIORITY
- **Status**: Not started
- **Complexity**: Low
- **Dependencies**: None
- **Estimated Time**: 1-2 days

**Migration Steps:**
- [ ] Create Zod contracts (`src/contracts/categories.ts`)
- [ ] Add database migration (`supabase/migrations/`)
- [ ] Implement API adapter (`src/data/categories/categoriesApi.ts`)
- [ ] Update category management UI
- [ ] Update tests
- [ ] Update documentation

#### 8. **Budgets** 🟢 LOW PRIORITY
- **Status**: Not started
- **Complexity**: Medium
- **Dependencies**: Categories, Transactions
- **Estimated Time**: 3-4 days

**Migration Steps:**
- [ ] Create Zod contracts (`src/contracts/budgets.ts`)
- [ ] Add database migration (`supabase/migrations/`)
- [ ] Implement API adapter (`src/data/budgets/budgetsApi.ts`)
- [ ] Update budget tracking UI
- [ ] Update tests
- [ ] Update documentation

#### 9. **Reports/Analytics** 🟢 LOW PRIORITY
- **Status**: Not started
- **Complexity**: High
- **Dependencies**: All entities
- **Estimated Time**: 1-2 weeks

**Migration Steps:**
- [ ] Design analytics database schema
- [ ] Create aggregation functions/views
- [ ] Implement reporting API endpoints
- [ ] Build analytics UI components
- [ ] Add comprehensive tests
- [ ] Performance optimization

## 🛠️ Migration Template

For each entity migration, follow this template:

### 1. Preparation (1-2 hours)
- [ ] Review existing domain types and UI usage
- [ ] Identify all CRUD operations needed
- [ ] Plan database schema and relationships
- [ ] Update mock data if needed

### 2. Contracts (2-4 hours)
- [ ] Create Zod schemas (entity, create, update, list, id)
- [ ] Add validation rules and business logic
- [ ] Export TypeScript types
- [ ] Add comprehensive tests

### 3. Database (2-4 hours)
- [ ] Create migration file with proper RLS policies
- [ ] Add indexes for performance
- [ ] Test migration locally
- [ ] Document schema decisions

### 4. API Layer (4-6 hours)
- [ ] Implement Supabase adapter with error handling
- [ ] Add data source toggle (mock/supabase)
- [ ] Update React Query hooks
- [ ] Preserve existing hook signatures

### 5. Testing (2-4 hours)
- [ ] Update existing component tests
- [ ] Add API adapter tests
- [ ] Test error scenarios
- [ ] Verify data source switching

### 6. Integration (2-4 hours)
- [ ] Update dashboard calculations if needed
- [ ] Test end-to-end functionality
- [ ] Performance testing
- [ ] Documentation updates

## 🔄 Migration Workflow

### Pre-Migration Checklist
- [ ] All dependencies migrated
- [ ] Database schema designed
- [ ] UI components reviewed
- [ ] Test coverage planned
- [ ] Rollback plan documented

### During Migration
- [ ] Work in feature branch
- [ ] Keep commits small and focused
- [ ] Test frequently during development
- [ ] Update documentation incrementally

### Post-Migration
- [ ] All tests passing
- [ ] Manual testing completed
- [ ] Performance verified
- [ ] Documentation updated
- [ ] Code review completed

## 📊 Success Metrics

### Entity Migration Success Criteria
- [ ] All CRUD operations functional
- [ ] Authentication and authorization working
- [ ] Performance meets requirements (< 500ms response times)
- [ ] Test coverage > 80%
- [ ] No breaking changes to existing UI
- [ ] Documentation complete and accurate

### Overall Migration Success Criteria
- [ ] All high-priority entities migrated
- [ ] 95%+ test coverage maintained
- [ ] Performance improved or maintained
- [ ] User experience seamless
- [ ] Development workflow smooth
- [ ] Documentation comprehensive

## 🚨 Risk Mitigation

### Rollback Strategy
- Keep `VITE_DATA_SOURCE=mock` as default
- Each migration includes rollback SQL
- Mock implementations preserved
- Gradual rollout with feature flags

### Testing Strategy
- Unit tests for all new code
- Integration tests for API boundaries
- E2E tests for critical user flows
- Performance regression testing

### Monitoring Strategy
- Track API response times
- Monitor error rates
- Watch database performance
- User feedback collection

## 📈 Timeline and Milestones

### Week 1-2: Core Entities
- [ ] Assets migration complete
- [ ] Liabilities migration complete
- [ ] Accounts migration complete
- [ ] Integration testing

### Week 3-4: Supporting Entities
- [ ] Goals migration complete
- [ ] Dashboard enhancements
- [ ] Performance optimization

### Week 5-6: Advanced Features
- [ ] Transactions migration complete
- [ ] Categories and budgets (if time)
- [ ] Final testing and documentation

### Month 2-3: Polish and Optimization
- [ ] Analytics and reporting
- [ ] Performance monitoring
- [ ] Production deployment preparation

---

## 🎯 Immediate Next Steps

1. **Start Assets Migration** - Begin with the highest priority entity
2. **Set up local Supabase** - Ensure development environment ready
3. **Create migration branch** - Keep work organized and revertible
4. **Update environment variables** - Ensure all required vars documented
5. **Review this checklist** - Update as migration progresses

**Remember**: Each migration should be self-contained, testable, and revertible. Use the subscriptions migration as the template for all future migrations.
