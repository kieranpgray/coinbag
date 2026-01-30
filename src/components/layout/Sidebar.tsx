import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Wallet,
  TrendingUp,
  CreditCard,
  Target,
  BarChart3,
  Settings,
} from 'lucide-react';
import { usePrefetchRoute } from '@/hooks/usePrefetchRoute';
import { NAVIGATION_ITEMS, ROUTES } from '@/lib/constants/routes';

const navigation = NAVIGATION_ITEMS.map(item => ({
  ...item,
  icon: (() => {
    switch (item.path) {
      case ROUTES.app.dashboard: return LayoutDashboard;
      case ROUTES.app.accounts: return Wallet;
      case ROUTES.app.wealth: return TrendingUp;
      case ROUTES.app.budget: return CreditCard;
      case ROUTES.app.goals: return Target;
      case ROUTES.app.scenarios: return BarChart3;
      case ROUTES.app.settings: return Settings;
      default: return LayoutDashboard;
    }
  })(),
}));

export function Sidebar() {
  const location = useLocation();
  const { prefetchWealth, prefetchBudget, prefetchAccounts } = usePrefetchRoute();

  // Map routes to their prefetch functions
  const getPrefetchHandler = (path: string) => {
    switch (path) {
      case ROUTES.app.wealth:
        return prefetchWealth;
      case ROUTES.app.budget:
        return prefetchBudget;
      case ROUTES.app.accounts:
        return prefetchAccounts;
      default:
        return undefined;
    }
  };

  return (
    <aside className="w-48 h-screen bg-card border-r border-border flex flex-col hidden md:flex" aria-label="Main navigation">
      {/* Logo Section */}
      <div className="p-6">
        <Link to={ROUTES.app.dashboard} className="text-xl font-semibold text-foreground hover:opacity-80 transition-opacity">
          Coinbag
        </Link>
      </div>

      <nav className="px-3 flex-1" role="navigation" aria-label="Primary">
        {navigation.map((item) => {
          const isActive = location.pathname === item.path;
          const prefetchHandler = getPrefetchHandler(item.path);

          return (
            <Link
              key={item.path}
              to={item.path}
              onMouseEnter={() => {
                // Prefetch data on hover to improve perceived load time
                if (prefetchHandler && !isActive) {
                  prefetchHandler();
                }
              }}
              className={`nav-item nav-item-default nav-item-hover ${
                isActive ? 'nav-item-active' : ''
              } focus:outline-none focus:ring-2 focus:ring-primary/30 focus:ring-offset-2`}
              aria-current={isActive ? 'page' : undefined}
            >
              <item.icon className="h-4 w-4 flex-shrink-0" />
              <span className="text-sm font-medium">{item.name}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

