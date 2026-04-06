import { Suspense, lazy, useEffect } from 'react';
import { Routes as ReactRouterRoutes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import { logger } from '@/lib/logger';
import { Layout } from '@/components/layout/Layout';
import { DashboardPage } from '@/features/dashboard/DashboardPage';
import { LandingPage } from '@/pages/landing/LandingPage';
import { LandingRouteLoading } from '@/pages/landing/LandingRouteLoading';
import { ROUTES } from '@/lib/constants/routes';
import { SignInPage } from '@/pages/auth/SignInPage';
import { SignUpPage } from '@/pages/auth/SignUpPage';
import { AcceptInvitePage } from '@/pages/accept-invite/AcceptInvitePage';
import { SecurityPage } from '@/pages/legal/SecurityPage';
import { PrivacyPage } from '@/pages/legal/PrivacyPage';
import { TermsPage } from '@/pages/legal/TermsPage';
import { PricingPage } from '@/pages/pricing/PricingPage';

// Lazy load routes for code splitting (authenticated app and heavy screens only)
const WealthPage = lazy(() => import('@/features/wealth/WealthPage').then(m => ({ default: m.WealthPage })));
const AccountsPage = lazy(() => import('@/features/accounts/AccountsPage').then(m => ({ default: m.AccountsPage })));
const SettingsPage = lazy(() => import('@/features/settings/SettingsPage').then(m => ({ default: m.SettingsPage })));
const TransfersPage = lazy(() => import('@/features/transfers/TransfersPage').then(m => ({ default: m.default })));
const ScenariosPage = lazy(() => import('@/features/scenarios/ScenariosPage').then(m => ({ default: m.ScenariosPage })));
const BudgetPage = lazy(() => import('@/features/budget/BudgetPage').then(m => ({ default: m.BudgetPage })));
const NotFound = lazy(() => import('@/components/shared/NotFound').then(m => ({ default: m.NotFound })));
const AccountPage = lazy(() => import('@/pages/account/AccountPage').then(m => ({ default: m.AccountPage })));
const DebugPage = lazy(() => import('@/pages/debug/DebugPage').then(m => ({ default: m.DebugPage })));
const DesignSystemPage = lazy(() =>
  import('@/pages/design-system/DesignSystemPage').then(m => ({ default: m.DesignSystemPage })),
);
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
  if (!isLoaded) {
    return (
      <div
        className="min-h-screen bg-background"
        aria-busy="true"
        aria-label="Loading"
      />
    );
  }
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
      <Route path="/sign-in/*" element={<SignInPage />} />
      <Route path="/sign-up/*" element={<SignUpPage />} />
      <Route path="/dashboard" element={<Navigate to={ROUTES.app.dashboard} replace />} />
      
      <Route path="/accept-invite" element={<AcceptInvitePage />} />
      <Route path="/pricing" element={<PricingPage />} />
      <Route path="/security" element={<SecurityPage />} />
      <Route path="/privacy" element={<PrivacyPage />} />
      <Route path="/terms" element={<TermsPage />} />
      <Route
        path={ROUTES.designSystem}
        element={
          <Suspense fallback={<LandingRouteLoading />}>
            <DesignSystemPage />
          </Suspense>
        }
      />

      <Route path="/app" element={<Layout />}>
        <Route index element={<DashboardPage />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="wealth" element={<Suspense fallback={<LandingRouteLoading />}><WealthPage /></Suspense>} />
        <Route path="assets" element={<AssetsRedirect />} />
        <Route path="liabilities" element={<LiabilitiesRedirect />} />
        <Route path="accounts" element={<Suspense fallback={<LandingRouteLoading />}><AccountsPage /></Suspense>} />
        <Route path="accounts/:accountId" element={<Suspense fallback={<LandingRouteLoading />}><AccountsPage /></Suspense>} />
        <Route path="settings" element={<Suspense fallback={<LandingRouteLoading />}><SettingsPage /></Suspense>} />
        <Route path="account" element={<Suspense fallback={<LandingRouteLoading />}><AccountPage /></Suspense>} />
        <Route path="scenarios" element={<Suspense fallback={<LandingRouteLoading />}><ScenariosPage /></Suspense>} />
        <Route path="transactions" element={<Navigate to={ROUTES.app.accounts} replace />} />
        <Route path="budget" element={<Suspense fallback={<LandingRouteLoading />}><BudgetPage /></Suspense>} />
        <Route path="subscriptions" element={<Navigate to={ROUTES.app.budget} replace />} />
        <Route path="income" element={<Navigate to={ROUTES.app.budget} replace />} />
        <Route path="categories" element={<Navigate to={ROUTES.app.budget} replace />} />
        <Route path="transfers" element={<Suspense fallback={<LandingRouteLoading />}><TransfersPage /></Suspense>} />
        <Route path="debug" element={<Suspense fallback={<LandingRouteLoading />}><DebugPage /></Suspense>} />
        <Route path="*" element={<Suspense fallback={<LandingRouteLoading />}><NotFound /></Suspense>} />
      </Route>
      
      <Route path="*" element={<Navigate to="/" replace />} />
    </ReactRouterRoutes>
  );
}
