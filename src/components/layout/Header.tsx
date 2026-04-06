import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Menu } from 'lucide-react';
import { MobileNav } from './MobileNav';
import { ROUTES } from '@/lib/constants/routes';

export function Header() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <>
      {/* Mobile-only header bar — hidden on md+ (desktop uses sidebar for all controls) */}
      <header className="min-h-14 h-14 border-b border-[var(--paper-3)] bg-[var(--paper)] flex items-center px-4 gap-3 md:hidden">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setMobileNavOpen(true)}
          aria-label="Open navigation menu"
          className="min-h-11 min-w-11 shrink-0"
        >
          <Menu className="h-5 w-5 text-[color:var(--ink-3)]" />
        </Button>
        <Link
          to={ROUTES.app.dashboard}
          className="font-serif text-h1-sm sm:text-h1-md lg:text-h1-lg text-foreground tracking-tight"
        >
          Supafolio
        </Link>
      </header>
      <MobileNav open={mobileNavOpen} onOpenChange={setMobileNavOpen} />
    </>
  );
}

