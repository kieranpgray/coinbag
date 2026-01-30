import { Outlet } from 'react-router-dom';
import { SignedIn, SignedOut, RedirectToSignIn } from '@clerk/clerk-react';
import { logger } from '@/lib/logger';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { Footer } from './Footer';

export function Layout() {
  if (import.meta.env.VITE_DEBUG_LOGGING === 'true') {
    logger.debug('LAYOUT:RENDER', 'Layout component rendering...');
  }
  return (
    <>
      <SignedIn>
        <div className="h-screen overflow-hidden flex">
          <a href="#main-content" className="skip-to-content">
            Skip to main content
          </a>
          {/* Fixed left sidebar - full viewport height */}
          <Sidebar />
          {/* Main container - header + scrollable content area */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* Fixed top header */}
            <Header />
            {/* Scrollable content area */}
            <div className="flex-1 overflow-y-auto flex flex-col">
              {/* Main content area with neutral background hosting page-level containers */}
              <main id="main-content" className="bg-background focus:outline-none flex-1" tabIndex={-1}>
                {/* Global container wrapper for all pages - provides centered, padded, max-width layout */}
                <div className="container pt-8">
                  <Outlet />
                </div>
              </main>
              <Footer />
            </div>
          </div>
        </div>
      </SignedIn>
      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>
    </>
  );
}
