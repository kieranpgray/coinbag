import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from './contexts/ThemeContext';
import { Routes } from './routes';
import { RouteChangeLogger } from './components/shared/RouteChangeLogger';
import { DebugOverlay } from './components/shared/DebugOverlay';
import { EnvironmentBanner } from './components/shared/EnvironmentBanner';
import { DebugPanel } from './components/shared/DebugPanel';
import { ErrorBoundary } from './components/shared/ErrorBoundary';
import { useKonamiCode } from './hooks/useKonamiCode';
import { wrapQueryClientForLogging } from './lib/queryClientLogger';
import { logger } from './lib/logger';
import { useState, useEffect } from 'react';

if (import.meta.env.VITE_DEBUG_LOGGING === 'true') {
  logger.info('APP:INIT', 'App component loading with debug logging enabled');
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false,
    },
  },
});

// Wrap queryClient for logging if debug is enabled
wrapQueryClientForLogging(queryClient);

function App() {
  if (import.meta.env.VITE_DEBUG_LOGGING === 'true') {
    logger.debug('APP:RENDER', 'App component rendering...');
  }
  const konamiActivated = useKonamiCode();
  const [debugPanelOpen, setDebugPanelOpen] = useState(false);

  // Open debug panel when Konami code is activated
  useEffect(() => {
    if (konamiActivated) {
      setDebugPanelOpen(true);
    }
  }, [konamiActivated]);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <RouteChangeLogger />
          <ThemeProvider>
            <EnvironmentBanner />
            <ErrorBoundary>
              <Routes />
            </ErrorBoundary>
            <DebugOverlay />
            <DebugPanel open={debugPanelOpen} onOpenChange={setDebugPanelOpen} />
          </ThemeProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;

