import { Outlet } from 'react-router-dom';
import { SignedIn, SignedOut, RedirectToSignIn } from '@clerk/clerk-react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { Footer } from './Footer';

export function Layout() {
  console.log('🔍 DEBUG: Layout component rendering...');
  return (
    <>
      <SignedIn>
        <div className="min-h-screen flex flex-col">
          <a href="#main-content" className="skip-to-content">
            Skip to main content
          </a>
          <Header />
          <div className="flex flex-1 flex-col md:flex-row">
            {/* Persistent sidebar with theme-aware background and border for visual separation */}
            <Sidebar />
            {/* Main content area with neutral background hosting page-level containers */}
            <main id="main-content" className="flex-1 bg-background focus:outline-none" tabIndex={-1}>
              {/* Global container wrapper for all pages - provides centered, padded, max-width layout */}
              <div className="container pt-8">
                <Outlet />
              </div>
            </main>
          </div>
          <Footer />
        </div>
      </SignedIn>
      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>
    </>
  );
}

