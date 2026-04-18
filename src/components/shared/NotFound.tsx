import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
      <h1 className="text-display tracking-tight">404</h1>
      <p className="text-body text-muted-foreground">
        Page not found. The page you're looking for doesn't exist.
      </p>
      <Button asChild>
        <Link to="/app/dashboard">Return Home</Link>
      </Button>
    </div>
  );
}

