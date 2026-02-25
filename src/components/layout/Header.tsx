import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '@/contexts/ThemeContext';
import { CommandPalette } from '@/components/command-palette/CommandPalette';
import { useCommandPalette } from '@/hooks/useCommandPalette';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff, Moon, Sun, Grid3x3, Settings, Menu } from 'lucide-react';
import { MobileNav } from './MobileNav';
import { ROUTES } from '@/lib/constants/routes';

export function Header() {
  const { darkMode, toggleDarkMode, privacyMode, togglePrivacyMode } = useTheme();
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useCommandPalette(() => setCommandPaletteOpen(true));

  return (
    <>
      <header className="h-14 border-b border-border bg-card flex items-center justify-between md:justify-end px-6 gap-3">
        {/* Mobile Menu & Logo */}
        <div className="flex items-center gap-4 md:hidden">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileNavOpen(true)}
            aria-label="Open navigation menu"
            className="p-2 rounded-lg hover:bg-accent"
          >
            <Menu className="h-5 w-5 text-muted-foreground" />
          </Button>
          <Link to={ROUTES.app.dashboard} className="text-h1-sm sm:text-h1-md lg:text-h1-lg text-foreground">
            Supafolio
          </Link>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={togglePrivacyMode}
            className="p-2 rounded-lg hover:bg-accent"
            aria-label={privacyMode ? 'Disable privacy mode' : 'Enable privacy mode'}
            title={privacyMode ? 'Disable privacy mode' : 'Enable privacy mode'}
          >
            {privacyMode ? (
              <EyeOff className="h-5 w-5 text-muted-foreground" />
            ) : (
              <Eye className="h-5 w-5 text-muted-foreground" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleDarkMode}
            className="p-2 rounded-lg hover:bg-accent"
            aria-label={darkMode ? 'Disable dark mode' : 'Enable dark mode'}
            title={darkMode ? 'Disable dark mode' : 'Enable dark mode'}
          >
            {darkMode ? (
              <Sun className="h-5 w-5 text-muted-foreground" />
            ) : (
              <Moon className="h-5 w-5 text-muted-foreground" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCommandPaletteOpen(true)}
            className="p-2 rounded-lg hover:bg-accent"
            aria-label="Open command palette"
            title="Open command palette (⌘K)"
          >
            <Grid3x3 className="h-5 w-5 text-muted-foreground" />
          </Button>
          <Link to={ROUTES.app.settings}>
            <Button
              variant="ghost"
              size="icon"
              className="p-2 rounded-lg hover:bg-accent"
              aria-label="Settings"
            >
              <Settings className="h-5 w-5 text-muted-foreground" />
            </Button>
          </Link>
          {/* Profile Avatar */}
          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center ml-1">
            <span className="text-body text-muted-foreground font-medium">P</span>
          </div>
        </div>
      </header>
      <MobileNav open={mobileNavOpen} onOpenChange={setMobileNavOpen} />
      <CommandPalette open={commandPaletteOpen} onOpenChange={setCommandPaletteOpen} />
    </>
  );
}

