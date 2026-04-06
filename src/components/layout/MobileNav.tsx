import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Wallet,
  TrendingUp,
  CreditCard,
  ArrowLeftRight,
  Settings,
  X,
  ChevronDown,
  Search,
} from 'lucide-react';
import { usePrefetchRoute } from '@/hooks/usePrefetchRoute';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { AccountMenuContent } from './AccountMenuContent';
import { useCommandPaletteContext } from '@/contexts/CommandPaletteContext';
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
  const { openPalette } = useCommandPaletteContext();
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);

  const getPrefetchHandler = (path: string) => {
    switch (path) {
      case '/app/wealth': return prefetchWealth;
      case '/app/budget': return prefetchBudget;
      case '/app/accounts': return prefetchAccounts;
      default: return undefined;
    }
  };

  const handleLinkClick = (path: string) => {
    navigate(path);
    onOpenChange(false);
  };

  const handleOpenPalette = () => {
    onOpenChange(false);
    openPalette();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="fixed left-0 top-0 z-50 h-full w-[280px] max-w-[85vw] translate-x-0 translate-y-0 rounded-none border-r border-[var(--paper-3)] bg-[var(--paper)] p-0 data-[state=open]:slide-in-from-left data-[state=closed]:slide-out-to-left sm:w-[320px] [&>button]:hidden"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <div className="flex h-full flex-col">
          {/* Header strip */}
          <div className="flex items-center justify-between border-b border-[var(--paper-3)] px-3 py-2 shrink-0 min-h-14">
            {/* Brand + account menu trigger */}
            <DropdownMenu open={accountMenuOpen} onOpenChange={setAccountMenuOpen}>
              <DropdownMenuTrigger asChild>
                <button
                  className="flex items-center gap-2 rounded-[var(--rl)] hover:bg-[var(--color-nav-hover)] transition-colors px-2 py-1.5 focus:outline-none focus-visible:shadow-[0_0_0_3px_var(--focus-ring)]"
                  aria-haspopup="menu"
                  aria-expanded={accountMenuOpen}
                  aria-label="Account menu"
                >
                  <span className="font-serif text-h1-sm sm:text-h1-md lg:text-h1-lg text-foreground tracking-tight">
                    Supafolio
                  </span>
                  <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" sideOffset={4} className="w-64">
                <AccountMenuContent
                  onClose={() => {
                    setAccountMenuOpen(false);
                    onOpenChange(false);
                  }}
                />
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              aria-label="Close navigation menu"
              className="min-h-11 min-w-11 shrink-0"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Search / Quick actions */}
          <div className="px-3 py-2 border-b border-[var(--paper-3)] shrink-0">
            <Button
              variant="ghost"
              className="w-full justify-start gap-2 hover:bg-accent px-3"
              onClick={handleOpenPalette}
              aria-label="Search / Quick actions (⌘K)"
            >
              <Search className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="flex-1 text-left text-body text-muted-foreground">Search</span>
              <kbd className="text-xs text-muted-foreground/60 font-mono">⌘K</kbd>
            </Button>
          </div>

          {/* Primary navigation */}
          <nav className="flex-1 overflow-y-auto px-3 pt-2" role="navigation" aria-label="Primary">
            <div className="space-y-1">
              {navigation.map((item) => {
                const isActive = location.pathname === item.path;
                const prefetchHandler = getPrefetchHandler(item.path);

                return (
                  <button
                    key={item.path}
                    onClick={() => handleLinkClick(item.path)}
                    onMouseEnter={() => {
                      if (prefetchHandler && !isActive) prefetchHandler();
                    }}
                    className={cn(
                      'nav-item nav-item-default nav-item-hover w-full justify-start min-h-11 focus:outline-none focus-visible:shadow-[0_0_0_3px_var(--focus-ring)]',
                      isActive && 'nav-item-active'
                    )}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <item.icon className="h-4 w-4 flex-shrink-0" />
                    <span className="text-body font-medium">{item.name}</span>
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
