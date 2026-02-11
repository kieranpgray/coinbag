/**
 * Centralized route constants for the application
 * This ensures consistent routing across all components and prevents broken links
 */

export const ROUTES = {
  // Root routes
  root: '/',
  signIn: '/sign-in',
  signUp: '/sign-up',

  // App routes (within /app layout)
  app: {
    root: '/app',
    dashboard: '/app/dashboard',
    wealth: '/app/wealth',
    accounts: '/app/accounts',
    accountsDetail: (accountId: string) => `/app/accounts/${accountId}`,
    settings: '/app/settings',
    account: '/app/account', // User account settings
    scenarios: '/app/scenarios',
    budget: '/app/budget',
    transfers: '/app/transfers',
    debug: '/app/debug',

    // Legacy redirects (for backward compatibility)
    assets: '/app/wealth',
    liabilities: '/app/wealth',
    transactions: '/app/accounts',
    subscriptions: '/app/budget',
    income: '/app/budget',
    categories: '/app/budget',
  },

  // Wealth page sub-routes (query params)
  wealth: {
    createAsset: (type?: string) => {
      const base = '/app/wealth?create=asset';
      return type ? `${base}&type=${encodeURIComponent(type)}` : base;
    },
    createLiability: '/app/wealth?create=liability',
  },
} as const;

/**
 * Navigation items for the sidebar
 * Centralized here to keep navigation consistent
 */
export const NAVIGATION_ITEMS = [
  { name: 'Dashboard', path: ROUTES.app.dashboard },
  { name: 'Accounts', path: ROUTES.app.accounts },
  { name: 'Wealth', path: ROUTES.app.wealth },
  { name: 'Budget', path: ROUTES.app.budget },
  { name: 'Transfers', path: ROUTES.app.transfers },
  { name: 'Simulate', path: ROUTES.app.scenarios },
  { name: 'Settings', path: ROUTES.app.settings },
] as const;

/**
 * Helper function to check if a path is an app route
 */
export const isAppRoute = (path: string): boolean => {
  return path.startsWith('/app');
};

/**
 * Helper function to get the app route equivalent
 */
export const toAppRoute = (path: string): string => {
  if (path.startsWith('/app')) {
    return path;
  }
  return `/app${path}`;
};
