import React from 'react';
import ReactDOM from 'react-dom/client';
import { ClerkProvider } from '@clerk/clerk-react';
import App from './App.tsx';
import './index.css';
import { validateEnvironment } from './lib/env';

if (import.meta.env.VITE_DEBUG_LOGGING === 'true') {
  console.log('🔍 DEBUG: Starting app initialization...');
}

// Validate environment configuration early
const envValidation = validateEnvironment();
if (envValidation.shouldBlockStartup) {
  // Error screen is already shown by env.ts, but we also throw to prevent React from mounting
  throw new Error('Application blocked: Critical configuration errors. See console and page for details.');
}

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
if (import.meta.env.VITE_DEBUG_LOGGING === 'true') {
  console.log('🔍 DEBUG: Clerk key loaded:', PUBLISHABLE_KEY ? 'YES' : 'NO');
}

if (!PUBLISHABLE_KEY) {
  // Only log error in production if debug logging is enabled
  if (import.meta.env.VITE_DEBUG_LOGGING === 'true' || import.meta.env.MODE !== 'production') {
    console.error('❌ ERROR: Missing Publishable Key');
  }
  throw new Error("Missing Publishable Key");
}

if (import.meta.env.VITE_DEBUG_LOGGING === 'true') {
  console.log('🔍 DEBUG: Creating React root...');
}
const rootElement = document.getElementById('root');
if (import.meta.env.VITE_DEBUG_LOGGING === 'true') {
  console.log('🔍 DEBUG: Root element found:', rootElement ? 'YES' : 'NO');
}

if (!rootElement) {
  if (import.meta.env.VITE_DEBUG_LOGGING === 'true' || import.meta.env.MODE !== 'production') {
    console.error('❌ ERROR: Root element not found');
  }
  throw new Error('Root element not found');
}

// Ensure your index.html contains a <div id="root"></div> element for React to mount the app.

if (import.meta.env.VITE_DEBUG_LOGGING === 'true') {
  console.log('🔍 DEBUG: Rendering React app...');
}
ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <ClerkProvider publishableKey={PUBLISHABLE_KEY} afterSignOutUrl="/">
      <App />
    </ClerkProvider>
  </React.StrictMode>
);

if (import.meta.env.VITE_DEBUG_LOGGING === 'true') {
  console.log('🔍 DEBUG: App render initiated');
}

