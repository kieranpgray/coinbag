import { Suspense, lazy, useEffect } from 'react';
import { Routes as ReactRouterRoutes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { DashboardPage } from '@/features/dashboard/DashboardPage';
import { Skeleton } from '@/components/ui/skeleton';

// Lazy load routes for code splitting - reduces initial bundle size
// DashboardPage is kept eager-loaded as it's the most common route
const WealthPage = lazy(() => import('@/features/wealth/WealthPage').then(m => ({ default: m.WealthPage })));
// AssetsPage, LiabilitiesPage, SubscriptionsPage, TransactionsPage, IncomePage are not imported
// as they redirect to /wealth or /budget routes
const AccountsPage = lazy(() => import('@/features/accounts/AccountsPage').then(m => ({ default: m.AccountsPage })));
const SettingsPage = lazy(() => import('@/features/settings/SettingsPage').then(m => ({ default: m.SettingsPage })));
const GoalsPage = lazy(() => import('@/features/goals/GoalsPage').then(m => ({ default: m.GoalsPage })));
const ScenariosPage = lazy(() => import('@/features/scenarios/ScenariosPage').then(m => ({ default: m.ScenariosPage })));
const BudgetPage = lazy(() => import('@/features/budget/BudgetPage').then(m => ({ default: m.BudgetPage })));
const NotFound = lazy(() => import('@/components/shared/NotFound').then(m => ({ default: m.NotFound })));
const SignInPage = lazy(() => import('@/pages/auth/SignInPage').then(m => ({ default: m.SignInPage })));
const SignUpPage = lazy(() => import('@/pages/auth/SignUpPage').then(m => ({ default: m.SignUpPage })));
const DebugPage = lazy(() => import('@/pages/debug/DebugPage').then(m => ({ default: m.DebugPage })));

// Loading fallback component for lazy-loaded routes
function RouteLoadingFallback() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-10 w-48" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
    </div>
  );
}

// Redirect component for transforming old routes to new wealth route
function AssetsRedirect() {
  const location = useLocation();
  const navigate = useNavigate();
  
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const create = params.get('create');
    const type = params.get('type');
    
    // Transform query params: /assets?create=1&type=Investments -> /wealth?create=asset&type=Investments
    if (create === '1') {
      const newParams = new URLSearchParams();
      newParams.set('create', 'asset');
      if (type) {
        newParams.set('type', type);
      }
      navigate(`/wealth?${newParams.toString()}`, { replace: true });
    } else {
      navigate('/wealth', { replace: true });
    }
  }, [location, navigate]);
  
  return null;
}

function LiabilitiesRedirect() {
  const location = useLocation();
  const navigate = useNavigate();
  
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const create = params.get('create');
    
    // Transform query params: /liabilities?create=1 -> /wealth?create=liability
    if (create === '1') {
      navigate('/wealth?create=liability', { replace: true });
    } else {
      navigate('/wealth', { replace: true });
    }
  }, [location, navigate]);
  
  return null;
}

export function Routes() {
  if (import.meta.env.VITE_DEBUG_LOGGING === 'true') {
    console.log('🔍 DEBUG: Routes component rendering...');
  }
  return (
    <ReactRouterRoutes>
      <Route
        path="/sign-in"
        element={
          <Suspense fallback={<RouteLoadingFallback />}>
            <SignInPage />
          </Suspense>
        }
      />
      <Route
        path="/sign-up"
        element={
          <Suspense fallback={<RouteLoadingFallback />}>
            <SignUpPage />
          </Suspense>
        }
      />
      <Route path="/" element={<Layout />}>
        {/* DashboardPage is eager-loaded (most common route) */}
        <Route index element={<DashboardPage />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route
          path="wealth"
          element={
            <Suspense fallback={<RouteLoadingFallback />}>
              <WealthPage />
            </Suspense>
          }
        />
        {/* Redirect old routes to /wealth for backward compatibility */}
        <Route path="assets" element={<AssetsRedirect />} />
        <Route path="liabilities" element={<LiabilitiesRedirect />} />
        <Route
          path="accounts"
          element={
            <Suspense fallback={<RouteLoadingFallback />}>
              <AccountsPage />
            </Suspense>
          }
        />
        <Route
          path="accounts/:accountId"
          element={
            <Suspense fallback={<RouteLoadingFallback />}>
              <AccountsPage />
            </Suspense>
          }
        />
        <Route
          path="settings"
          element={
            <Suspense fallback={<RouteLoadingFallback />}>
              <SettingsPage />
            </Suspense>
          }
        />
        {/* Stub pages for remaining routes */}
        <Route
          path="scenarios"
          element={
            <Suspense fallback={<RouteLoadingFallback />}>
              <ScenariosPage />
            </Suspense>
          }
        />
        {/* Transactions route removed - transactions are now accessed via /accounts/:accountId */}
        <Route
          path="transactions"
          element={<Navigate to="/accounts" replace />}
        />
        <Route
          path="budget"
          element={
            <Suspense fallback={<RouteLoadingFallback />}>
              <BudgetPage />
            </Suspense>
          }
        />
        {/* Redirect old routes to /budget for backward compatibility */}
        <Route path="subscriptions" element={<Navigate to="/budget" replace />} />
        <Route path="income" element={<Navigate to="/budget" replace />} />
        {/* Redirect /categories to /budget (soft landing for bookmarks) */}
        <Route path="categories" element={<Navigate to="/budget" replace />} />
        <Route
          path="goals"
          element={
            <Suspense fallback={<RouteLoadingFallback />}>
              <GoalsPage />
            </Suspense>
          }
        />
        <Route
          path="debug"
          element={
            <Suspense fallback={<RouteLoadingFallback />}>
              <DebugPage />
            </Suspense>
          }
        />
        <Route
          path="*"
          element={
            <Suspense fallback={<RouteLoadingFallback />}>
              <NotFound />
            </Suspense>
          }
        />
      </Route>
    </ReactRouterRoutes>
  );
}

