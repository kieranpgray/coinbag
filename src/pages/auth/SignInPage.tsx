import { SignIn } from '@clerk/clerk-react';
import { Footer } from '@/components/layout/Footer';
import { useTheme } from '@/contexts/ThemeContext';
import { getClerkShellAppearance } from '@/lib/clerkAppearance';

export function SignInPage() {
  const { darkMode } = useTheme();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="page-title">
              Welcome to Supafolio
            </h1>
            <p className="page-subtitle">Sign in to manage your finances</p>
          </div>
          <SignIn
            path="/sign-in"
            routing="path"
            signUpUrl="/sign-up"
            redirectUrl="/app/dashboard"
            appearance={getClerkShellAppearance(darkMode, 'authCard')}
          />
        </div>
      </div>
      <Footer />
    </div>
  );
}
