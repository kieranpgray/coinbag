import { useState, useEffect, Fragment } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Wallet,
  TrendingUp,
  CreditCard,
  ArrowLeftRight,
  Settings,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { usePrefetchRoute } from '@/hooks/usePrefetchRoute';
import { useSidebarBreakpoint } from '@/hooks/useSidebarBreakpoint';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { NAVIGATION_ITEMS, ROUTES } from '@/lib/constants/routes';

const STORAGE_KEY = 'sidebar-expanded';

const navigation = NAVIGATION_ITEMS.map(item => ({
  ...item,
  icon: (() => {
    switch (item.path) {
      case ROUTES.app.dashboard: return LayoutDashboard;
      case ROUTES.app.accounts: return Wallet;
      case ROUTES.app.wealth: return TrendingUp;
      case ROUTES.app.budget: return CreditCard;
      case ROUTES.app.transfers: return ArrowLeftRight;
      case ROUTES.app.settings: return Settings;
      default: return LayoutDashboard;
    }
  })(),
}));

export function Sidebar() {
  const location = useLocation();
  const { isTablet, isDesktop } = useSidebarBreakpoint();
  const { prefetchWealth, prefetchBudget, prefetchAccounts } = usePrefetchRoute();

  const isRail = isTablet; // tablet = collapsible rail
  const showToggle = isTablet;
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!isTablet) return;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored !== null) setExpanded(stored === 'true');
    } catch {
      // ignore
    }
  }, [isTablet]);

  const handleToggle = () => {
    setExpanded(prev => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, String(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

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

  const showLabels = isDesktop || (isTablet && expanded);
  const sidebarWidth = isDesktop || (isTablet && expanded) ? 'w-48' : 'w-16';

  return (
    <aside
      className={cn(
        'h-screen bg-card border-r border-border flex flex-col hidden md:flex shrink-0 transition-[width] duration-200 ease-in-out',
        sidebarWidth
      )}
      aria-label="Main navigation"
    >
      <TooltipProvider delayDuration={300}>
        {/* Logo */}
        <div className={cn('flex items-center shrink-0 border-b border-border', showLabels ? 'p-6' : 'p-3 justify-center')}>
          <Link
            to={ROUTES.app.dashboard}
            className={cn(
              'text-foreground hover:opacity-80 transition-opacity flex items-center justify-center',
              showLabels ? 'text-h1-sm sm:text-h1-md lg:text-h1-lg' : 'text-xl font-bold w-8 h-8'
            )}
            aria-label="Supafolio home"
          >
            {showLabels ? 'Supafolio' : 'S'}
          </Link>
        </div>

        <nav className="px-3 flex-1 pt-3" role="navigation" aria-label="Primary">
          {navigation.map((item) => {
            const isActive = location.pathname === item.path;
            const prefetchHandler = getPrefetchHandler(item.path);

            const linkContent = (
              <Link
                to={item.path}
                onMouseEnter={() => {
                  if (prefetchHandler && !isActive) prefetchHandler();
                }}
                className={cn(
                  'nav-item nav-item-default nav-item-hover focus:outline-none focus:ring-2 focus:ring-primary/30 focus:ring-offset-2',
                  isActive && 'nav-item-active',
                  !showLabels && 'justify-center px-2'
                )}
                aria-current={isActive ? 'page' : undefined}
                aria-label={item.name}
              >
                <item.icon className="h-4 w-4 flex-shrink-0" />
                {showLabels && <span className="text-body font-medium">{item.name}</span>}
              </Link>
            );

            if (isRail && !expanded) {
              return (
                <Tooltip key={item.path}>
                  <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                  <TooltipContent side="right" sideOffset={8}>
                    {item.name}
                  </TooltipContent>
                </Tooltip>
              );
            }

            return <Fragment key={item.path}>{linkContent}</Fragment>;
          })}
        </nav>

        {showToggle && (
          <div className={cn('p-3 border-t border-border', !expanded && 'flex justify-center')}>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleToggle}
              aria-expanded={expanded}
              aria-label={expanded ? 'Collapse sidebar' : 'Expand sidebar'}
              className={cn('text-muted-foreground hover:text-foreground', !expanded && 'w-8 h-8')}
            >
              {expanded ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </Button>
          </div>
        )}
      </TooltipProvider>
    </aside>
  );
}
