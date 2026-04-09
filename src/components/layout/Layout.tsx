import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { SignedIn, SignedOut, RedirectToSignIn } from '@clerk/clerk-react';
import { logger } from '@/lib/logger';
import { WorkspaceProvider } from '@/contexts/WorkspaceContext';
import { CommandPaletteProvider, useCommandPaletteContext } from '@/contexts/CommandPaletteContext';
import { CommandPalette } from '@/components/command-palette/CommandPalette';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { Footer } from './Footer';
import { MobileTabBar } from './MobileTabBar';
import { MobileNav } from './MobileNav';

function AppShell() {
  const { open, setOpen } = useCommandPaletteContext();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="h-screen overflow-hidden flex">
      <a href="#main-content" className="skip-to-content">
        Skip to main content
      </a>
      {/* Fixed left sidebar - full viewport height */}
      <Sidebar />
      {/* Main container - header + scrollable content area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Fixed top header (mobile-only chrome) */}
        <Header />
        {/* Scrollable content area */}
        <div className="flex-1 overflow-y-auto flex flex-col">
          {/* Main content area */}
          <main
            id="main-content"
            className="bg-background focus:outline-none flex-1 pb-[calc(3.5rem+env(safe-area-inset-bottom))] md:pb-0"
            tabIndex={-1}
          >
            {/* Global container wrapper for all pages */}
            <div className="container pt-8">
              <Outlet />
            </div>
          </main>
          <Footer />
        </div>
      </div>
      {/* Mobile bottom tab bar */}
      <MobileTabBar
        className="md:hidden"
        onMorePress={() => setMobileNavOpen(true)}
      />
      {/* Mobile nav dialog (triggered by MobileTabBar "More") */}
      <MobileNav open={mobileNavOpen} onOpenChange={setMobileNavOpen} />
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
