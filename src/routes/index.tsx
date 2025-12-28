import { Suspense, lazy } from 'react';
import { Routes as ReactRouterRoutes, Route, Navigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { DashboardPage } from '@/features/dashboard/DashboardPage';
import { Skeleton } from '@/components/ui/skeleton';

// Lazy load routes for code splitting - reduces initial bundle size
// DashboardPage is kept eager-loaded as it's the most common route
const AssetsPage = lazy(() => import('@/features/assets/AssetsPage').then(m => ({ default: m.AssetsPage })));
const LiabilitiesPage = lazy(() => import('@/features/liabilities/LiabilitiesPage').then(m => ({ default: m.LiabilitiesPage })));
const AccountsPage = lazy(() => import('@/features/accounts/AccountsPage').then(m => ({ default: m.AccountsPage })));
const SettingsPage = lazy(() => import('@/features/settings/SettingsPage').then(m => ({ default: m.SettingsPage })));
const GoalsPage = lazy(() => import('@/features/goals/GoalsPage').then(m => ({ default: m.GoalsPage })));
const ScenariosPage = lazy(() => import('@/features/scenarios/ScenariosPage').then(m => ({ default: m.ScenariosPage })));
const SubscriptionsPage = lazy(() => import('@/features/subscriptions/SubscriptionsPage').then(m => ({ default: m.SubscriptionsPage })));
const TransactionsPage = lazy(() => import('@/features/transactions/TransactionsPage').then(m => ({ default: m.TransactionsPage })));
const IncomePage = lazy(() => import('@/features/income/IncomePage').then(m => ({ default: m.IncomePage })));
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

export function Routes() {
  console.log('🔍 DEBUG: Routes component rendering...');
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
          path="assets"
          element={
            <Suspense fallback={<RouteLoadingFallback />}>
              <AssetsPage />
            </Suspense>
          }
        />
        <Route
          path="liabilities"
          element={
            <Suspense fallback={<RouteLoadingFallback />}>
              <LiabilitiesPage />
            </Suspense>
          }
        />
        <Route
          path="accounts"
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
        <Route
          path="transactions"
          element={
            <Suspense fallback={<RouteLoadingFallback />}>
              <TransactionsPage />
            </Suspense>
          }
        />
        <Route
          path="subscriptions"
          element={
            <Suspense fallback={<RouteLoadingFallback />}>
              <SubscriptionsPage />
            </Suspense>
          }
        />
        <Route
          path="income"
          element={
            <Suspense fallback={<RouteLoadingFallback />}>
              <IncomePage />
            </Suspense>
          }
        />
        {/* Redirect /categories to /subscriptions (soft landing for bookmarks) */}
        <Route path="categories" element={<Navigate to="/subscriptions" replace />} />
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

