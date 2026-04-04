import { useLayoutEffect } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { useRouteLoadingBannerOptional } from '@/contexts/RouteLoadingBannerContext';

/**
 * Loading shell for authenticated `/app/*` lazy routes only.
 * Uses semantic colors so light/dark theme applies. Suppresses the dev environment banner while mounted.
 */
export function LandingRouteLoading() {
  const routeLoading = useRouteLoadingBannerOptional();
  const begin = routeLoading?.beginRouteLoadingShell;
  const end = routeLoading?.endRouteLoadingShell;

  useLayoutEffect(() => {
    if (!begin || !end) return;
    begin();
    return () => end();
  }, [begin, end]);

  return (
    <div className="space-y-6 bg-background" aria-busy="true" aria-label="Loading page">
      <Skeleton className="h-10 w-48" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
    </div>
  );
}
