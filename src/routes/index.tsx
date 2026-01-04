import { Suspense, lazy, useEffect } from 'react';
import { Routes as ReactRouterRoutes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import { logger } from '@/lib/logger';
import { Layout } from '@/components/layout/Layout';
import { DashboardPage } from '@/features/dashboard/DashboardPage';
import { LandingPage } from '@/pages/landing/LandingPage';
import { Skeleton } from '@/components/ui/skeleton';
import { ROUTES } from '@/lib/constants/routes';

// Lazy load routes for code splitting
const WealthPage = lazy(() => import('@/features/wealth/WealthPage').then(m => ({ default: m.WealthPage })));
const AccountsPage = lazy(() => import('@/features/accounts/AccountsPage').then(m => ({ default: m.AccountsPage })));
const SettingsPage = lazy(() => import('@/features/settings/SettingsPage').then(m => ({ default: m.SettingsPage })));
const GoalsPage = lazy(() => import('@/features/goals/GoalsPage').then(m => ({ default: m.GoalsPage })));
const ScenariosPage = lazy(() => import('@/features/scenarios/ScenariosPage').then(m => ({ default: m.ScenariosPage })));
const BudgetPage = lazy(() => import('@/features/budget/BudgetPage').then(m => ({ default: m.BudgetPage })));
const NotFound = lazy(() => import('@/components/shared/NotFound').then(m => ({ default: m.NotFound })));
const SignInPage = lazy(() => import('@/pages/auth/SignInPage').then(m => ({ default: m.SignInPage })));
const SignUpPage = lazy(() => import('@/pages/auth/SignUpPage').then(m => ({ default: m.SignUpPage })));
const AccountPage = lazy(() => import('@/pages/account/AccountPage').then(m => ({ default: m.AccountPage })));
const DebugPage = lazy(() => import('@/pages/debug/DebugPage').then(m => ({ default: m.DebugPage })));

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

function AssetsRedirect() {
  const location = useLocation();
  const navigate = useNavigate();
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const create = params.get('create');
    const type = params.get('type');
    if (create === '1') {
      const newParams = new URLSearchParams();
      newParams.set('create', 'asset');
      if (type) newParams.set('type', type);
      navigate(`${ROUTES.app.wealth}?${newParams.toString()}`, { replace: true });
    } else {
      navigate(ROUTES.app.wealth, { replace: true });
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
    if (create === '1') {
      navigate(ROUTES.wealth.createLiability, { replace: true });
    } else {
      navigate(ROUTES.app.wealth, { replace: true });
    }
  }, [location, navigate]);
  return null;
}

function RootRouteHandler() {
  const { isSignedIn, isLoaded } = useAuth();
  if (!isLoaded) return <RouteLoadingFallback />;
  if (isSignedIn) return <Navigate to={ROUTES.app.dashboard} replace />;
  return <LandingPage />;
}

export function Routes() {
  if (import.meta.env.VITE_DEBUG_LOGGING === 'true') {
    logger.debug('ROUTES:RENDER', 'Routes component rendering...');
  }
  return (
    <ReactRouterRoutes>
      <Route path="/" element={<RootRouteHandler />} />
      <Route path="/sign-in/*" element={<Suspense fallback={<RouteLoadingFallback />}><SignInPage /></Suspense>} />
      <Route path="/sign-up/*" element={<Suspense fallback={<RouteLoadingFallback />}><SignUpPage /></Suspense>} />
      
      <Route path="/app" element={<Layout />}>
        <Route index element={<DashboardPage />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="wealth" element={<Suspense fallback={<RouteLoadingFallback />}><WealthPage /></Suspense>} />
        <Route path="assets" element={<AssetsRedirect />} />
        <Route path="liabilities" element={<LiabilitiesRedirect />} />
        <Route path="accounts" element={<Suspense fallback={<RouteLoadingFallback />}><AccountsPage /></Suspense>} />
        <Route path="accounts/:accountId" element={<Suspense fallback={<RouteLoadingFallback />}><AccountsPage /></Suspense>} />
        <Route path="settings" element={<Suspense fallback={<RouteLoadingFallback />}><SettingsPage /></Suspense>} />
        <Route path="account" element={<Suspense fallback={<RouteLoadingFallback />}><AccountPage /></Suspense>} />
        <Route path="scenarios" element={<Suspense fallback={<RouteLoadingFallback />}><ScenariosPage /></Suspense>} />
        <Route path="transactions" element={<Navigate to={ROUTES.app.accounts} replace />} />
        <Route path="budget" element={<Suspense fallback={<RouteLoadingFallback />}><BudgetPage /></Suspense>} />
        <Route path="subscriptions" element={<Navigate to={ROUTES.app.budget} replace />} />
        <Route path="income" element={<Navigate to={ROUTES.app.budget} replace />} />
        <Route path="categories" element={<Navigate to={ROUTES.app.budget} replace />} />
        <Route path="goals" element={<Suspense fallback={<RouteLoadingFallback />}><GoalsPage /></Suspense>} />
        <Route path="debug" element={<Suspense fallback={<RouteLoadingFallback />}><DebugPage /></Suspense>} />
        <Route path="*" element={<Suspense fallback={<RouteLoadingFallback />}><NotFound /></Suspense>} />
      </Route>
      
      <Route path="*" element={<Navigate to="/" replace />} />
    </ReactRouterRoutes>
  );
}
