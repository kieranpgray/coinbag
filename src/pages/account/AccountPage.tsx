import { UserProfile } from '@clerk/clerk-react';

/**
 * Account management page that renders Clerk's UserProfile component.
 * This provides users with a full account management interface including:
 * - Profile information
 * - Two-factor authentication setup
 * - Security settings
 * - Connected accounts
 */
export function AccountPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background py-8">
      <div className="w-full max-w-4xl">
        <div className="mb-6">
          <h1 className="text-h1-sm sm:text-h1-md lg:text-h1-lg font-bold">Account Settings</h1>
          <p className="text-muted-foreground mt-2">
            Manage your account, security, and authentication settings
          </p>
        </div>
        <UserProfile
          appearance={{
            baseTheme: undefined,
            variables: {
              colorPrimary: 'hsl(var(--primary))',
              colorBackground: 'hsl(var(--background))',
              colorInputBackground: 'hsl(var(--background))',
              colorInputText: 'hsl(var(--foreground))',
              colorText: 'hsl(var(--foreground))',
              borderRadius: '0.375rem',
            },
            elements: {
              card: 'shadow-lg border',
              headerTitle: 'hidden',
              headerSubtitle: 'hidden',
              formButtonPrimary: 'bg-primary hover:bg-primary/90 text-primary-foreground',
              formFieldLabel: 'text-sm font-medium text-foreground',
              formFieldInput: 'border-input bg-background',
              footerActionLink: 'text-primary hover:text-primary/90',
            },
          }}
        />
      </div>
    </div>
  );
}

