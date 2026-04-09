import { Link } from 'react-router-dom';
import { ROUTES } from '@/lib/constants/routes';

export function Header() {
  return (
    <header className="min-h-14 h-14 border-b border-[var(--paper-3)] bg-[var(--paper)] flex items-center px-4 gap-3 md:hidden">
      <Link
        to={ROUTES.app.dashboard}
        className="font-serif text-h1-sm sm:text-h1-md lg:text-h1-lg text-foreground tracking-tight"
      >
        Supafolio
      </Link>
    </header>
  );
}
