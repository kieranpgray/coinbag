/**
 * RouteChangeLogger
 * 
 * Logs all route changes for debugging navigation issues.
 * Only active when VITE_DEBUG_LOGGING=true
 */

import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { logger, getCorrelationId } from '@/lib/logger';

let previousPath = '';

export function RouteChangeLogger() {
  const location = useLocation();

  useEffect(() => {
    const currentPath = location.pathname + location.search;
    
    if (previousPath !== currentPath) {
      logger.info(
        'NAV:ROUTE_CHANGE',
        'Route changed',
        {
          from: previousPath || '(initial)',
          to: currentPath,
          pathname: location.pathname,
          search: location.search,
          hash: location.hash,
          state: location.state,
        },
        getCorrelationId() || undefined
      );
      
      previousPath = currentPath;
    }
  }, [location]);

  return null;
}

