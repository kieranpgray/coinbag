import { useLocation, useNavigate } from 'react-router-dom';
import {
  Home,
  CreditCard,
  TrendingUp,
  Zap,
  Target,
  Settings,
  Wallet,
  X,
} from 'lucide-react';
import { usePrefetchRoute } from '@/hooks/usePrefetchRoute';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const navigation = [
  { name: 'Dashboard', path: '/app/dashboard', icon: Home },
  { name: 'Accounts', path: '/app/accounts', icon: CreditCard },
  { name: 'Wealth', path: '/app/wealth', icon: TrendingUp },
  { name: 'Budget', path: '/app/budget', icon: Wallet },
  { name: 'Goals', path: '/app/goals', icon: Target },
  { name: 'Simulate', path: '/app/scenarios', icon: Zap },
  { name: 'Settings', path: '/app/settings', icon: Settings },
];

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
            <h2 className="text-lg font-semibold">Menu</h2>
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
                      'flex w-full items-center gap-3 rounded-md px-4 py-3 text-left transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30 focus:ring-offset-2',
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-muted'
                    )}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <item.icon className="h-5 w-5 flex-shrink-0" />
                    <span className="text-base font-medium">{item.name}</span>
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

