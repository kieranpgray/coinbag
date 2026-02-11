import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Wallet,
  TrendingUp,
  CreditCard,
  ArrowLeftRight,
  BarChart3,
  Settings,
  X,
} from 'lucide-react';
import { usePrefetchRoute } from '@/hooks/usePrefetchRoute';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { NAVIGATION_ITEMS, ROUTES } from '@/lib/constants/routes';

const navigation = NAVIGATION_ITEMS.map(item => ({
  ...item,
  icon: (() => {
    switch (item.path) {
      case ROUTES.app.dashboard: return LayoutDashboard;
      case ROUTES.app.accounts: return Wallet;
      case ROUTES.app.wealth: return TrendingUp;
      case ROUTES.app.budget: return CreditCard;
      case ROUTES.app.transfers: return ArrowLeftRight;
      case ROUTES.app.scenarios: return BarChart3;
      case ROUTES.app.settings: return Settings;
      default: return LayoutDashboard;
    }
  })(),
}));

interface MobileNavProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MobileNav({ open, onOpenChange }: MobileNavProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { prefetchWealth, prefetchBudget, prefetchAccounts } = usePrefetchRoute();

  // Map routes to their prefetch functions
  const getPrefetchHandler = (path: string) => {
    switch (path) {
      case '/app/wealth':
        return prefetchWealth;
      case '/app/budget':
        return prefetchBudget;
      case '/app/accounts':
        return prefetchAccounts;
      default:
        return undefined;
    }
  };

  const handleLinkClick = (path: string) => {
    navigate(path);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="fixed left-0 top-0 z-50 h-full w-[280px] max-w-[85vw] translate-x-0 translate-y-0 rounded-none border-r border-border bg-card p-0 data-[state=open]:slide-in-from-left data-[state=closed]:slide-out-to-left sm:w-[320px] [&>button]:hidden"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border p-4">
            <Link 
              to={ROUTES.app.dashboard} 
              className="text-xl font-semibold text-foreground"
              onClick={() => onOpenChange(false)}
            >
              Coinbag
            </Link>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-4" role="navigation" aria-label="Primary">
            <div className="space-y-1">
              {navigation.map((item) => {
                const isActive = location.pathname === item.path;
                const prefetchHandler = getPrefetchHandler(item.path);

                return (
                  <button
                    key={item.path}
                    onClick={() => handleLinkClick(item.path)}
                    onMouseEnter={() => {
                      // Prefetch data on hover to improve perceived load time
                      if (prefetchHandler && !isActive) {
                        prefetchHandler();
                      }
                    }}
                    className={cn(
                      'nav-item nav-item-default nav-item-hover w-full justify-start focus:outline-none focus:ring-2 focus:ring-primary/30 focus:ring-offset-2',
                      isActive && 'nav-item-active'
                    )}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <item.icon className="h-4 w-4 flex-shrink-0" />
                    <span className="text-sm font-medium">{item.name}</span>
                  </button>
                );
              })}
            </div>
          </nav>
        </div>
      </DialogContent>
    </Dialog>
  );
}

