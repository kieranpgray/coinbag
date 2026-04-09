import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, BarChart3, ArrowRight, Clock, User } from 'lucide-react';
import { ROUTES } from '@/lib/constants/routes';
import { cn } from '@/lib/utils';

interface MobileTabBarProps {
  onMorePress: () => void;
  className?: string;
}

const tabs = [
  { label: 'Overview', icon: LayoutDashboard, route: ROUTES.app.dashboard },
  { label: 'Holdings', icon: BarChart3, route: ROUTES.app.wealth },
  { label: 'Allocate', icon: ArrowRight, route: ROUTES.app.transfers },
  { label: 'Recurring', icon: Clock, route: ROUTES.app.budget },
] as const;

export function MobileTabBar({ onMorePress, className }: MobileTabBarProps) {
  const location = useLocation();

  return (
    <nav className={cn('tab-bar', className)} aria-label="Primary navigation">
      {tabs.map(({ label, icon: Icon, route }) => {
        const isActive = location.pathname === route;
        return (
          <Link
            key={route}
            to={route}
            className={cn('tab-item', isActive && 'active')}
            aria-current={isActive ? 'page' : undefined}
          >
            <Icon className="h-5 w-5" aria-hidden />
            <span className="tab-label">{label}</span>
          </Link>
        );
      })}
      <button
        className="tab-item"
        onClick={onMorePress}
        aria-label="More navigation options"
        type="button"
      >
        <User className="h-5 w-5" aria-hidden />
        <span className="tab-label">More</span>
      </button>
    </nav>
  );
}
