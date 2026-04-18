/**
 * Environment Banner
 *
 * Displays a banner showing the current environment (DEV/PREVIEW) at the top of the screen.
 * Only visible in non-production builds, only on authenticated app routes (`/app/*`), and
 * hidden while an app route loading shell is visible so it does not stack on skeleton UIs.
 */

import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useRouteLoadingBannerOptional } from '@/contexts/RouteLoadingBannerContext';

export function EnvironmentBanner() {
  const location = useLocation();
  const routeLoading = useRouteLoadingBannerOptional();

  const environmentInfo = useMemo(() => {
    const isProduction = import.meta.env.MODE === 'production' || import.meta.env.PROD === true;
    if (isProduction) {
      return null;
    }

    const mode = import.meta.env.MODE || 'development';
    const envName = mode === 'development' ? 'DEV' : mode.toUpperCase();

    // Color coding based on environment
    const colors = {
      DEV: {
        bg: 'bg-yellow-500',
        text: 'text-yellow-900',
        border: 'border-yellow-600',
      },
      PREVIEW: {
        bg: 'bg-blue-500',
        text: 'text-blue-900',
        border: 'border-blue-600',
      },
    };

    const colorScheme = colors[envName as keyof typeof colors] || colors.DEV;

    return {
      name: envName,
      mode,
      ...colorScheme,
    };
  }, []);

  // Don't render in production
  if (!environmentInfo) {
    return null;
  }

  if (!location.pathname.startsWith('/app')) {
    return null;
  }

  if (routeLoading?.isRouteLoadingShellVisible) {
    return null;
  }

  return (
    <div
      className={`${environmentInfo.bg} ${environmentInfo.text} ${environmentInfo.border} border-b px-4 py-1 text-center text-caption font-medium z-50 relative`}
      role="banner"
      aria-label={`Environment: ${environmentInfo.name}`}
    >
      <span className="inline-flex items-center gap-2">
        <span className="inline-block w-2 h-2 rounded-full bg-current animate-pulse" />
        {environmentInfo.name} Environment
      </span>
    </div>
  );
}





