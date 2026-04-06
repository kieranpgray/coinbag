import { UserProfile } from '@clerk/clerk-react';
import { useTheme } from '@/contexts/ThemeContext';
import { getClerkShellAppearance } from '@/lib/clerkAppearance';

/**
 * Account management page that renders Clerk's UserProfile component.
 * This provides users with a full account management interface including:
 * - Profile information
 * - Two-factor authentication setup
 * - Security settings
 * - Connected accounts
 */
export function AccountPage() {
  const { darkMode } = useTheme();

  return (
    <div className="min-h-screen flex items-center justify-center bg-background py-8 px-4">
      <div className="w-full max-w-4xl">
        <div className="mb-6">
          <h1 className="font-serif text-h1-sm sm:text-h1-md lg:text-h1-lg font-bold tracking-tight">
            Account Settings
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage your account, security, and authentication settings
          </p>
        </div>
        <UserProfile appearance={getClerkShellAppearance(darkMode, 'userProfile')} />
      </div>
    </div>
  );
}
