import { Link } from 'react-router-dom';

export function PrivacyPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="text-3xl font-semibold tracking-tight">Privacy Policy</h1>
        <p className="mt-6 text-muted-foreground">
          We collect only the information needed to provide Supafolio services and improve product reliability. Sensitive
          financial information is handled under strict access controls and encryption standards.
        </p>
        <p className="mt-4 text-muted-foreground">
          This is a temporary route used to complete landing-page legal navigation and will be replaced by the full policy.
        </p>
        <Link to="/" className="mt-8 inline-block text-sm font-medium text-primary hover:underline">
          Back to landing page
        </Link>
      </div>
    </main>
  );
}
