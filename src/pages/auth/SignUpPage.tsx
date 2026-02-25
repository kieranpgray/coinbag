import { SignUp } from '@clerk/clerk-react';
import { Footer } from '@/components/layout/Footer';

export function SignUpPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex-1 flex items-center justify-center">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-h1-sm sm:text-h1-md lg:text-h1-lg font-bold">Join Supafolio</h1>
            <p className="text-muted-foreground mt-2">Create your account to get started</p>
          </div>
          <SignUp
            path="/sign-up"
            routing="path"
            signInUrl="/sign-in"
            redirectUrl="/app/dashboard"
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
                formButtonPrimary: 'bg-primary hover:bg-primary/90 text-primary-foreground',
                card: 'shadow-lg border',
                headerTitle: 'hidden',
                headerSubtitle: 'hidden',
                socialButtonsBlockButton: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
                dividerLine: 'bg-border',
                dividerText: 'text-muted-foreground',
                formFieldLabel: 'text-body font-medium text-foreground',
                formFieldInput: 'border-input bg-background',
                footerActionLink: 'text-primary hover:text-primary/90',
              },
            }}
          />
        </div>
      </div>
      <Footer />
    </div>
  );
}
