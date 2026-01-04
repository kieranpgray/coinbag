import { useState } from 'react';
import { Link } from 'react-router-dom';
import { UserButton } from '@clerk/clerk-react';
import { useTheme } from '@/contexts/ThemeContext';
import { CommandPalette } from '@/components/command-palette/CommandPalette';
import { useCommandPalette } from '@/hooks/useCommandPalette';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff, Moon, Sun, Settings, Menu } from 'lucide-react';
import { MobileNav } from './MobileNav';

export function Header() {
  const { darkMode, toggleDarkMode, privacyMode, togglePrivacyMode } = useTheme();
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useCommandPalette(() => setCommandPaletteOpen(true));

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-border bg-card backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileNavOpen(true)}
              aria-label="Open navigation menu"
              className="md:hidden"
            >
              <Menu className="h-5 w-5" />
            </Button>
            <Link to="/app/dashboard" className="text-xl font-bold hover:opacity-80">
              Coinbag
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={togglePrivacyMode}
              aria-label={privacyMode ? 'Disable privacy mode' : 'Enable privacy mode'}
              title={privacyMode ? 'Disable privacy mode' : 'Enable privacy mode'}
            >
              {privacyMode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleDarkMode}
              aria-label={darkMode ? 'Disable dark mode' : 'Enable dark mode'}
              title={darkMode ? 'Disable dark mode' : 'Enable dark mode'}
            >
              {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCommandPaletteOpen(true)}
              aria-label="Open command palette"
              title="Open command palette (⌘K)"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M18 3a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3 3 3 0 0 0 3-3 3 3 0 0 0-3-3H6a3 3 0 0 0-3 3 3 3 0 0 0 3 3 3 3 0 0 0 3-3V6a3 3 0 0 0-3-3 3 3 0 0 0-3 3 3 3 0 0 0 3 3h12a3 3 0 0 0 3-3 3 3 0 0 0-3-3z" />
              </svg>
            </Button>
            <Link to="/app/settings">
              <Button variant="ghost" size="icon" aria-label="Settings">
                <Settings className="h-4 w-4" />
              </Button>
            </Link>
            <UserButton
              afterSignOutUrl="/sign-in"
              appearance={{
                baseTheme: undefined,
                variables: {
                  colorPrimary: 'hsl(var(--primary))',
                  borderRadius: '0.375rem',
                },
                elements: {
                  avatarBox: 'h-8 w-8',
                  userButtonPopoverCard: 'shadow-lg border',
                  userButtonPopoverActionButton: 'hover:bg-accent',
                  userButtonPopoverActionButtonText: 'text-sm',
                },
              }}
            />
          </div>
        </div>
      </header>
      <MobileNav open={mobileNavOpen} onOpenChange={setMobileNavOpen} />
      <CommandPalette open={commandPaletteOpen} onOpenChange={setCommandPaletteOpen} />
    </>
  );
}

