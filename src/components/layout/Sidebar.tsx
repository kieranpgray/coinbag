import { Link, useLocation } from 'react-router-dom';
import {
  Home,
  CreditCard,
  TrendingUp,
  AlertTriangle,
  Zap,
  ArrowRightLeft,
  Repeat,
  Target,
  Settings,
  DollarSign,
} from 'lucide-react';
import { usePrefetchRoute } from '@/hooks/usePrefetchRoute';

const navigation = [
  { name: 'Dashboard', path: '/dashboard', icon: Home },
  { name: 'Accounts', path: '/accounts', icon: CreditCard },
  { name: 'Assets', path: '/assets', icon: TrendingUp },
  { name: 'Liabilities', path: '/liabilities', icon: AlertTriangle },
  { name: 'Income', path: '/income', icon: DollarSign },
  { name: 'Goals', path: '/goals', icon: Target },
  { name: 'Simulate', path: '/scenarios', icon: Zap },
  { name: 'Transactions', path: '/transactions', icon: ArrowRightLeft },
  { name: 'Subscriptions', path: '/subscriptions', icon: Repeat },
  { name: 'Settings', path: '/settings', icon: Settings },
];

export function Sidebar() {
  const location = useLocation();
  const { prefetchAssets, prefetchLiabilities, prefetchSubscriptions, prefetchIncome, prefetchAccounts } = usePrefetchRoute();

  // Map routes to their prefetch functions
  const getPrefetchHandler = (path: string) => {
    switch (path) {
      case '/assets':
        return prefetchAssets;
      case '/liabilities':
        return prefetchLiabilities;
      case '/subscriptions':
        return prefetchSubscriptions;
      case '/income':
        return prefetchIncome;
      case '/accounts':
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

