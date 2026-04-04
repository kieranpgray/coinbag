import { Outlet } from 'react-router-dom';
import { SignedIn, SignedOut, RedirectToSignIn } from '@clerk/clerk-react';
import { logger } from '@/lib/logger';
import { WorkspaceProvider } from '@/contexts/WorkspaceContext';
import { CommandPaletteProvider, useCommandPaletteContext } from '@/contexts/CommandPaletteContext';
import { CommandPalette } from '@/components/command-palette/CommandPalette';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { Footer } from './Footer';

function AppShell() {
  const { open, setOpen } = useCommandPaletteContext();
  return (
    <div className="h-screen overflow-hidden flex">
      <a href="#main-content" className="skip-to-content">
        Skip to main content
      </a>
      {/* Fixed left sidebar - full viewport height */}
      <Sidebar />
      {/* Main container - header + scrollable content area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Fixed top header (mobile-only chrome on desktop) */}
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
      {/* Single global CommandPalette instance */}
      <CommandPalette open={open} onOpenChange={setOpen} />
    </div>
  );
}

export function Layout() {
  if (import.meta.env.VITE_DEBUG_LOGGING === 'true') {
    logger.debug('LAYOUT:RENDER', 'Layout component rendering...');
  }
  return (
    <>
      <SignedIn>
        <WorkspaceProvider>
          <CommandPaletteProvider>
            <AppShell />
          </CommandPaletteProvider>
        </WorkspaceProvider>
      </SignedIn>
      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>
    </>
  );
}
