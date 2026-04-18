import { SignUp } from '@clerk/clerk-react';
import { Footer } from '@/components/layout/Footer';
import { useTheme } from '@/contexts/ThemeContext';
import { getClerkShellAppearance } from '@/lib/clerkAppearance';

export function SignUpPage() {
  const { darkMode } = useTheme();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="page-title">
              Join Supafolio
            </h1>
            <p className="page-subtitle">Create your account to get started</p>
          </div>
          <SignUp
            path="/sign-up"
            routing="path"
            signInUrl="/sign-in"
            redirectUrl="/app/dashboard"
            appearance={getClerkShellAppearance(darkMode, 'authCard')}
          />
        </div>
      </div>
      <Footer />
    </div>
  );
}
