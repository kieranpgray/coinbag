import { Link } from 'react-router-dom';

export function TermsPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="text-3xl font-semibold tracking-tight">Terms</h1>
        <p className="mt-6 text-muted-foreground">
          By using Supafolio, you agree to our terms of service, acceptable use policies, and legal requirements for account
          usage and data handling.
        </p>
        <p className="mt-4 text-muted-foreground">
          This is a temporary route to support landing-page navigation and will be replaced by a complete terms document.
        </p>
        <Link to="/" className="mt-8 inline-block text-sm font-medium text-primary hover:underline">
          Back to landing page
        </Link>
      </div>
    </main>
  );
}
