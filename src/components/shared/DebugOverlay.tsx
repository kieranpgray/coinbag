/**
 * DebugOverlay
 * 
 * Shows debug information overlay when VITE_DEBUG_LOGGING=true
 * Displays current route, data source, correlation ID, and entity counts
 */

import { useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { getCorrelationId, isDebugLoggingEnabled } from '@/lib/logger';
import { useEffect, useState, useRef } from 'react';
import type { Asset, Liability, Account, Subscription } from '@/types/domain';

export function DebugOverlay() {
  const location = useLocation();
  const queryClient = useQueryClient();
  const isMountedRef = useRef(false);
  const [counts, setCounts] = useState({
    assets: 0,
    liabilities: 0,
    accounts: 0,
    subscriptions: 0,
  });

  useEffect(() => {
    if (!isDebugLoggingEnabled()) return;

    // Mark as mounted after first render
    isMountedRef.current = true;

    // Update counts from cache (deferred to avoid render-phase updates)
    const updateCounts = () => {
      // Only update if component is mounted to avoid render-phase updates
      if (!isMountedRef.current) return;
      
      // Use requestAnimationFrame to defer state update outside render phase
      requestAnimationFrame(() => {
        if (!isMountedRef.current) return;
        
        const assets = queryClient.getQueryData<Asset[]>(['assets']) || [];
        const liabilities = queryClient.getQueryData<Liability[]>(['liabilities']) || [];
        const accounts = queryClient.getQueryData<Account[]>(['accounts']) || [];
        const subscriptions = queryClient.getQueryData<Subscription[]>(['subscriptions']) || [];

        setCounts({
          assets: assets.length,
          liabilities: liabilities.length,
          accounts: accounts.length,
          subscriptions: subscriptions.length,
        });
      });
    };

    // Initial update after mount
    updateCounts();

    // Subscribe to query cache changes
    const unsubscribe = queryClient.getQueryCache().subscribe(() => {
      updateCounts();
    });

    return () => {
      isMountedRef.current = false;
      unsubscribe();
    };
  }, [queryClient]);

  if (!isDebugLoggingEnabled()) {
    return null;
  }

  const dataSource = import.meta.env.VITE_DATA_SOURCE || 'mock';
  const correlationId = getCorrelationId();

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '10px',
        right: '10px',
        background: 'rgba(0, 0, 0, 0.8)',
        color: '#fff',
        padding: '12px',
        borderRadius: '8px',
        fontSize: '11px',
        fontFamily: 'monospace',
        zIndex: 9999,
        maxWidth: '300px',
        lineHeight: '1.4',
      }}
    >
      <div style={{ fontWeight: 'bold', marginBottom: '8px', borderBottom: '1px solid #555', paddingBottom: '4px' }}>
        🐛 DEBUG OVERLAY
      </div>
      <div style={{ marginBottom: '4px' }}>
        <strong>Route:</strong> {location.pathname}
        {location.search && <span style={{ color: '#ffd700' }}>{location.search}</span>}
      </div>
      <div style={{ marginBottom: '4px' }}>
        <strong>Data Source:</strong> <span style={{ color: dataSource === 'supabase' ? '#4ade80' : '#fbbf24' }}>{dataSource}</span>
      </div>
      {correlationId && (
        <div style={{ marginBottom: '4px' }}>
          <strong>Correlation ID:</strong> <span style={{ color: '#60a5fa' }}>{correlationId}</span>
        </div>
      )}
      <div style={{ marginTop: '8px', borderTop: '1px solid #555', paddingTop: '4px' }}>
        <strong>Cache Counts:</strong>
        <div style={{ marginLeft: '8px', marginTop: '2px' }}>
          Assets: <span style={{ color: counts.assets > 0 ? '#4ade80' : '#f87171' }}>{counts.assets}</span>
        </div>
        <div style={{ marginLeft: '8px' }}>
          Liabilities: <span style={{ color: counts.liabilities > 0 ? '#4ade80' : '#f87171' }}>{counts.liabilities}</span>
        </div>
        <div style={{ marginLeft: '8px' }}>
          Accounts: <span style={{ color: counts.accounts > 0 ? '#4ade80' : '#f87171' }}>{counts.accounts}</span>
        </div>
        <div style={{ marginLeft: '8px' }}>
          Subscriptions: <span style={{ color: counts.subscriptions > 0 ? '#4ade80' : '#f87171' }}>{counts.subscriptions}</span>
        </div>
      </div>
    </div>
  );
}

