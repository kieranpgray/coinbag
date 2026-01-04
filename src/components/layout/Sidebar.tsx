import { Link, useLocation } from 'react-router-dom';
import {
  Home,
  CreditCard,
  TrendingUp,
  Zap,
  Target,
  Settings,
  Wallet,
} from 'lucide-react';
import { usePrefetchRoute } from '@/hooks/usePrefetchRoute';
import { NAVIGATION_ITEMS, ROUTES } from '@/lib/constants/routes';

const navigation = NAVIGATION_ITEMS.map(item => ({
  ...item,
  icon: (() => {
    switch (item.path) {
      case ROUTES.app.dashboard: return Home;
      case ROUTES.app.accounts: return CreditCard;
      case ROUTES.app.wealth: return TrendingUp;
      case ROUTES.app.budget: return Wallet;
      case ROUTES.app.goals: return Target;
      case ROUTES.app.scenarios: return Zap;
      case ROUTES.app.settings: return Settings;
      default: return Home;
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
    <aside className="w-64 border-r border-border bg-card p-4 hidden md:block" aria-label="Main navigation">
      <nav className="space-y-2" role="navigation" aria-label="Primary">
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
              className={`flex items-center gap-3 px-4 py-2 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30 focus:ring-offset-2 ${
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-muted'
              }`}
              aria-current={isActive ? 'page' : undefined}
            >
              <item.icon className="h-4 w-4" />
              {item.name}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

