/**
 * QueryClient Logger Wrapper
 * 
 * Wraps TanStack Query client to log all cache operations.
 * Only active when VITE_DEBUG_LOGGING=true
 */

import type { QueryClient } from '@tanstack/react-query';
import { logger, getCorrelationId } from './logger';

/**
 * Wrap queryClient methods to add logging
 */
export function wrapQueryClientForLogging(queryClient: QueryClient): QueryClient {
  if (import.meta.env.VITE_DEBUG_LOGGING !== 'true') {
    return queryClient;
  }

  // Wrap invalidateQueries
  const originalInvalidateQueries = queryClient.invalidateQueries.bind(queryClient);
  queryClient.invalidateQueries = function(options) {
    const correlationId = getCorrelationId();
    const queryKey = options?.queryKey || [];
    
    // Get current data before invalidation
    const currentData = queryClient.getQueryData(queryKey);
    const currentCount = Array.isArray(currentData) ? currentData.length : undefined;
    
    logger.info(
      'QUERY:INVALIDATE',
      'Invalidating queries',
      {
        queryKey: JSON.stringify(queryKey),
        currentDataCount: currentCount,
        predicate: options?.predicate ? 'custom' : 'none',
      },
      correlationId || undefined
    );

    return originalInvalidateQueries(options);
  };

  // Wrap setQueryData
  const originalSetQueryData = queryClient.setQueryData.bind(queryClient);
  queryClient.setQueryData = function(queryKey, updater) {
    const correlationId = getCorrelationId();
    const currentData = queryClient.getQueryData(queryKey);
    const currentCount = Array.isArray(currentData) ? currentData.length : undefined;
    
    // Calculate new data
    let newData: unknown;
    if (typeof updater === 'function') {
      newData = (updater as (old: unknown) => unknown)(currentData);
    } else {
      newData = updater;
    }
    const newCount = Array.isArray(newData) ? newData.length : undefined;
    
    logger.warn(
      'QUERY:SET_DATA',
      'Setting query data',
      {
        queryKey: JSON.stringify(queryKey),
        currentDataCount: currentCount,
        newDataCount: newCount,
        operation: currentCount !== undefined && newCount !== undefined 
          ? (newCount < currentCount ? 'REPLACE_DECREASE' : newCount > currentCount ? 'APPEND' : 'REPLACE_SAME')
          : 'UNKNOWN',
      },
      correlationId || undefined
    );

    return originalSetQueryData(queryKey, updater);
  };

  // Wrap removeQueries
  const originalRemoveQueries = queryClient.removeQueries.bind(queryClient);
  queryClient.removeQueries = function(options) {
    const correlationId = getCorrelationId();
    const queryKey = options?.queryKey || [];
    
    const currentData = queryClient.getQueryData(queryKey);
    const currentCount = Array.isArray(currentData) ? currentData.length : undefined;
    
    logger.warn(
      'QUERY:REMOVE',
      'Removing queries from cache',
      {
        queryKey: JSON.stringify(queryKey),
        currentDataCount: currentCount,
        predicate: options?.predicate ? 'custom' : 'none',
      },
      correlationId || undefined
    );

    return originalRemoveQueries(options);
  };

  // Wrap clear
  const originalClear = queryClient.clear.bind(queryClient);
  queryClient.clear = function() {
    const correlationId = getCorrelationId();
    
    logger.error(
      'QUERY:CLEAR',
      'CLEARING ALL QUERIES FROM CACHE - POTENTIAL DATA LOSS',
      {
        warning: 'This clears all cached data',
      },
      correlationId || undefined
    );

    return originalClear();
  };

  // Wrap resetQueries
  const originalResetQueries = queryClient.resetQueries.bind(queryClient);
  queryClient.resetQueries = function(options) {
    const correlationId = getCorrelationId();
    const queryKey = options?.queryKey || [];
    
    const currentData = queryClient.getQueryData(queryKey);
    const currentCount = Array.isArray(currentData) ? currentData.length : undefined;
    
    logger.warn(
      'QUERY:RESET',
      'Resetting queries',
      {
        queryKey: JSON.stringify(queryKey),
        currentDataCount: currentCount,
        predicate: options?.predicate ? 'custom' : 'none',
      },
      correlationId || undefined
    );

    return originalResetQueries(options);
  };

  return queryClient;
}

